import type { MaskRect } from "@/types/mask";
import {
  HANDLE_SLOP_DISPLAY,
  dist2,
  type DragRect,
  type HitResult,
  type ResizeCorner,
} from "@/core/canvas/geometry";

/**
 * 將 display 座標矩形轉為原圖像素座標。
 *
 * `uiCanvas` 在畫面上可能因 CSS 縮放而與實際 canvas 寬高不同，
 * 因此需以 `getBoundingClientRect()` 與 canvas 實際像素尺寸計算比例。
 */
export function toImageRect(displayRect: DragRect, canvas: HTMLCanvasElement): DragRect {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return {
    x: displayRect.x * scaleX,
    y: displayRect.y * scaleY,
    width: displayRect.width * scaleX,
    height: displayRect.height * scaleY,
  };
}

/**
 * 將單點 display 座標轉為原圖像素座標（與 `toImageRect` 相同比例假設）。
 *
 * @param displayX 相對於 `getBoundingClientRect().left` 的 X
 * @param displayY 相對於 `getBoundingClientRect().top` 的 Y
 * @returns 原圖像素座標；layout 異常時為 `(0,0)`
 */
export function toImagePoint(
  displayX: number,
  displayY: number,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return { x: displayX * scaleX, y: displayY * scaleY };
}

/**
 * 將角點命中容差從「螢幕約略像素」換算為與 `MaskRect` 相同的 image 像素半徑。
 *
 * @returns 換算後半徑；layout 異常時回退 `HANDLE_SLOP_DISPLAY` 避免除零
 */
export function hitSlopImage(canvas: HTMLCanvasElement): number {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return HANDLE_SLOP_DISPLAY;
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return Math.max(HANDLE_SLOP_DISPLAY * scaleX, HANDLE_SLOP_DISPLAY * scaleY);
}

/**
 * 以原圖像素座標對既有遮罩做 hit-test；陣列末尾者優先（視覺上較上層）。
 *
 * @param pointerImageX 指標 X（原圖像素）
 * @param pointerImageY 指標 Y（原圖像素）
 * @param masks 目前遮罩清單
 * @param canvas 用於換算角點命中容差
 */
export function hitTestMasks(
  pointerImageX: number,
  pointerImageY: number,
  masks: MaskRect[],
  canvas: HTMLCanvasElement,
): HitResult {
  const slop2 = hitSlopImage(canvas) ** 2;
  for (let i = masks.length - 1; i >= 0; i--) {
    const m = masks[i];
    if (!m || m.width <= 0 || m.height <= 0) continue;
    const { x, y, width: w, height: h } = m;

    const corners: { corner: ResizeCorner; cx: number; cy: number }[] = [
      { corner: "nw", cx: x, cy: y },
      { corner: "ne", cx: x + w, cy: y },
      { corner: "se", cx: x + w, cy: y + h },
      { corner: "sw", cx: x, cy: y + h },
    ];
    for (const { corner, cx, cy } of corners) {
      if (dist2(pointerImageX, pointerImageY, cx, cy) <= slop2) {
        return { kind: "corner", id: m.id, corner };
      }
    }

    if (
      pointerImageX >= x &&
      pointerImageX <= x + w &&
      pointerImageY >= y &&
      pointerImageY <= y + h
    ) {
      return { kind: "body", id: m.id };
    }
  }
  return { kind: "none" };
}
