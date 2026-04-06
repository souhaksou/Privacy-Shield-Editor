/** OCR 文字框（以原圖像素座標為基準）。 */
export interface OcrBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** OCR 單字資料（文字、信心分數、定位框）。 */
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: OcrBBox;
}

/** OCR 標準結果（全文 + 字詞清單）。 */
export interface OcrResult {
  text: string;
  words: OcrWord[];
  language?: string;
}

/** OCR 原始座標框（對應 Tesseract 輸出 x0/y0/x1/y1）。 */
export interface OcrRawBBox {
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

/** OCR 原始單字資料（尚未 normalize）。 */
export interface OcrRawWord {
  text?: string;
  confidence?: number;
  bbox?: OcrRawBBox;
}

/** OCR 原始結果（由 worker success 事件回傳）。 */
export interface OcrRawResult {
  text?: string;
  words?: OcrRawWord[];
  language?: string;
}

/**
 * 主執行緒送給 OCR Worker 的請求。
 *
 * @property type 命令名稱，Phase 1 固定為 recognize
 * @property payload.image 要辨識的影像資料（Blob）
 * @property payload.lang 可選語言碼（例如 eng）
 */
export type OcrWorkerRequest = { type: "recognize"; payload: { image: Blob; lang?: string } };

/**
 * OCR Worker 回傳給主執行緒的事件。
 *
 * @property type progress | success | error
 * @property payload progress: 進度資料；success: OCR 結果；error: 錯誤訊息
 */
export type OcrWorkerResponse =
  | { type: "progress"; payload: { progress: number; status?: string } }
  | { type: "success"; payload: OcrRawResult }
  | { type: "error"; payload: { message: string } };
