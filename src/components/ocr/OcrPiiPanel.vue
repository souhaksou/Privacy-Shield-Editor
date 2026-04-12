<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import Message from "primevue/message";
import {
  DEFAULT_MASK_FILL_COLOR,
  DEFAULT_MASK_STROKE_COLOR,
  type MaskRect,
  type MaskRectInput,
  type MaskRectUpdate,
  type MaskSource,
} from "@/types/mask";

const props = defineProps<{
  maskRects: MaskRect[];
  hasOcr: boolean;
  disabled: boolean;
  selectedMaskId: string | null;
}>();

const emit = defineEmits<{
  (e: "detect"): void;
  (e: "clear"): void;
  (e: "remove", id: string): void;
  (e: "add-manual", input: MaskRectInput): void;
  (e: "update-mask", id: string, patch: MaskRectUpdate): void;
  (e: "select-mask", id: string | null): void;
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

/** 列表／畫布選中的遮罩；無選取時為 `null`。 */
const selectedMask = computed(() => {
  if (!props.selectedMaskId) return null;
  return props.maskRects.find((r) => r.id === props.selectedMaskId) ?? null;
});

/** 座標欄：需有 OCR、面板未鎖定、且已選中一塊遮罩。 */
const coordInputsDisabled = computed(
  () => !props.hasOcr || props.disabled || selectedMask.value === null,
);

/**
 * 以固定預設矩形新增一塊手動遮罩（與先前手動區預設一致）。
 */
function handleAddDefaultMask() {
  if (!props.hasOcr || props.disabled) return;
  emit("add-manual", { x: 0, y: 0, width: 40, height: 20, source: "manual" });
}

type CoordAxis = "x" | "y" | "width" | "height";

function coordDisplay(axis: CoordAxis): string | number {
  const m = selectedMask.value;
  if (!m) return "";
  return Math.round(m[axis]);
}

/**
 * `change` 時將單一軸寫回 store；寬高須 ≥ 1。
 */
function commitCoordChange(axis: CoordAxis, raw: string) {
  const id = props.selectedMaskId;
  const m = selectedMask.value;
  if (!id || !m || coordInputsDisabled.value) return;
  const n = Number(raw);
  if (!Number.isFinite(n)) return;
  if ((axis === "width" || axis === "height") && n < 1) return;
  const rounded = Math.round(n);
  if (Math.round(m[axis]) === rounded) return;
  const patch: MaskRectUpdate = { [axis]: rounded };
  emit("update-mask", id, patch);
}

function emitFillColor(id: string, value: string) {
  emit("update-mask", id, { fillColor: value });
}

function emitStrokeColor(id: string, value: string) {
  emit("update-mask", id, { strokeColor: value });
}

/** 列表顯示用：`source` 仍為 en，畫面改為中文。 */
function maskSourceLabel(source: MaskSource): string {
  return source === "manual" ? "手動" : "自動";
}
</script>

<template>
  <section class="space-y-4">
    <Message v-if="!props.hasOcr" severity="secondary" size="small" variant="simple">
      請先完成 OCR 後再偵測 PII。
    </Message>

    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        label="偵測 PII"
        icon="pi pi-search"
        :disabled="!props.hasOcr || props.disabled"
        @click="emit('detect')"
      />
      <Button
        type="button"
        label="清空遮罩"
        icon="pi pi-times"
        severity="secondary"
        variant="outlined"
        :disabled="props.maskRects.length === 0 || props.disabled"
        @click="emit('clear')"
      />
      <Button
        type="button"
        label="新增遮罩"
        icon="pi pi-plus"
        severity="secondary"
        variant="outlined"
        :disabled="!props.hasOcr || props.disabled"
        @click="handleAddDefaultMask"
      />
    </div>

    <p class="text-sm text-pse-secondary tabular-nums">
      目前遮罩：<span class="text-pse-text font-medium">{{ props.maskRects.length }}</span> 塊
    </p>

    <ul
      v-if="props.maskRects.length"
      class="mask-list"
    >
      <li
        v-for="(r, maskIndex) in props.maskRects"
        :key="r.id"
        class="mask-item"
        :class="{ 'mask-item--selected': r.id === props.selectedMaskId }"
        @click="emit('select-mask', r.id === props.selectedMaskId ? null : r.id)"
      >
        <span class="source-badge">{{ maskSourceLabel(r.source) }}</span>
        <span class="hidden font-mono tabular-nums text-xs text-pse-secondary sm:inline">
          x{{ Math.round(r.x) }} y{{ Math.round(r.y) }} {{ Math.round(r.width) }}×{{ Math.round(r.height) }}
        </span>
        <label class="color-label">
          填色
          <input
            type="color"
            class="color-input"
            :value="colorInputValue(r.fillColor, DEFAULT_MASK_FILL_COLOR)"
            :disabled="props.disabled"
            :aria-label="`第 ${maskIndex + 1} 塊遮罩 填色`"
            @input="emitFillColor(r.id, ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="color-label">
          邊線
          <input
            type="color"
            class="color-input"
            :value="colorInputValue(r.strokeColor, DEFAULT_MASK_STROKE_COLOR)"
            :disabled="props.disabled"
            :aria-label="`第 ${maskIndex + 1} 塊遮罩 邊線色`"
            @input="emitStrokeColor(r.id, ($event.target as HTMLInputElement).value)"
          />
        </label>
        <Button
          type="button"
          icon="pi pi-trash"
          severity="danger"
          variant="text"
          rounded
          size="small"
          :disabled="props.disabled"
          :aria-label="`移除第 ${maskIndex + 1} 塊遮罩`"
          @click.stop="emit('remove', r.id)"
        />
      </li>
    </ul>

    <div class="manual-panel">
      <p class="text-xs font-medium text-pse-secondary">選中遮罩座標（原圖像素）</p>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label class="coord-label">
          x
          <input
            type="number"
            step="1"
            class="coord-input"
            :value="coordDisplay('x')"
            :disabled="coordInputsDisabled"
            @change="commitCoordChange('x', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="coord-label">
          y
          <input
            type="number"
            step="1"
            class="coord-input"
            :value="coordDisplay('y')"
            :disabled="coordInputsDisabled"
            @change="commitCoordChange('y', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="coord-label">
          寬
          <input
            type="number"
            step="1"
            min="1"
            class="coord-input"
            :value="coordDisplay('width')"
            :disabled="coordInputsDisabled"
            @change="commitCoordChange('width', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="coord-label">
          高
          <input
            type="number"
            step="1"
            min="1"
            class="coord-input"
            :value="coordDisplay('height')"
            :disabled="coordInputsDisabled"
            @change="commitCoordChange('height', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── Mask list ── */
.mask-list {
  max-height: 12rem;
  overflow-y: auto;
  border: 1px solid var(--color-pse-border);
  border-radius: 0.375rem;
  padding: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.mask-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  background: var(--color-pse-raised);
  border: 1px solid var(--color-pse-border);
  cursor: pointer;
}

.mask-item--selected {
  border-color: var(--color-pse-accent);
  background: color-mix(in srgb, var(--color-pse-accent) 12%, var(--color-pse-raised));
}

.source-badge {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-pse-accent);
  border: 1px solid var(--color-pse-border);
  border-radius: 0.2rem;
  padding: 0.1rem 0.375rem;
}

/* ── Color inputs ── */
.color-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-pse-secondary);
}

.color-input {
  height: 1.625rem;
  width: 2rem;
  cursor: pointer;
  border-radius: 0.25rem;
  border: 1px solid var(--color-pse-border);
  background: var(--color-pse-surface);
  padding: 0.125rem;
}

.color-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* ── Manual add panel ── */
.manual-panel {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  border: 1px dashed var(--color-pse-border);
  border-radius: 0.375rem;
  padding: 0.75rem;
}

/* ── Coordinate inputs ── */
.coord-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-pse-secondary);
}

.coord-input {
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid var(--color-pse-border);
  background: var(--color-pse-raised);
  color: var(--color-pse-text);
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.coord-input:disabled {
  background: var(--color-pse-surface);
  color: var(--color-pse-muted);
}
</style>
