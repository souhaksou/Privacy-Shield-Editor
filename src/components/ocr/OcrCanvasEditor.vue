<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useCanvasEditor } from "@/composables/useCanvasEditor";
import type { MaskRect, MaskRectInput, MaskRectUpdate } from "@/types/mask";

const props = defineProps<{
  imageFile: File | null;
  masks: MaskRect[];
  disabled: boolean;
  selectedMaskId: string | null;
}>();

const emit = defineEmits<{
  (e: "add-mask", rect: MaskRectInput): void;
  (e: "update-mask", id: string, patch: MaskRectUpdate): void;
  (e: "select-mask", id: string | null): void;
}>();

const baseCanvasRef = useTemplateRef<HTMLCanvasElement>("baseCanvas");
const maskCanvasRef = useTemplateRef<HTMLCanvasElement>("maskCanvas");
const uiCanvasRef = useTemplateRef<HTMLCanvasElement>("uiCanvas");

useCanvasEditor({
  baseCanvasRef,
  maskCanvasRef,
  uiCanvasRef,
  imageFileRef: computed(() => props.imageFile),
  masksRef: computed(() => props.masks),
  disabledRef: computed(() => props.disabled),
  selectedMaskIdRef: computed(() => props.selectedMaskId),
  onAddMask: (rect) => emit("add-mask", rect),
  onUpdateMask: (id, patch) => emit("update-mask", id, patch),
  onSelectMask: (id) => emit("select-mask", id),
});
</script>

<template>
  <div class="ocr-canvas-root">
    <div v-if="!props.imageFile" class="canvas-empty">
      <i class="pi pi-image canvas-empty-icon" aria-hidden="true"></i>
      <p class="canvas-empty-text">選擇圖片後即可在此預覽</p>
    </div>

    <div v-else class="canvas-stage">
      <canvas ref="baseCanvas" class="canvas-layer canvas-base" aria-label="OCR 來源圖片" />
      <canvas ref="maskCanvas" class="canvas-layer canvas-mask" aria-label="遮罩圖層" />
      <canvas
        ref="uiCanvas"
        class="canvas-layer canvas-ui"
        :class="{ 'canvas-ui-disabled': props.disabled }"
        aria-label="互動圖層"
      />
    </div>
  </div>
</template>

<style scoped>
.ocr-canvas-root {
  display: flex;
  width: 100%;
  min-height: 0;
  flex-direction: column;
}

/* ── Empty state ── */
.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 18rem;
  background-color: var(--color-pse-bg);
  background-image: radial-gradient(circle, var(--color-pse-border) 1px, transparent 1px);
  background-size: 22px 22px;
}

.canvas-empty-icon {
  font-size: 2rem;
  color: var(--color-pse-muted);
}

.canvas-empty-text {
  font-size: 0.875rem;
  color: var(--color-pse-secondary);
}

/* ── Canvas stage ──
 * Grid 疊層方案：所有 canvas 共用同一個 grid cell（grid-area: 1/1），
 * 依 DOM 順序自然疊加（base → mask → ui），stage 高度由 baseCanvas 內容撐開。
 * max-height + overflow:hidden 限制最大顯示高度，不影響 canvas 像素尺寸，
 * 因此 toImageRect 的座標轉換仍可正確使用 getBoundingClientRect()。
 */
.canvas-stage {
  display: grid;
  width: 100%;
  max-height: 60vh;
  overflow: hidden;
  background-color: var(--color-pse-bg);
  background-image: radial-gradient(circle, var(--color-pse-border) 1px, transparent 1px);
  background-size: 22px 22px;
}

.canvas-layer {
  grid-area: 1 / 1;
  display: block;
  width: 100%;
  height: auto;
}

.canvas-base {
  z-index: 0;
  pointer-events: none;
}

.canvas-mask {
  z-index: 1;
  pointer-events: none;
}

.canvas-ui {
  z-index: 2;
  pointer-events: auto;
  cursor: crosshair;
  touch-action: none;
}

.canvas-ui-disabled {
  pointer-events: none;
}
</style>
