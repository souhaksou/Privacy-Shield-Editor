import { createWorker } from "tesseract.js";
import type { OcrWorkerRequest, OcrWorkerResponse } from "@/types/ocr";

/**
 * OCR worker（Phase 1 最小實作）
 * - 接收 recognize 請求
 * - dispose 時先釋放 OCR 引擎，再回傳 disposed 並關閉 worker
 * - 回傳 progress / success / error / disposed
 * - success payload 回傳 raw OCR 資料（由 normalize 模組統一轉換）
 */

// ============================================================
// SECTION 1) Local Types (worker 內部使用的最小資料形狀)
// ============================================================

/** Tesseract 單字最小結構（只保留本檔需要欄位）。 */
interface TesseractWordLike {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Tesseract 頁面最小結構（透過 blocks -> paragraphs -> lines -> words 取字詞）。 */
interface TesseractPageLike {
  text: string;
  blocks: Array<{
    paragraphs: Array<{
      lines: Array<{
        words: TesseractWordLike[];
      }>;
    }>;
  }> | null;
}

// ============================================================
// SECTION 2) Module State (可重用的 worker 實例與語言狀態)
// ============================================================

let ocrEngine: Awaited<ReturnType<typeof createWorker>> | null = null;
let activeLang: string | null = null;

// ============================================================
// SECTION 3) Pure Helpers (純資料轉換，不觸發副作用)
// ============================================================

/**
 * 將 Tesseract Page 結構中的所有字詞攤平成單一陣列。
 *
 * @param page Tesseract 原始頁面資料（blocks 可能為 null）
 * @returns 依文件順序攤平後的字詞清單
 */
function extractWordsFromPage(page: TesseractPageLike): TesseractWordLike[] {
  if (!page.blocks) return [];

  return page.blocks.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
  );
}

// ============================================================
// SECTION 4) Engine Lifecycle (建立/重用/釋放 OCR 引擎)
// ============================================================

/**
 * 取得可重用的 OCR worker 實例。
 *
 * @param lang OCR 語言碼（例如 eng）
 * @returns 可執行 recognize 的 Tesseract worker
 */
async function getOrCreateEngine(lang: string) {
  // 首次建立，或語言切換時重建
  if (!ocrEngine || activeLang !== lang) {
    if (ocrEngine) {
      await ocrEngine.terminate();
    }

    ocrEngine = await createWorker(lang, 1, {
      logger: (m) => {
        // m.progress 約 0~1，轉成 0~100 較易顯示
        const progress = Math.round((m.progress ?? 0) * 100);
        const message: OcrWorkerResponse = {
          type: "progress",
          payload: {
            progress,
            status: m.status,
          },
        };
        self.postMessage(message);
      },
    });

    activeLang = lang;
  }

  return ocrEngine;
}

/**
 * 釋放目前 OCR 引擎，通常在 worker 關閉前呼叫。
 */
async function releaseEngine(): Promise<void> {
  if (!ocrEngine) return;

  await ocrEngine.terminate();
  ocrEngine = null;
  activeLang = null;
}

// ============================================================
// SECTION 5) Message Handlers (worker <-> 主執行緒通訊)
// ============================================================

type RecognizeRequest = Extract<OcrWorkerRequest, { type: "recognize" }>;

/**
 * 處理單次 OCR recognize 請求。
 *
 * @param request 主執行緒送入的 recognize 請求資料
 */
async function handleRecognize(request: RecognizeRequest): Promise<void> {
  try {
    const lang = request.payload.lang ?? "eng";
    const image = request.payload.image;

    const engine = await getOrCreateEngine(lang);
    const result = await engine.recognize(image, {}, { blocks: true });
    const sourceWords = extractWordsFromPage(result.data);

    const successMessage: OcrWorkerResponse = {
      type: "success",
      payload: {
        text: result.data.text,
        words: sourceWords,
        language: lang,
      },
    };

    self.postMessage(successMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed with unknown error.";

    const errorMessage: OcrWorkerResponse = {
      type: "error",
      payload: { message },
    };
    self.postMessage(errorMessage);
  }
}

/**
 * 接收主執行緒訊息，並分派到對應處理流程。
 *
 * @param event 主執行緒送入的 OCR worker 訊息事件
 */
self.onmessage = async (event: MessageEvent<OcrWorkerRequest>) => {
  const request = event.data;

  if (!request) return;

  if (request.type === "dispose") {
    try {
      await releaseEngine();
    } finally {
      const message: OcrWorkerResponse = { type: "disposed", payload: {} };
      self.postMessage(message);
      self.close();
    }
    return;
  }

  if (request.type !== "recognize") {
    const message: OcrWorkerResponse = {
      type: "error",
      payload: { message: "Unsupported worker request type." },
    };
    self.postMessage(message);
    return;
  }

  await handleRecognize(request);
};
