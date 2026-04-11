<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import {
  DEFAULT_MASK_FILL_COLOR,
  DEFAULT_MASK_STROKE_COLOR,
  type MaskRect,
  type MaskRectInput,
  type MaskRectUpdate,
} from "@/types/mask";

const props = defineProps<{
  maskRects: MaskRect[];
  hasOcr: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "detect"): void;
  (e: "clear"): void;
  (e: "remove", id: string): void;
  (e: "add-manual", input: MaskRectInput): void;
  (e: "update-mask", id: string, patch: MaskRectUpdate): void;
}>();

/**
 * `input[type=color]` 僅穩定支援 #rrggbb；非 hex 時改用對應預設，避免控制項顯示異常。
 */
function colorInputValue(css: string, fallback: string): string {
  const t = css.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const [, r, g, b] = t;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

const manualX = ref(0);
const manualY = ref(0);
const manualWidth = ref(40);
const manualHeight = ref(20);

/**
 * 檢查數值是否有效，僅在數值皆合理時送出手動遮罩。若未指定範圍或寬高小於等於 0，則不進行新增，避免產生異常資料。
 */
function handleAddManual() {
  const x = Number(manualX.value);
  const y = Number(manualY.value);
  const width = Number(manualWidth.value);
  const height = Number(manualHeight.value);
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return;
  if (width <= 0 || height <= 0) return;
  emit("add-manual", { x, y, width, height, source: "manual" });
}

function emitFillColor(id: string, value: string) {
  emit("update-mask", id, { fillColor: value });
}

function emitStrokeColor(id: string, value: string) {
  emit("update-mask", id, { strokeColor: value });
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-base font-semibold tracking-tight">PII 遮罩</h2>
    </div>

    <Message v-if="!props.hasOcr" severity="secondary" size="small" variant="simple">
      請先完成 OCR 後再偵測 PII。
    </Message>

    <div class="flex flex-wrap gap-2">
      <Button type="button" label="偵測 PII" icon="pi pi-search" :disabled="!props.hasOcr || props.disabled"
        @click="emit('detect')" />
      <Button type="button" label="清空遮罩" icon="pi pi-times" severity="secondary" variant="outlined"
        :disabled="props.maskRects.length === 0 || props.disabled" @click="emit('clear')" />
    </div>

    <p class="text-sm text-gray-600 tabular-nums">
      目前遮罩：{{ props.maskRects.length }} 塊
    </p>

    <ul v-if="props.maskRects.length" class="max-h-48 space-y-2 overflow-y-auto rounded border border-gray-200 p-2">
      <li v-for="r in props.maskRects" :key="r.id"
        class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-800">
        <span class="font-mono text-[11px] text-gray-500">{{ r.id.slice(0, 8) }}…</span>
        <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
          {{ r.source }}
        </span>
        <span class="tabular-nums">
          x{{ Math.round(r.x) }} y{{ Math.round(r.y) }} {{ Math.round(r.width) }}×{{ Math.round(r.height) }}
        </span>
        <label class="flex items-center gap-1 text-[11px] text-gray-600">
          填色
          <input type="color" class="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            :value="colorInputValue(r.fillColor, DEFAULT_MASK_FILL_COLOR)" :disabled="props.disabled"
            :aria-label="`遮罩 ${r.id.slice(0, 8)} 填色`"
            @input="emitFillColor(r.id, ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="flex items-center gap-1 text-[11px] text-gray-600">
          邊線
          <input type="color" class="h-7 w-8 cursor-pointer rounded border border-gray-300 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            :value="colorInputValue(r.strokeColor, DEFAULT_MASK_STROKE_COLOR)" :disabled="props.disabled"
            :aria-label="`遮罩 ${r.id.slice(0, 8)} 邊線色`"
            @input="emitStrokeColor(r.id, ($event.target as HTMLInputElement).value)" />
        </label>
        <Button type="button" icon="pi pi-trash" severity="danger" variant="text" rounded :disabled="props.disabled"
          :aria-label="`移除遮罩 ${r.id}`" @click="emit('remove', r.id)" />
      </li>
    </ul>

    <div class="space-y-2 rounded border border-dashed border-gray-300 p-3">
      <p class="text-xs font-medium text-gray-700">手動新增（原圖像素座標）</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label class="flex flex-col gap-0.5 text-[11px] text-gray-600">
          x
          <input v-model.number="manualX" type="number" step="1"
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm tabular-nums disabled:bg-gray-100"
            :disabled="!props.hasOcr || props.disabled" />
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] text-gray-600">
          y
          <input v-model.number="manualY" type="number" step="1"
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm tabular-nums disabled:bg-gray-100"
            :disabled="!props.hasOcr || props.disabled" />
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] text-gray-600">
          寬
          <input v-model.number="manualWidth" type="number" step="1" min="1"
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm tabular-nums disabled:bg-gray-100"
            :disabled="!props.hasOcr || props.disabled" />
        </label>
        <label class="flex flex-col gap-0.5 text-[11px] text-gray-600">
          高
          <input v-model.number="manualHeight" type="number" step="1" min="1"
            class="w-full rounded border border-gray-300 px-2 py-1 text-sm tabular-nums disabled:bg-gray-100"
            :disabled="!props.hasOcr || props.disabled" />
        </label>
      </div>
      <Button type="button" label="新增遮罩" icon="pi pi-plus" size="small" :disabled="!props.hasOcr || props.disabled"
        @click="handleAddManual" />
    </div>
  </section>
</template>
