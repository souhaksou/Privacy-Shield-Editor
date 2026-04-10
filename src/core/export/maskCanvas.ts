import type { MaskRect } from "@/types/mask";

/** 建立遮罩圖層所需輸入。 */
export interface BuildMaskCanvasInput {
  width: number;
  height: number;
  masks: MaskRect[];
}

/**
 * 將遮罩矩形列表繪製為離屏 canvas（黑底遮罩），供匯出時與原圖合成。
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

  ctx.fillStyle = "#000000";
  for (const mask of masks) {
    if (mask.width <= 0 || mask.height <= 0) continue;
    // 將遮罩限制在畫布內，避免負座標或越界尺寸造成無效繪製。
    const x = Math.max(0, mask.x);
    const y = Math.max(0, mask.y);
    const right = Math.min(width, mask.x + mask.width);
    const bottom = Math.min(height, mask.y + mask.height);
    const w = right - x;
    const h = bottom - y;
    if (w <= 0 || h <= 0) continue;
    ctx.fillRect(x, y, w, h);
  }

  return canvas;
}
