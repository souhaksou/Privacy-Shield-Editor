import { onBeforeUnmount, watch, type Ref } from "vue";
import { paintMaskRectsOnBitmap } from "@/core/export/maskCanvas";
import type { MaskRect, MaskRectInput, MaskRectUpdate } from "@/types/mask";

/**
 * 呼叫 `useCanvasEditor` 時由元件傳入的依賴：三層 canvas ref、圖檔與遮罩來源、
 * 以及將幾何寫回資料層的回呼（對應子元件 emit）。
 */
interface UseCanvasEditorInput {
  baseCanvasRef: Ref<HTMLCanvasElement | null>;
  maskCanvasRef: Ref<HTMLCanvasElement | null>;
  uiCanvasRef: Ref<HTMLCanvasElement | null>;
  imageFileRef: Ref<File | null>;
  masksRef: Ref<MaskRect[]>;
  disabledRef: Ref<boolean>;
  onAddMask: (input: MaskRectInput) => void;
  onUpdateMask: (id: string, patch: MaskRectUpdate) => void;
}

/**
 * 軸對齊矩形；座標空間與呼叫處一致（原圖像素／canvas bitmap 寬高與原圖相同）。
 */
interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 正在拖曳的矩形角（羅盤方位），用於縮放時選擇對角錨點。 */
type ResizeCorner = "nw" | "ne" | "se" | "sw";

/**
 * uiCanvas 上的互動階段：未命中既有遮罩時進入 `create`，否則為 `move` 或 `resize`。
 */
type InteractionMode = "idle" | "create" | "move" | "resize";

/**
 * 單次 hit-test 結果；同一遮罩先判四角再判本體，避免把手區被誤判成平移。
 */
type HitResult =
  | { kind: "none" }
  | { kind: "corner"; id: string; corner: ResizeCorner }
  | { kind: "body"; id: string };

/** 遮罩最小寬高（原圖像素），與新建框「過小不寫入」門檻對齊。 */
const MIN_MASK_PX = 2;
/**
 * 角點命中半徑的 CSS 像素基準；會再換算成 image 空間，以兼顧縮放顯示與觸控。
 */
const HANDLE_SLOP_DISPLAY = 8;

/**
 * 清空指定 canvas 內容；若 canvas 或 2D context 不可用則略過。
 *
 * @param canvas 目標畫布
 */
function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 將任意拖曳方向正規化為「左上角 + 寬高」矩形。
 *
 * @param startX 拖曳起點 X
 * @param startY 拖曳起點 Y
 * @param endX 拖曳終點 X
 * @param endY 拖曳終點 Y
 * @returns 正規化後矩形
 */
function normalizeDragRect(startX: number, startY: number, endX: number, endY: number): DragRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const right = Math.max(startX, endX);
  const bottom = Math.max(startY, endY);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * 將 display 座標矩形轉為原圖像素座標。
 *
 * `uiCanvas` 在畫面上可能因 CSS 縮放而與實際 canvas 寬高不同，
 * 因此需以 `getBoundingClientRect()` 與 canvas 實際像素尺寸計算比例。
 *
 * @param displayRect 畫面座標矩形
 * @param canvas 互動圖層 canvas
 * @returns 轉換後的 image pixel 矩形
 */
