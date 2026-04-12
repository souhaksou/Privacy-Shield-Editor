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

  /** 是否將英文 (eng) 納入 OCR 語言組合。 */
  const ocrIncludeEng = ref(true);

  /** 是否將繁體中文 (chi_tra) 納入 OCR 語言組合。 */
  const ocrIncludeChiTra = ref(false);

  /**
   * 送進 worker 的語言碼（固定順序：僅 eng、僅 chi_tra、或 eng+chi_tra）。
   * 未勾選任何語言時為空字串；呼叫端須禁止送出 OCR。
   */
  const ocrLang = computed(() => {
    const parts: string[] = [];
    if (ocrIncludeEng.value) parts.push("eng");
    if (ocrIncludeChiTra.value) parts.push("chi_tra");
    return parts.join("+");
  });

  /** 是否至少選了一種 OCR 語言（與 `ocrLang` 非空等價）。 */
  const hasOcrLangSelection = computed(
    () => ocrIncludeEng.value || ocrIncludeChiTra.value,
  );

  /** 是否正在匯出（與 OCR 互斥，避免並行競爭）。 */
  const isExporting = ref(false);

  /** 最後一次匯出錯誤；新一輪匯出開始時由 `startExport` 清空。 */
  const exportError = ref<string | null>(null);

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
   * 設定是否包含英文（可全不選；執行 OCR 前須另有 `hasOcrLangSelection` 檢查）。
   *
   * @param value 是否勾選 eng
   */
  function setOcrIncludeEng(value: boolean) {
    ocrIncludeEng.value = value;
  }

  /**
   * 設定是否包含繁體中文（可全不選；執行 OCR 前須另有 `hasOcrLangSelection` 檢查）。
   *
   * @param value 是否勾選 chi_tra
   */
  function setOcrIncludeChiTra(value: boolean) {
    ocrIncludeChiTra.value = value;
  }

  /**
   * 開始一輪匯出：標記進行中並清空前次匯出錯誤。
   */
  function startExport() {
    isExporting.value = true;
    exportError.value = null;
  }

  /**
   * 記錄匯出失敗訊息。
   *
   * @param message 錯誤說明
   */
  function setExportError(message: string) {
    exportError.value = message;
  }

  /**
   * 結束匯出進行狀態（成功或失敗後都應呼叫）。
   */
  function finishExport() {
    isExporting.value = false;
  }

  /**
   * 清除匯出錯誤與進行旗標（例如使用者清除文件時）。
   */
  function resetExportUiState() {
    exportError.value = null;
    isExporting.value = false;
  }

  return {
    isOcrLoading,
    ocrProgress,
    ocrStatus,
    ocrError,
    ocrIncludeEng,
    ocrIncludeChiTra,
    ocrLang,
    hasOcrLangSelection,
    isExporting,
    exportError,
    hasOcrError,
    startOcr,
    setOcrProgress,
    setOcrError,
    finishOcr,
    resetOcrUiState,
    setOcrIncludeEng,
    setOcrIncludeChiTra,
    startExport,
    setExportError,
    finishExport,
    resetExportUiState,
  };
});
