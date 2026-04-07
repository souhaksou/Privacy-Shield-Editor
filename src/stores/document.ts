import { ref, computed } from "vue";
import { defineStore } from "pinia";
import type { OcrResult } from "@/types/ocr";

/**
 * 文件核心資料 store：上傳圖、OCR 標準化結果、使用者手動修正後的全文。
 *
 * 與 `editor` store 分離，避免載入中／進度等 UI 狀態混入文件本體。
 */
export const useDocumentStore = defineStore("document", () => {
  /** 目前選取的圖檔；清除或換檔時為 null。 */
  const imageFile = ref<File | null>(null);

  /** 供 `<img :src>` 等預覽用的 blob URL；換檔或清除時須配合 revoke，避免記憶體洩漏。 */
  const imageObjectUrl = ref<string | null>(null);

  /** 經 `normalizeOcrResult` 後的 OCR 結構（全文 + 字詞框）；尚未辨識或已清除時為 null。 */
  const ocrResult = ref<OcrResult | null>(null);

  /** Phase 1 手動修正文字；OCR 成功後通常初始化為 `ocrResult.text`，之後與辨識原文可不同步。 */
  const correctedText = ref("");

  /** 是否已有可供預覽的圖片 URL。 */
  const hasImage = computed(() => imageObjectUrl.value !== null);

  /** 是否已有標準化後的 OCR 結果。 */
  const hasOcr = computed(() => ocrResult.value !== null);

  /**
   * 釋放目前持有的 `blob:` 預覽 URL，避免重複換檔仍佔用記憶體。
   */
  function revokePreviewUrl() {
    if (imageObjectUrl.value) {
      URL.revokeObjectURL(imageObjectUrl.value);
      imageObjectUrl.value = null;
    }
  }

  /**
   * 設定（或清除）目前文件圖片。
   *
   * 換檔時會撤銷舊預覽 URL，並清空 OCR 與修正文字，避免舊結果與新圖並存。
   *
   * @param file 新的圖檔；傳入 null 表示僅清除預覽與關聯狀態
   */
  function setImageFile(file: File | null) {
    revokePreviewUrl();
    imageFile.value = file;
    if (file) {
      imageObjectUrl.value = URL.createObjectURL(file);
    }
    ocrResult.value = null;
    correctedText.value = "";
  }

  /**
   * 寫入辨識完成後的標準化 OCR 結果。
   *
   * @param result `normalizeOcrResult` 產出之 `OcrResult`
   */
  function setOcrResult(result: OcrResult) {
    ocrResult.value = result;
  }

  /**
   * 更新使用者手動修正後的全文（例如 textarea 雙向綁定）。
   *
   * @param text 修正後字串
   */
  function setCorrectedText(text: string) {
    correctedText.value = text;
  }

  /**
   * 重設文件狀態：撤銷預覽 URL、清除圖檔與 OCR／修正文字。
   */
  function clearDocument() {
    revokePreviewUrl();
    imageFile.value = null;
    ocrResult.value = null;
    correctedText.value = "";
  }

  return {
    imageFile,
    imageObjectUrl,
    ocrResult,
    correctedText,
    hasImage,
    hasOcr,
    setImageFile,
    setOcrResult,
    setCorrectedText,
    clearDocument,
  };
});
