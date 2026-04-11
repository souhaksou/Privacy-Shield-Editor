import type { MaskRect } from "@/types/mask";
import { DEFAULT_MASK_FILL_COLOR, DEFAULT_MASK_STROKE_COLOR } from "@/types/mask";

/** 與 `completeMaskRect` 一致：空白字串視為缺漏，改用預設色。 */
function resolveMaskFillStroke(mask: MaskRect): { fill: string; stroke: string } {
  const fill =
    mask.fillColor !== undefined && mask.fillColor.trim() !== ""
      ? mask.fillColor
      : DEFAULT_MASK_FILL_COLOR;
  const stroke =
    mask.strokeColor !== undefined && mask.strokeColor.trim() !== ""
      ? mask.strokeColor
      : DEFAULT_MASK_STROKE_COLOR;
  return { fill, stroke };
}

/**
 * 將遮罩列表繪入 2D context（原圖像素座標，與 bitmap 寬高一致）。
 * 預覽 `maskCanvas` 與匯出離屏遮罩層共用，確保填色／邊線與裁邊一致。
 */
export function paintMaskRectsOnBitmap(
  ctx: CanvasRenderingContext2D,
  bitmapWidth: number,
  bitmapHeight: number,
  masks: MaskRect[],
): void {
  for (const mask of masks) {
    if (mask.width <= 0 || mask.height <= 0) continue;
    const x = Math.max(0, mask.x);
    const y = Math.max(0, mask.y);
    const right = Math.min(bitmapWidth, mask.x + mask.width);
    const bottom = Math.min(bitmapHeight, mask.y + mask.height);
    const w = right - x;
    const h = bottom - y;
    if (w <= 0 || h <= 0) continue;
    const { fill, stroke } = resolveMaskFillStroke(mask);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
  }
}

/** 建立遮罩圖層所需輸入。 */
export interface BuildMaskCanvasInput {
  width: number;
  height: number;
  masks: MaskRect[];
}

/**
 * 將遮罩矩形列表繪製為離屏 canvas（每筆填色／邊線色），供匯出時與原圖合成。
 *
 * @param input 畫布尺寸與遮罩清單（皆以原圖像素座標）
 * @returns 已完成繪製的遮罩 canvas；可直接疊加到 export canvas
 */
export function buildMaskCanvas(input: BuildMaskCanvasInput): HTMLCanvasElement {
  const { width, height, masks } = input;
  if (width <= 0 || height <= 0) {
    throw new Error("Invalid mask canvas size.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D context for mask canvas.");
  }

  paintMaskRectsOnBitmap(ctx, width, height, masks);

  return canvas;
}
