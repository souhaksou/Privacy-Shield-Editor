/** 軸對齊矩形；座標空間與呼叫處一致（原圖像素）。 */
export interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 正在拖曳的矩形角（羅盤方位），用於縮放時選擇對角錨點。 */
export type ResizeCorner = "nw" | "ne" | "se" | "sw";

/**
 * uiCanvas hit-test 結果；同一遮罩先判四角再判本體，避免把手區被誤判成平移。
 */
export type HitResult =
  | { kind: "none" }
  | { kind: "corner"; id: string; corner: ResizeCorner }
  | { kind: "body"; id: string };

/** 遮罩最小寬高（原圖像素），與新建框「過小不寫入」門檻對齊。 */
export const MIN_MASK_PX = 2;

/**
 * 角點命中半徑的 CSS 像素基準；會再換算成 image 空間，以兼顧縮放顯示與觸控。
 */
export const HANDLE_SLOP_DISPLAY = 8;

/**
 * 將任意拖曳方向正規化為「左上角 + 寬高」矩形。
 */
export function normalizeDragRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): DragRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const right = Math.max(startX, endX);
  const bottom = Math.max(startY, endY);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * 兩點距離平方；hit-test 與半徑比較時避免開根號。
 *
 * @returns 歐氏距離的平方 `(ax-bx)² + (ay-by)²`
 */
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * 將矩形限制在畫布範圍內，並保證寬高不小於 `MIN_MASK_PX`。
 * 多次 min/max 是為了在「先放大再平移」等組合下仍收斂到合法解。
 *
 * @param r 原圖像素矩形
 * @param cw 畫布寬（與原圖寬一致）
 * @param ch 畫布高（與原圖高一致）
 */
export function clampRectToCanvas(r: DragRect, cw: number, ch: number): DragRect {
  let x = r.x;
  let y = r.y;
  let w = r.width;
  let h = r.height;

  if (w < MIN_MASK_PX) w = MIN_MASK_PX;
  if (h < MIN_MASK_PX) h = MIN_MASK_PX;

  x = Math.min(Math.max(x, 0), cw - w);
  y = Math.min(Math.max(y, 0), ch - h);

  w = Math.min(w, cw - x);
  h = Math.min(h, ch - y);

  w = Math.max(w, MIN_MASK_PX);
  h = Math.max(h, MIN_MASK_PX);
  x = Math.min(Math.max(x, 0), cw - w);
  y = Math.min(Math.max(y, 0), ch - h);

  return { x, y, width: w, height: h };
}

/**
 * 依固定對角錨點 `(ax,ay)` 與目前指標 `(px,py)` 產生軸對齊外接矩形（原圖像素）。
 *
 * @param corner 正在拖曳的角
 * @param ax 錨點 X（對角固定點）
 * @param ay 錨點 Y
 * @param px 指標 X
 * @param py 指標 Y
 */
export function rectFromCornerDrag(
  corner: ResizeCorner,
  ax: number,
  ay: number,
  px: number,
  py: number,
): DragRect {
  switch (corner) {
    case "nw":
      return normalizeDragRect(px, py, ax, ay);
    case "ne":
    case "se":
      return normalizeDragRect(ax, ay, px, py);
    case "sw":
      return normalizeDragRect(px, py, ax, ay);
    default:
      return normalizeDragRect(px, py, ax, ay);
  }
}

/**
 * 拖曳 `corner` 時應保持固定的對角頂點（原圖像素），供縮放幾何錨定。
 *
 * @param r 按下指標當下的矩形快照（通常為 `initialMaskRect`）
 * @param corner 正在拖曳的角
 */
export function anchorForCornerRect(
  r: DragRect,
  corner: ResizeCorner,
): { x: number; y: number } {
  const { x, y, width: w, height: h } = r;
  switch (corner) {
    case "nw":
      return { x: x + w, y: y + h };
    case "ne":
      return { x, y: y + h };
    case "se":
      return { x, y };
    case "sw":
      return { x: x + w, y };
    default:
      return { x, y };
  }
}

