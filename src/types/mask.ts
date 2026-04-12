import type { OcrBBox } from "@/types/ocr";
import type { PiiMatch } from "@/types/pii";

/** 遮罩來源。 */
/** "auto"：系統自動產生（如 PII 偵測遮罩），"manual"：用戶手動新增或編輯 */
export type MaskSource = "auto" | "manual";

/** 新建遮罩未指定填色時的預設（與 store／匯出 fallback 一致）。 */
export const DEFAULT_MASK_FILL_COLOR = "#000000";

/** 新建遮罩未指定邊線色時的預設。 */
export const DEFAULT_MASK_STROKE_COLOR = "#333333";

/** 最終遮罩矩形（以原圖像素座標）。 */
export interface MaskRect {
  /** 前端產生的穩定識別（例如 `uuid` v4）；列表 key、刪改時對齊用。 */
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: MaskSource;
  /** 遮罩填色（CSS 色字串，如 `#rrggbb` 或 `rgba(...)`）。 */
  fillColor: string;
  /** 遮罩邊線色。 */
  strokeColor: string;
}

/** 寫入 store 前可省略 `id` 與顏色，由 `addMaskRect`／`completeMaskRect` 補齊。 */
export type MaskRectInput = Omit<MaskRect, "id" | "fillColor" | "strokeColor"> & {
  id?: string;
  fillColor?: string;
  strokeColor?: string;
};

/** 依 `id` 更新單筆遮罩時可傳入的欄位（不可改 `id`）。 */
export type MaskRectUpdate = Partial<Omit<MaskRect, "id">>;

/**
 * 顏色欄位解析：空白或未定義時回退預設色，避免多處各自處理 fallback 規則。
 *
 * @param fillColor 填色字串（可 undefined 或空白）
 * @param strokeColor 邊線色字串（可 undefined 或空白）
 */
export function resolveMaskColors(
  fillColor: string | undefined,
  strokeColor: string | undefined,
): { fill: string; stroke: string } {
  return {
    fill:
      fillColor !== undefined && fillColor.trim() !== ""
        ? fillColor
        : DEFAULT_MASK_FILL_COLOR,
    stroke:
      strokeColor !== undefined && strokeColor.trim() !== ""
        ? strokeColor
        : DEFAULT_MASK_STROKE_COLOR,
  };
}

/**
 * 將輸入補齊為完整 `MaskRect`（缺漏或僅空白字串的顏色改用預設值）。
 *
 * @param input 已含穩定 `id` 的遮罩資料
 */
export function completeMaskRect(input: MaskRectInput & { id: string }): MaskRect {
  const { fill, stroke } = resolveMaskColors(input.fillColor, input.strokeColor);

  return {
    id: input.id,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    source: input.source,
    fillColor: fill,
    strokeColor: stroke,
  };
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
