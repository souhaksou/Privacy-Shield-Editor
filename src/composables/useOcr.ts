import { onUnmounted } from "vue";
import { normalizeOcrResult } from "@/core/ocr/normalize";
import { useDocumentStore } from "@/stores/document";
import { useEditorStore } from "@/stores/editor";
import type { OcrWorkerRequest, OcrWorkerResponse } from "@/types/ocr";

/** 全站共用的 OCR Worker；延遲建立，避免多開實例重複載入 Tesseract。 */
let worker: Worker | null = null;

/**
 * 目前有多少個呼叫端掛載了 `useOcr`。
 * 歸零時才 `terminate`，避免某個子元件先卸載就中斷其他元件仍在進行的辨識。
 */
let useOcrRefCount = 0;

/**
 * 必要時建立 Worker，並註冊常駐的 `onmessage` / `onerror` 處理器。
 *
 * 於回呼內再次呼叫 `useXxxStore()`，以取得 Pinia 單例，避免依賴註冊當下的閉包而拿到過期狀態。
 */
function attachWorkerIfNeeded() {
  if (worker) return;

  worker = new Worker(new URL("../workers/ocr.worker.ts", import.meta.url), { type: "module" });

  worker.onmessage = (event: MessageEvent<OcrWorkerResponse>) => {
    const editorStore = useEditorStore();
    const documentStore = useDocumentStore();
    const msg = event.data;

    if (msg.type === "progress") {
      editorStore.setOcrProgress(msg.payload.progress, msg.payload.status);
      return;
    }

    if (msg.type === "success") {
      const normalized = normalizeOcrResult(msg.payload);
      documentStore.setOcrResult({
        ...normalized,
        language: msg.payload.language,
      });
      documentStore.setCorrectedText(normalized.text);
      editorStore.finishOcr();
      return;
    }

    if (msg.type === "error") {
      editorStore.setOcrError(msg.payload.message);
      editorStore.finishOcr();
    }
  };

  worker.onerror = (event) => {
    const editorStore = useEditorStore();
    editorStore.setOcrError(event.message || "OCR worker failed.");
    editorStore.finishOcr();
  };
}

/**
 * 強制終止 Worker 並清空模組層引用。
 *
 * 一般由 `useOcr` 的引用計數在歸零時觸發；若需先手動釋放資源也可直接呼叫。
 */
export async function disposeOcrWorker(timeoutMs = 800): Promise<void> {
  if (!worker) return;

  const currentWorker = worker;

  const disposedAck = new Promise<void>((resolve) => {
    const onMessage = (event: MessageEvent<OcrWorkerResponse>) => {
      if (event.data?.type !== "disposed") return;
      currentWorker.removeEventListener("message", onMessage);
      resolve();
    };

    currentWorker.addEventListener("message", onMessage);
  });

  try {
    const request: OcrWorkerRequest = { type: "dispose" };
    currentWorker.postMessage(request);

    await Promise.race([
      disposedAck,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeoutMs);
      }),
    ]);
  } finally {
    currentWorker.terminate();
    if (worker === currentWorker) {
      worker = null;
    }
  }
}

/**
 * OCR 流程編排：共用 Web Worker、派送辨識、將結果經 normalize 寫入 document store，流程狀態寫入 editor store。
 *
 * 多個元件同時使用時透過引用計數管理生命週期，最後一個 `onUnmounted` 才終止 Worker。
 *
 * @returns `runOcr` 送出辨識請求；`disposeOcrWorker` 可顯式釋放 Worker（多數情境由引用計數處理即可）
 */
export function useOcr() {
  const editorStore = useEditorStore();

  useOcrRefCount += 1;
  onUnmounted(() => {
    useOcrRefCount -= 1;
    if (useOcrRefCount <= 0) {
      disposeOcrWorker();
    }
  });

  /**
   * 送出一輪 OCR。若 `editorStore.isOcrLoading` 已為 true 則直接返回，避免重入。
   *
   * @param image 要辨識的影像資料（例如 `File`／`Blob`）
   * @param lang 語言碼；省略時使用 editor store 的 `ocrLang`
   */
  function runOcr(image: Blob, lang?: string) {
    if (editorStore.isOcrLoading) return;

    attachWorkerIfNeeded();
    if (!worker) return;

    editorStore.startOcr();

    const request: OcrWorkerRequest = {
      type: "recognize",
      payload: {
        image,
        lang: lang ?? editorStore.ocrLang,
      },
    };

    worker.postMessage(request);
  }

  return { runOcr, disposeOcrWorker };
}
