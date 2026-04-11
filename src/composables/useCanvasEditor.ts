import { onBeforeUnmount, watch, type Ref } from "vue";
import type { MaskRect, MaskRectInput } from "@/types/mask";

/**
 * `useCanvasEditor` 所需依賴：
 * 三層 canvas ref、外部狀態（圖檔/遮罩/disabled）與新增遮罩回呼。
 */
interface UseCanvasEditorInput {
  baseCanvasRef: Ref<HTMLCanvasElement | null>;
  maskCanvasRef: Ref<HTMLCanvasElement | null>;
  uiCanvasRef: Ref<HTMLCanvasElement | null>;
  imageFileRef: Ref<File | null>;
  masksRef: Ref<MaskRect[]>;
  disabledRef: Ref<boolean>;
  onAddMask: (input: MaskRectInput) => void;
}

/** 拖曳框選的矩形幾何（目前以畫布座標表示）。 */
interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
 * 在 uiCanvas 繪製拖曳中的半透明預覽框。
 *
 * @param canvas uiCanvas
 * @param rect 目前拖曳矩形（display 座標）
 */
function drawSelection(canvas: HTMLCanvasElement, rect: DragRect) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (rect.width <= 0 || rect.height <= 0) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = 1;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(
    rect.x + 0.5,
    rect.y + 0.5,
    Math.max(0, rect.width - 1),
    Math.max(0, rect.height - 1),
  );
}

/**
 * 將遮罩矩形清單繪製到 maskCanvas（黑色矩形）。
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

  ctx.fillStyle = "#000000";
  for (const mask of masks) {
    if (mask.width <= 0 || mask.height <= 0) continue;
    // 將矩形限制在畫布內，避免越界資料造成無效繪製。
    const x = Math.max(0, mask.x);
    const y = Math.max(0, mask.y);
    const right = Math.min(canvas.width, mask.x + mask.width);
    const bottom = Math.min(canvas.height, mask.y + mask.height);
    const w = right - x;
    const h = bottom - y;
    if (w <= 0 || h <= 0) continue;
    ctx.fillRect(x, y, w, h);
  }
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
 * 三層 canvas 編輯器：
 * - baseCanvas：繪製原圖
 * - maskCanvas：繪製目前遮罩
 * - uiCanvas：處理拖曳框選互動
 *
 * @param input 來自元件層的 refs 與狀態回呼
 */
export function useCanvasEditor(input: UseCanvasEditorInput) {
  let dragStart: { x: number; y: number } | null = null;
  let isDragging = false;
  let unbindUiEvents: (() => void) | null = null;

  /** 清空 uiCanvas 的互動預覽內容。 */
  function clearUiPreview() {
    clearCanvas(input.uiCanvasRef.value);
  }

  /**
   * 同步三層 canvas 的實際像素尺寸。
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
   * 繪製 baseCanvas；無檔案時清空三層畫布。
   *
   * @param file 當前上傳圖片
   */
  async function renderBase(file: File | null) {
    if (!file) {
      clearCanvas(input.baseCanvasRef.value);
      clearCanvas(input.maskCanvasRef.value);
      clearCanvas(input.uiCanvasRef.value);
      return;
    }

    const base = input.baseCanvasRef.value;
    if (!base) return;
    const ctx = base.getContext("2d");
    if (!ctx) return;

    const img = await loadImage(file);
    syncAllCanvasSize(img.naturalWidth, img.naturalHeight);
    ctx.clearRect(0, 0, base.width, base.height);
    ctx.drawImage(img, 0, 0, base.width, base.height);
  }

  /**
   * 依目前遮罩資料重繪 maskCanvas。
   *
   * @param masks 遮罩清單
   */
  function renderMasks(masks: MaskRect[]) {
    drawMasks(input.maskCanvasRef.value, masks);
  }

  /**
   * 綁定 uiCanvas 指標事件，輸出手動遮罩矩形。
   *
   * 事件流程：
   * - pointerdown：記錄起點並開始拖曳
   * - pointermove：更新預覽框
   * - pointerup：轉為 image pixel 並呼叫 `onAddMask`
   * - pointerleave：中止拖曳並清除預覽
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

    /**
     * 指標按下（開始拖曳矩形選取遮罩）。
     *
     * @param evt PointerEvent 指標事件
     */
    const handlePointerDown = (evt: PointerEvent) => {
      if (input.disabledRef.value) return; // 編輯停用時直接略過
      dragStart = readOffset(evt); // 記錄起始座標
      isDragging = true;
      canvas.setPointerCapture(evt.pointerId); // 捕捉後續指標事件 (避免離開元素時丟失)
    };

    /**
     * 指標移動（過程中更新 UI 預覽選取方框）。
     *
     * @param evt PointerEvent 指標事件
     */
    const handlePointerMove = (evt: PointerEvent) => {
      if (!isDragging || !dragStart) return;
      const current = readOffset(evt); // 取得目前指標位置
      // 依起訖位置繪製即時選框
      drawSelection(canvas, normalizeDragRect(dragStart.x, dragStart.y, current.x, current.y));
    };

    /**
     * 指標放開（結束拖曳，若跨距足夠則新增遮罩方框）。
     *
     * @param evt PointerEvent 指標事件
     */
    const handlePointerUp = (evt: PointerEvent) => {
      if (!isDragging || !dragStart) return;
      const current = readOffset(evt);
      const displayRect = normalizeDragRect(dragStart.x, dragStart.y, current.x, current.y);
      const imageRect = toImageRect(displayRect, canvas);
      clearUiPreview();
      // 篩選極小區塊，避免點擊誤判為遮罩
      if (imageRect.width >= 2 && imageRect.height >= 2) {
        input.onAddMask({
          x: Math.round(imageRect.x),
          y: Math.round(imageRect.y),
          width: Math.round(imageRect.width),
          height: Math.round(imageRect.height),
          source: "manual",
        });
      }
      dragStart = null;
      isDragging = false;
      // 若有 capture，釋放指標控制
      if (canvas.hasPointerCapture(evt.pointerId)) {
        canvas.releasePointerCapture(evt.pointerId);
      }
    };

    const handlePointerLeave = () => {
      if (!isDragging) {
        clearUiPreview();
        return;
      }
      dragStart = null;
      isDragging = false;
      clearUiPreview();
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    unbindUiEvents = () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }

  /**
   * 圖片檔案變更時：
   * 1) 重繪 baseCanvas
   * 2) 套用目前遮罩重繪 maskCanvas
   * 失敗時清空三層，避免殘留上一張圖的內容。
   */
  watch(
    input.imageFileRef,
    (file) => {
      renderBase(file)
        .then(() => renderMasks(input.masksRef.value))
        .catch(() => {
          clearCanvas(input.baseCanvasRef.value);
          clearCanvas(input.maskCanvasRef.value);
          clearCanvas(input.uiCanvasRef.value);
        });
    },
    { immediate: true },
  );

  /** 遮罩清單變更時即時重繪 maskCanvas。 */
  watch(
    input.masksRef,
    (masks) => {
      renderMasks(masks);
    },
    { deep: true, immediate: true },
  );

  /** uiCanvas ref 可用時綁定事件（含元件首次掛載）。 */
  watch(
    input.uiCanvasRef,
    () => {
      setupUiInteraction();
    },
    { immediate: true },
  );

  /** 元件卸載時解除指標事件，避免記憶體與事件殘留。 */
  onBeforeUnmount(() => {
    unbindUiEvents?.();
  });
}
