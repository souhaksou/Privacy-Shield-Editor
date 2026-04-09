import type { OcrBBox } from "@/types/ocr";
import type { MappedPiiMatch, MaskRect } from "@/types/mask";

/** 建立初始遮罩矩形時可調整的幾何參數。 */
interface BuildMaskRectsOptions {
  /** 遮罩最小寬度（像素），低於門檻將被過濾。 */
  minWidth?: number;
  /** 遮罩最小高度（像素），低於門檻將被過濾。 */
  minHeight?: number;
  /** 同列遮罩可接受的最大水平間距（像素）。 */
  mergeGapX?: number;
  /** 判斷同列時允許的 y 軸偏移（像素）。 */
  mergeRowDeltaY?: number;
  /** 兩遮罩最小垂直重疊比例，低於門檻則不合併。 */
  minVerticalOverlapRatio?: number;
}

const DEFAULT_OPTIONS: Required<BuildMaskRectsOptions> = {
  minWidth: 2,
  minHeight: 2,
  mergeGapX: 6,
  mergeRowDeltaY: 8,
  minVerticalOverlapRatio: 0.3,
};

/**
 * 計算多個 bbox 的外接矩形。
 *
 * @param bboxes 需要合併的定位框清單
 * @returns 外接矩形；若輸入為空則回傳 `null`
 */
function unionBboxes(bboxes: OcrBBox[]): OcrBBox | null {
  if (bboxes.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  for (const bbox of bboxes) {
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxRight = Math.max(maxRight, bbox.x + bbox.width);
    maxBottom = Math.max(maxBottom, bbox.y + bbox.height);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxRight - minX),
    height: Math.max(0, maxBottom - minY),
  };
}

/**
 * 計算兩個遮罩在垂直方向上的重疊比例。
 *
 * @param a 遮罩 A
 * @param b 遮罩 B
 * @returns 垂直重疊高度除以較小高度的比例
 */
function verticalOverlapRatio(a: MaskRect, b: MaskRect): number {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, bottom - top);
  const minH = Math.min(a.height, b.height);

  return minH > 0 ? overlap / minH : 0;
}

/**
 * 判斷兩個遮罩是否應視為同一列並進行合併。
 *
 * @param a 既有遮罩
 * @param b 新進遮罩
 * @param mergeGapX 允許的水平間距上限
 * @param mergeRowDeltaY 允許的列高偏移上限
 * @param minVerticalOverlapRatio 最小垂直重疊比例
 * @returns 符合合併條件時為 `true`
 */
function shouldMerge(
  a: MaskRect,
  b: MaskRect,
  mergeGapX: number,
  mergeRowDeltaY: number,
  minVerticalOverlapRatio: number,
): boolean {
  const sameRow = Math.abs(a.y - b.y) <= mergeRowDeltaY;
  if (!sameRow) return false;

  const aRight = a.x + a.width;
  const bRight = b.x + b.width;
  const gap = Math.max(0, Math.max(a.x, b.x) - Math.min(aRight, bRight));

  if (gap > mergeGapX) return false;

  return verticalOverlapRatio(a, b) >= minVerticalOverlapRatio;
}

/**
 * 將兩個遮罩矩形合併為單一外接矩形。
 *
 * @param a 遮罩 A
 * @param b 遮罩 B
 * @returns 合併後的新遮罩矩形
 */
function mergeTwoRects(a: MaskRect, b: MaskRect): MaskRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    source: "auto",
  };
}

/**
 * 依座標排序後，合併同列且相鄰的遮罩矩形。
 *
 * @param rects 原始遮罩清單
 * @param mergeGapX 允許的水平間距上限
 * @param mergeRowDeltaY 允許的列高偏移上限
 * @param minVerticalOverlapRatio 最小垂直重疊比例
 * @returns 合併後遮罩清單
 */
function mergeAdjacentRects(
  rects: MaskRect[],
  mergeGapX: number,
  mergeRowDeltaY: number,
  minVerticalOverlapRatio: number,
): MaskRect[] {
  if (rects.length <= 1) return rects;

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: MaskRect[] = [];

  for (const rect of sorted) {
    const prev = merged[merged.length - 1];

    if (prev && shouldMerge(prev, rect, mergeGapX, mergeRowDeltaY, minVerticalOverlapRatio)) {
      merged[merged.length - 1] = mergeTwoRects(prev, rect);
      continue;
    }

    merged.push(rect);
  }

  return merged;
}

/**
 * 將 mapped PII 命中轉為可直接繪製的初始 auto mask rectangles。
 *
 * @param mappedMatches 已完成文字索引對齊的 PII 命中清單
 * @param options 遮罩過濾與合併的可選參數
 * @returns 初始自動遮罩矩形清單
 */
export function buildMaskRects(
  mappedMatches: MappedPiiMatch[],
  options: BuildMaskRectsOptions = {},
): MaskRect[] {
  if (mappedMatches.length === 0) return [];

  const { minWidth, minHeight, mergeGapX, mergeRowDeltaY, minVerticalOverlapRatio } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const baseRects: MaskRect[] = [];

  for (const mapped of mappedMatches) {
    if (mapped.words.length === 0) continue;

    const union = unionBboxes(mapped.words.map((word) => word.bbox));
    if (!union) continue;
    if (union.width < minWidth || union.height < minHeight) continue;

    baseRects.push({
      x: union.x,
      y: union.y,
      width: union.width,
      height: union.height,
      source: "auto",
    });
  }

  return mergeAdjacentRects(baseRects, mergeGapX, mergeRowDeltaY, minVerticalOverlapRatio);
}
