<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import Message from "primevue/message";
import { useCanvasEditor } from "@/composables/useCanvasEditor";
import type { MaskRect, MaskRectInput, MaskRectUpdate } from "@/types/mask";

const props = defineProps<{
  imageFile: File | null;
  masks: MaskRect[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "add-mask", rect: MaskRectInput): void;
  (e: "update-mask", id: string, patch: MaskRectUpdate): void;
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
  onAddMask: (rect) => emit("add-mask", rect),
  onUpdateMask: (id, patch) => emit("update-mask", id, patch),
});
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-base font-semibold tracking-tight">預覽</h2>
    </div>

    <Message v-if="!props.imageFile" severity="secondary" size="small" variant="simple">
      尚未選擇圖片
    </Message>

    <div v-else class="canvas-stage">
      <canvas ref="baseCanvas" class="canvas-layer canvas-base" aria-label="OCR 來源圖片" />
      <canvas ref="maskCanvas" class="canvas-layer canvas-mask" aria-label="遮罩圖層" />
      <canvas ref="uiCanvas" class="canvas-layer canvas-ui" :class="{ 'canvas-ui-disabled': props.disabled }"
        aria-label="互動圖層" />
    </div>
  </section>
</template>

<style scoped>
/*
 * Grid 疊層方案：所有 canvas 共用同一個 grid cell（grid-area: 1/1），
 * 依 DOM 順序自然疊加（base → mask → ui），stage 高度由 baseCanvas 內容撐開。
 * max-height + overflow:hidden 限制最大顯示高度，不影響 canvas 像素尺寸，
 * 因此 toImageRect 的座標轉換仍可正確使用 getBoundingClientRect()。
 */
.canvas-stage {
  display: grid;
  width: 100%;
  max-height: 24rem;
  overflow: hidden;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  background: var(--p-surface-100);
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
