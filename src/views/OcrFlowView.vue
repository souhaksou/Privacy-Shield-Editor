<script setup lang="ts">
/**
 * OCR 主流程頁：上傳 → 辨識與文字編修 → 可選 PII 遮罩 → 匯出。
 * PII 操作經子元件 emit 轉呼叫 `usePiiMask`，維持 store / composable 與 UI 分層。
 */
import { computed, ref } from "vue";
import OcrUploadPanel from "@/components/ocr/OcrUploadPanel.vue";
import OcrCanvasEditor from "@/components/ocr/OcrCanvasEditor.vue";
import OcrRunPanel from "@/components/ocr/OcrRunPanel.vue";
import OcrExportPanel from "@/components/ocr/OcrExportPanel.vue";
import OcrPiiPanel from "@/components/ocr/OcrPiiPanel.vue";
import OcrTextEditor from "@/components/ocr/OcrTextEditor.vue";
import CollapseChevron from "@/components/ui/CollapseChevron.vue";
import { useDocumentStore } from "@/stores/document";
import { useEditorStore } from "@/stores/editor";
import { useOcr } from "@/composables/useOcr";
import { useExport } from "@/composables/useExport";
import { usePiiMask } from "@/composables/usePiiMask";
import type { MaskRectInput, MaskRectUpdate } from "@/types/mask";

type PanelKey = "preview" | "s1" | "s2" | "s3";

const expanded = ref<Record<PanelKey, boolean>>({
  preview: true,
  s1: true,
  s2: true,
  s3: true,
});

function togglePanel(key: PanelKey) {
  expanded.value[key] = !expanded.value[key];
}

const documentStore = useDocumentStore();
const editorStore = useEditorStore();
const selectedMaskId = ref<string | null>(null);
const { runOcr } = useOcr();
const { exportImage, exportPdf } = useExport();
const {
  maskRects,
  hasOcr,
  runPiiDetectFromOcr,
  addMaskRect,
  updateMaskRectById,
  removeMaskRect,
  clearMasks,
} = usePiiMask();

const canRun = computed(
  () =>
    !!documentStore.imageFile &&
    editorStore.hasOcrLangSelection &&
    !editorStore.isOcrLoading &&
    !editorStore.isExporting,
);

/** 任何阻塞操作（OCR 或匯出）進行中時為 true，所有互動一律停用。 */
const isBusy = computed(() => editorStore.isOcrLoading || editorStore.isExporting);

const canExport = computed(() => documentStore.hasImage && !isBusy.value);

function handleFileSelected(file: File | null) {
  documentStore.setImageFile(file);
}

function handleRunOcr() {
  if (
    !documentStore.imageFile ||
    !editorStore.hasOcrLangSelection ||
    editorStore.isOcrLoading ||
    editorStore.isExporting
  ) {
    return;
  }
  runOcr(documentStore.imageFile);
}

function handleClearAll() {
  if (isBusy.value) return;
  documentStore.clearDocument();
  editorStore.resetOcrUiState();
  editorStore.resetExportUiState();
  selectedMaskId.value = null;
}

function handleSelectMask(id: string | null) {
  selectedMaskId.value = id;
}

function handlePiiDetect() {
  if (isBusy.value) return;
  runPiiDetectFromOcr();
}

function handlePiiClearMasks() {
  if (isBusy.value) return;
  clearMasks();
  selectedMaskId.value = null;
}

function handlePiiRemoveMask(id: string) {
  if (isBusy.value) return;
  if (selectedMaskId.value === id) selectedMaskId.value = null;
  removeMaskRect(id);
}

function handlePiiAddManual(input: MaskRectInput) {
  if (isBusy.value) return;
  addMaskRect(input);
}

function handlePiiUpdateMask(id: string, patch: MaskRectUpdate) {
  if (isBusy.value) return;
  updateMaskRectById(id, patch);
}
</script>

