import { ref, computed } from "vue";
import { defineStore } from "pinia";

/**
 * 編輯器／流程 UI 狀態 store：OCR 進行中、進度、錯誤、語言等。
 *
 * 與 `document` store 分離，避免載入狀態與文件資料綁死在同一個模組。
 */
export const useEditorStore = defineStore("editor", () => {
  /** 是否正在執行 OCR（控制按鈕 disabled、避免重入）。 */
  const isOcrLoading = ref(false);

  /** Tesseract 進度 0–100（由 worker logger 轉換而來）。 */
  const ocrProgress = ref(0);

  /** Tesseract logger 的 status 字串，可選；供除錯或次要顯示。 */
  const ocrStatus = ref<string | undefined>(undefined);

  /** 最後一次 OCR 錯誤訊息；新跑一次開始時會清空。 */
  const ocrError = ref<string | null>(null);

  /** 送進 worker 的語言碼（例如 eng）；UI 可綁定或覆寫。 */
  const ocrLang = ref("eng");

  /** 是否有可顯示的錯誤（簡化 template 條件）。 */
  const hasOcrError = computed(() => ocrError.value !== null);

  /**
   * 開始一輪 OCR：標記載入中、清錯誤、進度歸零。
   */
  function startOcr() {
    isOcrLoading.value = true;
    ocrError.value = null;
    ocrProgress.value = 0;
    ocrStatus.value = undefined;
  }

  /**
   * 更新 OCR 進度（通常來自 worker 的 progress 訊息）。
   *
   * @param progress 0–100
   * @param status 可選的 Tesseract status
   */
  function setOcrProgress(progress: number, status?: string) {
    ocrProgress.value = progress;
    ocrStatus.value = status;
  }

  /**
   * 記錄 OCR 失敗訊息（worker error 或 worker onerror）。
   *
   * @param message 錯誤說明
   */
  function setOcrError(message: string) {
    ocrError.value = message;
  }

  /**
   * 結束載入狀態（成功或失敗後都應呼叫）。
   */
  function finishOcr() {
    isOcrLoading.value = false;
  }

  /**
   * 清除進度／狀態／錯誤（不動載入旗標；適合「換頁或重設面板」時用）。
   */
  function resetOcrUiState() {
    ocrProgress.value = 0;
    ocrStatus.value = undefined;
    ocrError.value = null;
  }

  /**
   * 設定預設 OCR 語言。
   *
   * @param lang 語言碼，例如 eng
   */
  function setOcrLang(lang: string) {
    ocrLang.value = lang;
  }

  return {
    isOcrLoading,
    ocrProgress,
    ocrStatus,
    ocrError,
    ocrLang,
    hasOcrError,
    startOcr,
    setOcrProgress,
    setOcrError,
    finishOcr,
    resetOcrUiState,
    setOcrLang,
  };
});