function toImageRect(displayRect: DragRect, canvas: HTMLCanvasElement): DragRect {
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
 * @param canvas 互動圖層 canvas
 * @returns 原圖像素座標；layout 異常時為 `(0,0)`
 */
function toImagePoint(displayX: number, displayY: number, canvas: HTMLCanvasElement): { x: number; y: number } {
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
 * @param canvas 互動圖層，用於讀取 layout 與 bitmap 比例
 * @returns 換算後半徑；layout 異常時回退常數避免除零
 */
function hitSlopImage(canvas: HTMLCanvasElement): number {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return 8;
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return Math.max(HANDLE_SLOP_DISPLAY * scaleX, HANDLE_SLOP_DISPLAY * scaleY);
}

/**
 * 兩點距離平方；hit-test 與半徑比較時避免開根號。
 *
 * @returns 歐氏距離的平方 `(ax-bx)² + (ay-by)²`
 */
function dist2(ax: number, ay: number, bx: number, by: number): number {
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
 * @returns 裁切後矩形
 */
function clampRectToCanvas(r: DragRect, cw: number, ch: number): DragRect {
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
 * `ne`／`se` 共用同一正規化式，差異來自呼叫端傳入的錨點座標。
 *
 * @param corner 正在拖曳的角
 * @param ax 錨點 X（對角固定點）
 * @param ay 錨點 Y
 * @param px 指標 X
 * @param py 指標 Y
 * @returns 正規化後左上角＋寬高
 */
function rectFromCornerDrag(corner: ResizeCorner, ax: number, ay: number, px: number, py: number): DragRect {
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
 * @returns 對角錨點座標
 */
function anchorForCornerRect(r: DragRect, corner: ResizeCorner): { x: number; y: number } {
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

/**
 * 以原圖像素座標對既有遮罩做 hit-test；陣列末尾者優先（視覺上較上層）。
 *
 * @param ix 指標 X（原圖像素）
 * @param iy 指標 Y（原圖像素）
 * @param masks 目前遮罩清單
 * @param canvas 用於換算角點命中容差
 * @returns 命中角、命中本體或未命中
 */
function hitTestMasks(ix: number, iy: number, masks: MaskRect[], canvas: HTMLCanvasElement): HitResult {
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
      if (dist2(ix, iy, cx, cy) <= slop2) {
        return { kind: "corner", id: m.id, corner };
      }
    }

    if (ix >= x && ix <= x + w && iy >= y && iy <= y + h) {
      return { kind: "body", id: m.id };
    }
  }
  return { kind: "none" };
}

/**
 * 在 uiCanvas 繪製拖曳中的半透明預覽框（新建遮罩）。
 *
 * @param canvas uiCanvas
 * @param rect 目前拖曳矩形（相對於 `getBoundingClientRect()` 的顯示座標）
 */
function drawSelection(canvas: HTMLCanvasElement, rect: DragRect) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (rect.width <= 0 || rect.height <= 0) return;
  const bitmapRect = toImageRect(rect, canvas);
  if (bitmapRect.width <= 0 || bitmapRect.height <= 0) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = 1;
  ctx.fillRect(bitmapRect.x, bitmapRect.y, bitmapRect.width, bitmapRect.height);
  ctx.strokeRect(
    bitmapRect.x + 0.5,
    bitmapRect.y + 0.5,
    Math.max(0, bitmapRect.width - 1),
    Math.max(0, bitmapRect.height - 1),
  );
}

/** 角點方塊把手半邊長（bitmap 像素）。 */
const HANDLE_HALF = 4;

/**
 * 繪製選中遮罩的邊框與四角實心方塊（已處於 bitmap／原圖像素座標）。
 *
 * @param ctx uiCanvas 2D context
 * @param r 裁切後或預覽中的矩形
 */
function drawMaskHandles(ctx: CanvasRenderingContext2D, r: DragRect) {
  ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.width - 1), Math.max(0, r.height - 1));

  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
  ctx.fillStyle = "#ffffff";
  for (const c of corners) {
    ctx.fillRect(c.x - HANDLE_HALF, c.y - HANDLE_HALF, HANDLE_HALF * 2, HANDLE_HALF * 2);
    ctx.strokeRect(c.x - HANDLE_HALF + 0.5, c.y - HANDLE_HALF + 0.5, HANDLE_HALF * 2 - 1, HANDLE_HALF * 2 - 1);
  }
}

/**
 * 清空 uiCanvas 後只畫選取外框與把手（不疊加新建框的半透明填色）。
 *
 * @param canvas uiCanvas
 * @param rect 原圖像素矩形，與 `canvas` 的 width／height 座標系一致
 */
function paintSelectedMaskOverlay(canvas: HTMLCanvasElement, rect: DragRect) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (rect.width <= 0 || rect.height <= 0) return;
  drawMaskHandles(ctx, rect);
}