<template>
  <!-- 頂部應用程式標題列 -->
  <header class="app-header">
    <div class="app-header-inner">
      <span class="brand-tag">PSE</span>
      <h1 class="brand-name">Privacy Shield Editor</h1>
      <span class="brand-divider" aria-hidden="true"></span>
      <span class="brand-sub">文件隱私遮罩工具</span>
    </div>
  </header>

  <main class="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr] xl:items-start">

      <!-- 左欄：工作台（圖片預覽 + 上傳） -->
      <section class="workbench" :class="{ 'workbench--fill-viewport': expanded.preview }">
        <div class="workbench-header" @click="togglePanel('preview')">
          <div class="pane-heading">
            <span class="section-tag">PREVIEW</span>
            <span class="section-title">預覽工作台</span>
          </div>
          <CollapseChevron :collapsed="!expanded.preview" />
        </div>
        <Transition name="pane-collapse">
          <div v-show="expanded.preview" class="pane-collapse-grid workbench-pane-shell">
            <div class="workbench-body">
              <div class="workbench-toolbar">
                <OcrUploadPanel :disabled="isBusy"
                  :can-clear="documentStore.hasImage" @file-selected="handleFileSelected" @clear="handleClearAll" />
              </div>
              <div class="workbench-canvas-slot">
                <OcrCanvasEditor :image-file="documentStore.imageFile" :masks="maskRects" :disabled="isBusy"
                  :selected-mask-id="selectedMaskId" @add-mask="handlePiiAddManual" @update-mask="handlePiiUpdateMask"
                  @select-mask="handleSelectMask" />
              </div>
            </div>
          </div>
        </Transition>
      </section>

      <!-- 右欄：步驟面板 -->
      <section class="space-y-4">

        <!-- 步驟 01：OCR 執行與文字校正 -->
        <div class="step-panel">
          <div class="step-header" @click="togglePanel('s1')">
            <div class="pane-heading">
              <span class="step-num">01</span>
              <span class="step-title">OCR 與文字校正</span>
            </div>
            <CollapseChevron :collapsed="!expanded.s1" />
          </div>
          <Transition name="pane-collapse">
            <div v-show="expanded.s1" class="pane-collapse-grid">
              <div class="pane-collapse-inner">
                <div class="step-body flex flex-col gap-4">
                  <OcrRunPanel :can-run="canRun" :is-loading="editorStore.isOcrLoading" :error="editorStore.ocrError"
                    @run="handleRunOcr" />
                  <OcrTextEditor :model-value="documentStore.correctedText"
                    :disabled="isBusy || !documentStore.hasOcr"
                    @update:model-value="documentStore.setCorrectedText" />
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 步驟 02：PII 遮罩 -->
        <div class="step-panel">
          <div class="step-header" @click="togglePanel('s2')">
            <div class="pane-heading">
              <span class="step-num">02</span>
              <span class="step-title">PII 遮罩</span>
            </div>
            <CollapseChevron :collapsed="!expanded.s2" />
          </div>
          <Transition name="pane-collapse">
            <div v-show="expanded.s2" class="pane-collapse-grid">
              <div class="pane-collapse-inner">
                <div class="step-body">
                  <OcrPiiPanel :mask-rects="maskRects" :has-ocr="hasOcr" :disabled="isBusy"
                    :selected-mask-id="selectedMaskId" @detect="handlePiiDetect" @clear="handlePiiClearMasks"
                    @remove="handlePiiRemoveMask" @add-manual="handlePiiAddManual" @update-mask="handlePiiUpdateMask"
                    @select-mask="handleSelectMask" />
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 步驟 03：匯出 -->
        <div class="step-panel">
          <div class="step-header" @click="togglePanel('s3')">
            <div class="pane-heading">
              <span class="step-num">03</span>
              <span class="step-title">匯出</span>
            </div>
            <CollapseChevron :collapsed="!expanded.s3" />
          </div>
          <Transition name="pane-collapse">
            <div v-show="expanded.s3" class="pane-collapse-grid">
              <div class="pane-collapse-inner">
                <div class="step-body">
                  <OcrExportPanel :can-export="canExport" :is-exporting="editorStore.isExporting"
                    :error="editorStore.exportError" @export-image="exportImage" @export-pdf="exportPdf" />
                </div>
              </div>
            </div>
          </Transition>
        </div>

      </section>
    </div>
  </main>
