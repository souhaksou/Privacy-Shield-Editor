import type { OcrBBox } from "@/types/ocr";
import type { PiiMatch } from "@/types/pii";

/** 遮罩來源。 */
/** "auto"：系統自動產生（如 PII 偵測遮罩），"manual"：用戶手動新增或編輯 */
export type MaskSource = "auto" | "manual";

/** 最終遮罩矩形（以原圖像素座標）。 */
export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
  source: MaskSource;
}

/** OCR 單字在全文中的索引範圍。 */
export interface WordRange {
  wordIndex: number;
  text: string;
  start: number;
  end: number;
  bbox: OcrBBox;
}

/** 單一 PII 命中對應到的 OCR 字詞群組。 */
export interface MappedPiiMatch {
  match: PiiMatch;
  words: WordRange[];
}