/**
 * 將遮罩矩形清單繪製到 maskCanvas（每筆填色／邊線與匯出 `buildMaskCanvas` 一致）。
 *
 * @param canvas maskCanvas
 * @param masks 遮罩資料（原圖像素座標）
 */
function drawMasks(canvas: HTMLCanvasElement | null, masks: MaskRect[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!masks.length) return;
  paintMaskRectsOnBitmap(ctx, canvas.width, canvas.height, masks);
}

/**
 * 將上傳檔案解碼為可繪製的 `HTMLImageElement`。
 *
 * @param file 使用者上傳圖片
 * @returns 已完成載入的圖片元素
 */
async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for canvas preview."));
    };
    img.src = url;
  });
}

/**
 * 三層 canvas 預覽編輯：底圖、遮罩層、互動層。
 *
 * - `baseCanvas`：原圖
 * - `maskCanvas`：依 store 遮罩重繪（填色／邊線與匯出遮罩層同一套繪製邏輯）
 * - `uiCanvas`：新建框選、既有遮罩 hit-test、平移與四角縮放；幾何一律換算為原圖像素並裁邊
 *
 * 互動狀態以模組內變數保存（非 `ref`），避免 pointer 高頻事件不必要觸發 Vue 相依更新。
 *
 * @param input 元件傳入之 refs、`masksRef` 與 `onAddMask`／`onUpdateMask`
 */
