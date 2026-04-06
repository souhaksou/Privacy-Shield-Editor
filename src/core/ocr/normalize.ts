import type { OcrRawResult, OcrWord, OcrResult } from "@/types/ocr";

/**
 * 將 Tesseract 原始結果轉成專案標準 `OcrResult`。
 *
 * @param raw Tesseract 原始資料（允許缺欄位，函式內會做防呆）
 * @returns 可直接寫入 store / UI 的標準化 OCR 結果
 */
export function normalizeOcrResult(raw: OcrRawResult): OcrResult {
  const words: OcrWord[] = (raw.words ?? [])
    .map((w) => {
      const text = (w.text ?? "").trim();
      const x0 = w.bbox?.x0 ?? 0;
      const y0 = w.bbox?.y0 ?? 0;
      const x1 = w.bbox?.x1 ?? x0;
      const y1 = w.bbox?.y1 ?? y0;

      return {
        text,
        // confidence 無效時回落到 0，避免 NaN 進入狀態層。
        confidence: Number.isFinite(w.confidence) ? (w.confidence as number) : 0,
        bbox: {
          x: x0,
          y: y0,
          // 將 x0/x1, y0/y1 轉為 width/height，並保證非負值。
          width: Math.max(0, x1 - x0),
          height: Math.max(0, y1 - y0),
        },
      };
    })
    // 去除空字詞，避免 UI 出現無意義節點。
    .filter((w) => w.text.length > 0);

  return {
    // 全文同步 trim，讓顯示與初始可編輯內容一致。
    text: (raw.text ?? "").trim(),
    words,
  };
}
