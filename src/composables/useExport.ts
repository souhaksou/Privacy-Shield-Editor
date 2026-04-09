import { composeExportCanvas, exportCanvasToPngBlob } from "@/core/export/imageExport";
import { buildImagePdf } from "@/core/export/pdfExport";
import { useDocumentStore } from "@/stores/document";
import { useEditorStore } from "@/stores/editor";

/**
 * 由完整檔名取得主檔名（移除最後一個副檔名），供下載檔名沿用原名。
 *
 * @param name 原始檔名（可含副檔名）
 * @returns 不含副檔名的主檔名；若無有效副檔名則回傳原字串
 */
function baseNameFromFileName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

/**
 * 以暫時 `blob:` URL 觸發瀏覽器下載，並立即釋放 URL。
 *
 * @param blob 要下載的內容
 * @param filename 下載檔名（含副檔名）
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 將 `File` 解碼為可繪製的 `HTMLImageElement`（供 `composeExportCanvas` 使用）。
 * 載入完成或失敗後都會 revoke 暫存 URL，避免洩漏。
 *
 * @param file 使用者上傳的圖檔
 * @returns 解碼完成、可讀取 natural 尺寸的圖片元素
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("無法載入圖片以供匯出。"));
    };
    img.src = url;
  });
}

/**
 * 從圖檔走與 UI 一致的合成管線，產出 PNG `Blob` 與像素級寬高（PDF 頁面需與此對齊）。
 *
 * @param file 目前文件的圖檔
 * @returns PNG 二進位與圖片寬高（像素）
 */
async function composePngBlobFromFile(file: File): Promise<{ pngBlob: Blob; width: number; height: number }> {
  const img = await loadImageFromFile(file);
  const canvas = composeExportCanvas({ base: img });
  const pngBlob = await exportCanvasToPngBlob(canvas);
  return { pngBlob, width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * 匯出流程編排：呼叫 core 合成圖片／PDF bytes、觸發下載；loading 與錯誤寫入 editor store。
 *
 * @returns `exportImage` 下載 PNG；`exportPdf` 下載單頁 image-based PDF；guard 不成立時兩者皆直接返回且不更動狀態
 */
export function useExport() {
  const documentStore = useDocumentStore();
  const editorStore = useEditorStore();

  /**
   * 是否允許開始匯出：須已有圖、且 OCR／匯出未進行中（與流程頁互斥規則一致）。
   */
  function canStartExport(): boolean {
    return (
      documentStore.hasImage &&
      documentStore.imageFile !== null &&
      !editorStore.isOcrLoading &&
      !editorStore.isExporting
    );
  }

  /**
   * 將目前 store 中的圖檔匯出為 PNG 並觸發下載。
   *
   * @returns `canStartExport()` 為 false 時立即結束（`undefined`）；否則在觸發下載後解析為 `void`。錯誤不往外拋，改寫入 `exportError`。
   */
  async function exportImage() {
    if (!canStartExport()) return;
    const file = documentStore.imageFile!;

    editorStore.startExport();
    try {
      const { pngBlob } = await composePngBlobFromFile(file);
      const outName = `${baseNameFromFileName(file.name)}.png`;
      downloadBlob(pngBlob, outName);
    } catch (e) {
      editorStore.setExportError(e instanceof Error ? e.message : "匯出圖片失敗。");
    } finally {
      editorStore.finishExport();
    }
  }

  /**
   * 將目前圖檔以 PNG 管線輸出後嵌入單頁 PDF，並觸發下載（與 PNG 同一合成來源，避免兩條路徑不一致）。
   *
   * @returns `canStartExport()` 為 false 時立即結束（`undefined`）；否則在觸發下載後解析為 `void`。錯誤不往外拋，改寫入 `exportError`。
   */
  async function exportPdf() {
    if (!canStartExport()) return;
    const file = documentStore.imageFile!;

    editorStore.startExport();
    try {
      const { pngBlob, width, height } = await composePngBlobFromFile(file);
      const buf = await pngBlob.arrayBuffer();
      const imageBytes = new Uint8Array(buf);
      const pdfBytes = await buildImagePdf({ imageBytes, width, height, format: "png" });
      // pdf-lib 回傳的 Uint8Array 與 Blob 建構式預期的 BlobPart 在嚴格型別下不完全相容，複製為新 Uint8Array 以通過檢查且不影響內容。
      const pdfBlob = new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
      const outName = `${baseNameFromFileName(file.name)}.pdf`;
      downloadBlob(pdfBlob, outName);
    } catch (e) {
      editorStore.setExportError(e instanceof Error ? e.message : "匯出 PDF 失敗。");
    } finally {
      editorStore.finishExport();
    }
  }

  return { exportImage, exportPdf };
}