export function useCanvasEditor(input: UseCanvasEditorInput) {
  let interactionMode: InteractionMode = "idle";
  let selectedId: string | null = null;
  let dragStartDisplay: { x: number; y: number } | null = null;
  /** `move` 時記錄指標起點，與目前 image 座標相減得位移增量。 */
  let dragStartImage: { x: number; y: number } | null = null;
  /**
   * `pointerdown` 當下的矩形快照；縮放錨點只由此推算，不依賴拖曳中途 store 是否已更新。
   */
  let initialMaskRect: DragRect | null = null;
  let resizeCorner: ResizeCorner | null = null;
  /** 本次 `move`／`resize` 所編輯的 `MaskRect.id`。 */
  let editMaskId: string | null = null;
  let isPointerDown = false;
  let unbindUiEvents: (() => void) | null = null;
  let renderSeq = 0;

  /** 清除 uiCanvas 筆觸（含新建預覽與選取疊繪）。 */
  function clearUiPreview() {
    clearCanvas(input.uiCanvasRef.value);
  }

  /**
   * 在非「新建拖曳」階段重畫選取外框；無選取或遮罩已刪則清空 ui 層。
   */
  function refreshUiOverlay() {
    const canvas = input.uiCanvasRef.value;
    if (!canvas || interactionMode === "create") return;
    if (!selectedId) {
      clearUiPreview();
      return;
    }
    const m = input.masksRef.value.find((r) => r.id === selectedId);
    if (!m || m.width <= 0 || m.height <= 0) {
      selectedId = null;
      clearUiPreview();
      return;
    }
    const clamped = clampRectToCanvas(
      { x: m.x, y: m.y, width: m.width, height: m.height },
      canvas.width,
      canvas.height,
    );
    paintSelectedMaskOverlay(canvas, clamped);
  }

  /**
   * 將三層 canvas 的 `width`／`height` 設為原圖像素尺寸，與座標轉換假設一致。
   *
   * @param width 原圖寬
   * @param height 原圖高
   */
  function syncAllCanvasSize(width: number, height: number) {
    for (const canvas of [
      input.baseCanvasRef.value,
      input.maskCanvasRef.value,
      input.uiCanvasRef.value,
    ]) {
      if (!canvas) continue;
      canvas.width = width;
      canvas.height = height;
    }
  }

  /**
   * 繪製底圖並同步畫布像素尺寸；換圖時清空選取與互動狀態。
   * `seq` 用於丟棄過期的非同步載入結果，避免快速換檔時舊圖覆蓋新圖。
   *
   * @param file 目前圖檔；`null` 時清空三層
   * @param seq 呼叫當下的 `renderSeq` 快照
   */
  async function renderBase(file: File | null, seq: number) {
    if (!file) {
      clearCanvas(input.baseCanvasRef.value);
      clearCanvas(input.maskCanvasRef.value);
      clearCanvas(input.uiCanvasRef.value);
      selectedId = null;
      interactionMode = "idle";
      return;
    }

    const base = input.baseCanvasRef.value;
    if (!base) return;
    const ctx = base.getContext("2d");
    if (!ctx) return;

    const img = await loadImage(file);
    if (seq !== renderSeq) return;
    syncAllCanvasSize(img.naturalWidth, img.naturalHeight);
    ctx.clearRect(0, 0, base.width, base.height);
    ctx.drawImage(img, 0, 0, base.width, base.height);
  }

  /**
   * 依 store 遮罩重繪 mask 層（與 ui 選取無關）。
   *
   * @param masks 目前遮罩清單
   */
  function renderMasks(masks: MaskRect[]) {
    drawMasks(input.maskCanvasRef.value, masks);
  }

  /**
   * 結束一輪 pointer 操作：重設內部狀態並視情況釋放 `setPointerCapture`。
   *
   * @param canvas uiCanvas
   * @param pointerId 與 capture 綁定的 pointer id
   */
  function resetInteractionAfterCapture(canvas: HTMLCanvasElement, pointerId: number) {
    interactionMode = "idle";
    dragStartDisplay = null;
    dragStartImage = null;
    initialMaskRect = null;
    resizeCorner = null;
    editMaskId = null;
    isPointerDown = false;
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  /**
   * 綁定 uiCanvas 的 pointer 事件；每次 ref 就緒或重建時先解除舊監聽，避免重複註冊。
   * 命中既有遮罩時進入移動／縮放，否則進入新建矩形流程；`pointerup` 再呼叫 `onAddMask`／`onUpdateMask`。
   */
  function setupUiInteraction() {
    unbindUiEvents?.();
    const canvas = input.uiCanvasRef.value;
    if (!canvas) return;

    const readOffset = (evt: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - bounds.left,
        y: evt.clientY - bounds.top,
      };
    };

    const handlePointerDown = (evt: PointerEvent) => {
      if (input.disabledRef.value) return;
      if (evt.button !== 0) return;

      const off = readOffset(evt);
      const imagePt = toImagePoint(off.x, off.y, canvas);
      const hit = hitTestMasks(imagePt.x, imagePt.y, input.masksRef.value, canvas);

      if (hit.kind === "corner") {
        const m = input.masksRef.value.find((r) => r.id === hit.id);
        if (!m) return;
        selectedId = hit.id;
        editMaskId = hit.id;
        resizeCorner = hit.corner;
        initialMaskRect = { x: m.x, y: m.y, width: m.width, height: m.height };
        dragStartImage = { x: imagePt.x, y: imagePt.y };
        interactionMode = "resize";
        isPointerDown = true;
        canvas.setPointerCapture(evt.pointerId);
        paintSelectedMaskOverlay(
          canvas,
          clampRectToCanvas(initialMaskRect, canvas.width, canvas.height),
        );
        return;
      }

      if (hit.kind === "body") {
        const m = input.masksRef.value.find((r) => r.id === hit.id);
        if (!m) return;
        selectedId = hit.id;
        editMaskId = hit.id;
        initialMaskRect = { x: m.x, y: m.y, width: m.width, height: m.height };
        dragStartImage = { x: imagePt.x, y: imagePt.y };
        interactionMode = "move";
        isPointerDown = true;
        canvas.setPointerCapture(evt.pointerId);
        paintSelectedMaskOverlay(
          canvas,
          clampRectToCanvas(initialMaskRect, canvas.width, canvas.height),
        );
        return;
      }

      selectedId = null;
      clearUiPreview();
      interactionMode = "create";
      dragStartDisplay = off;
      isPointerDown = true;
      canvas.setPointerCapture(evt.pointerId);
    };

    const handlePointerMove = (evt: PointerEvent) => {
      if (!isPointerDown) return;

      if (interactionMode === "create" && dragStartDisplay) {
        const current = readOffset(evt);
        drawSelection(canvas, normalizeDragRect(dragStartDisplay.x, dragStartDisplay.y, current.x, current.y));
        return;
      }

      if (interactionMode === "move" && initialMaskRect && dragStartImage) {
        const off = readOffset(evt);
        const current = toImagePoint(off.x, off.y, canvas);
        const dx = current.x - dragStartImage.x;
        const dy = current.y - dragStartImage.y;
        const next = clampRectToCanvas(
          {
            x: initialMaskRect.x + dx,
            y: initialMaskRect.y + dy,
            width: initialMaskRect.width,
            height: initialMaskRect.height,
          },
          canvas.width,
          canvas.height,
        );
        paintSelectedMaskOverlay(canvas, next);
        return;
      }

      if (interactionMode === "resize" && initialMaskRect && resizeCorner && editMaskId) {
        const anchor = anchorForCornerRect(initialMaskRect, resizeCorner);
        const current = toImagePoint(readOffset(evt).x, readOffset(evt).y, canvas);
        const raw = rectFromCornerDrag(resizeCorner, anchor.x, anchor.y, current.x, current.y);
        const next = clampRectToCanvas(raw, canvas.width, canvas.height);
        paintSelectedMaskOverlay(canvas, next);
      }
    };

    const handlePointerUp = (evt: PointerEvent) => {
      if (!isPointerDown) return;

      if (interactionMode === "create" && dragStartDisplay) {
        const current = readOffset(evt);
        const displayRect = normalizeDragRect(dragStartDisplay.x, dragStartDisplay.y, current.x, current.y);
        const imageRect = toImageRect(displayRect, canvas);
        clearUiPreview();
        if (imageRect.width >= MIN_MASK_PX && imageRect.height >= MIN_MASK_PX) {
          const clamped = clampRectToCanvas(imageRect, canvas.width, canvas.height);
          input.onAddMask({
            x: Math.round(clamped.x),
            y: Math.round(clamped.y),
            width: Math.round(clamped.width),
            height: Math.round(clamped.height),
            source: "manual",
          });
        }
        resetInteractionAfterCapture(canvas, evt.pointerId);
        refreshUiOverlay();
        return;
      }

      if (interactionMode === "move" && initialMaskRect && dragStartImage && editMaskId) {
        const current = toImagePoint(readOffset(evt).x, readOffset(evt).y, canvas);
        const dx = current.x - dragStartImage.x;
        const dy = current.y - dragStartImage.y;
        const next = clampRectToCanvas(
          {
            x: initialMaskRect.x + dx,
            y: initialMaskRect.y + dy,
            width: initialMaskRect.width,
            height: initialMaskRect.height,
          },
          canvas.width,
          canvas.height,
        );
        const moved = Math.round(dx) !== 0 || Math.round(dy) !== 0;
        if (moved) {
          input.onUpdateMask(editMaskId, {
            x: Math.round(next.x),
            y: Math.round(next.y),
            width: Math.round(next.width),
            height: Math.round(next.height),
          });
        }
        resetInteractionAfterCapture(canvas, evt.pointerId);
        refreshUiOverlay();
        return;
      }

      if (interactionMode === "resize" && initialMaskRect && editMaskId && resizeCorner) {
        const anchor = anchorForCornerRect(initialMaskRect, resizeCorner);
        const current = toImagePoint(readOffset(evt).x, readOffset(evt).y, canvas);
        const raw = rectFromCornerDrag(resizeCorner, anchor.x, anchor.y, current.x, current.y);
        const next = clampRectToCanvas(raw, canvas.width, canvas.height);
        const changed =
          Math.round(next.x) !== Math.round(initialMaskRect.x) ||
          Math.round(next.y) !== Math.round(initialMaskRect.y) ||
          Math.round(next.width) !== Math.round(initialMaskRect.width) ||
          Math.round(next.height) !== Math.round(initialMaskRect.height);
        if (changed) {
          input.onUpdateMask(editMaskId, {
            x: Math.round(next.x),
            y: Math.round(next.y),
            width: Math.round(next.width),
            height: Math.round(next.height),
          });
        }
        resetInteractionAfterCapture(canvas, evt.pointerId);
        refreshUiOverlay();
        return;
      }

      resetInteractionAfterCapture(canvas, evt.pointerId);
      refreshUiOverlay();
    };

    const handlePointerLeave = (evt: PointerEvent) => {
      if (!isPointerDown) {
        refreshUiOverlay();
        return;
      }
      // `setPointerCapture` 期間多數環境不會對捕獲元素再派送 `pointerleave`，拖曳完成仍以 `pointerup` 為主。
      // 此分支與 `pointercancel` 同級還原，作未捕獲或實作差異下的防呆；捕獲被系統收回時主要由 `lostpointercapture` 處理。
      handlePointerCancel(evt);
    };

    const handlePointerCancel = (evt: PointerEvent) => {
      if (!isPointerDown) {
        clearUiPreview();
        refreshUiOverlay();
        return;
      }
      const pid = evt.pointerId;
      clearUiPreview();
      resetInteractionAfterCapture(canvas, pid);
      refreshUiOverlay();
    };

    /**
     * `lostpointercapture`：捕獲被結束且非 `pointerup` 正常完成時的可靠出口（例如觸控手勢、切換視窗）。
     * 與 `pointerleave` 不同，後者在 capture 活躍期間通常不會對捕獲目標觸發。
     */
    const handleLostCapture = () => {
      clearUiPreview();
      interactionMode = "idle";
      dragStartDisplay = null;
      dragStartImage = null;
      initialMaskRect = null;
      resizeCorner = null;
      editMaskId = null;
      isPointerDown = false;
      refreshUiOverlay();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("lostpointercapture", handleLostCapture);
    unbindUiEvents = () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("lostpointercapture", handleLostCapture);
    };
  }

  /**
   * 圖檔變更：非同步載入底圖、重畫 mask，並刷新選取外框；錯誤時清空三層與互動狀態。
   * `flush: 'post'` 確保 `v-if` 切換後 canvas 已掛載再讀 ref。
   */
  watch(
    input.imageFileRef,
    async (file) => {
      const seq = ++renderSeq;
      try {
        await renderBase(file, seq);
        if (seq !== renderSeq) return;
        renderMasks(input.masksRef.value);
        refreshUiOverlay();
      } catch {
        if (seq !== renderSeq) return;
        clearCanvas(input.baseCanvasRef.value);
        clearCanvas(input.maskCanvasRef.value);
        clearCanvas(input.uiCanvasRef.value);
        selectedId = null;
        interactionMode = "idle";
      }
    },
    { immediate: true, flush: "post" },
  );

  /**
   * 遮罩清單變更：重繪 mask 層；若選中 id 已不存在則清除選取，再重畫 ui 疊加。
   */
  watch(
    input.masksRef,
    (masks) => {
      renderMasks(masks);
      if (selectedId && !masks.some((r) => r.id === selectedId)) {
        selectedId = null;
      }
      refreshUiOverlay();
    },
    { deep: true, immediate: true },
  );

  /** uiCanvas ref 可用時綁定 pointer（含首次掛載與 DOM 替換）。 */
  watch(
    input.uiCanvasRef,
    () => {
      setupUiInteraction();
    },
    { immediate: true },
  );

  /**
   * 與父層禁用同步：禁止新互動並清空暫存與選取，避免 OCR／匯出進行中仍改動遮罩。
   */
  watch(input.disabledRef, (disabled) => {
    if (disabled) {
      selectedId = null;
      interactionMode = "idle";
      isPointerDown = false;
      dragStartDisplay = null;
      dragStartImage = null;
      initialMaskRect = null;
      resizeCorner = null;
      editMaskId = null;
      clearUiPreview();
    } else {
      refreshUiOverlay();
    }
  });

  /** 元件卸載時解除 uiCanvas 監聽，避免重複掛載或 HMR 時重複綁定。 */
  onBeforeUnmount(() => {
    unbindUiEvents?.();
  });
}
