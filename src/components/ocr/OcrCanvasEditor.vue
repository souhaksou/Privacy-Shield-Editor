<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import Message from "primevue/message";
import { useCanvasEditor } from "@/composables/useCanvasEditor";
import type { MaskRect, MaskRectInput } from "@/types/mask";

const props = defineProps<{
  imageFile: File | null;
  masks: MaskRect[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "add-mask", rect: MaskRectInput): void;
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
.canvas-stage {
  position: relative;
  width: 100%;
  min-height: 240px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--p-surface-100);
}

.canvas-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: auto;
  max-height: 24rem;
  object-fit: contain;
  display: block;
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
}

.canvas-ui-disabled {
  pointer-events: none;
  cursor: not-allowed;
}
</style>