</template>

<style scoped>
/* ── App header ── */
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-pse-surface);
  border-bottom: 1px solid var(--color-pse-border);
}

.app-header-inner {
  max-width: 80rem;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.brand-tag {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--color-pse-accent);
  border: 1px solid var(--color-pse-border);
  border-radius: 0.25rem;
  padding: 0.2rem 0.5rem;
  text-transform: uppercase;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-pse-text);
  letter-spacing: -0.01em;
  margin: 0;
}

.brand-divider {
  width: 1px;
  height: 1rem;
  background: var(--color-pse-border);
}

.brand-sub {
  font-size: 0.8rem;
  color: var(--color-pse-secondary);
}

/* ── Left: Workbench card ── */
.workbench {
  --workbench-viewport-h: calc(100dvh - 8rem);

  background: var(--color-pse-surface);
  border: 1px solid var(--color-pse-border);
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
  min-height: 0;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .workbench {
    max-height: var(--workbench-viewport-h);
    width: 100%;
  }

  .workbench.workbench--fill-viewport {
    min-height: var(--workbench-viewport-h);
  }
}

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-pse-raised);
  border-bottom: 1px solid var(--color-pse-border);
  cursor: pointer;
  user-select: none;
}

/* Grid 0fr ↔ 1fr height transition（搭配 <Transition name="pane-collapse"> + v-show） */
.pane-collapse-grid {
  display: grid;
  grid-template-rows: 1fr;
}

.pane-collapse-inner {
  min-height: 0;
  overflow: hidden;
}

.workbench-pane-shell {
  flex: 1 1 auto;
  min-height: 0;
}

/* 摺疊動畫用 clip；捲動改在 canvas 區，避免與 grid 0fr 衝突 */
.workbench-pane-shell > .workbench-body {
  min-height: 0;
  overflow: hidden;
}

.pane-collapse-enter-active,
.pane-collapse-leave-active {
  overflow: hidden;
  transition: grid-template-rows 0.22s ease;
}

.pane-collapse-enter-from,
.pane-collapse-leave-to {
  grid-template-rows: 0fr;
}

.pane-collapse-enter-to,
.pane-collapse-leave-from {
  grid-template-rows: 1fr;
}

.workbench-body {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.workbench-canvas-slot {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .workbench--fill-viewport .workbench-pane-shell {
    flex: 1 1 0;
    min-height: 0;
  }

  .workbench-pane-shell > .workbench-body {
    flex: 1 1 0;
  }

  .workbench--fill-viewport .workbench-canvas-slot {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
  }

  .workbench--fill-viewport .workbench-canvas-slot :deep(.ocr-canvas-root) {
    flex: 1 1 0;
    min-height: 0;
  }

  .workbench--fill-viewport .workbench-canvas-slot :deep(.canvas-empty) {
    flex: 1 1 auto;
    min-height: 18rem;
  }

  .workbench--fill-viewport .workbench-canvas-slot :deep(.canvas-stage) {
    flex: 1 1 0;
    min-height: 0;
    max-height: none;
  }
}

.workbench-toolbar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-pse-border);
}

/* ── Right: Step panels ── */
.step-panel {
  background: var(--color-pse-surface);
  border: 1px solid var(--color-pse-border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  background: var(--color-pse-raised);
  border-bottom: 1px solid var(--color-pse-border);
  cursor: pointer;
  user-select: none;
}

.pane-heading {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
}


.step-num {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--color-pse-accent);
}

.step-title,
.section-title {
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-pse-text);
}

.section-tag {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--color-pse-accent);
}

.step-body {
  padding: 1rem;
}
</style>
