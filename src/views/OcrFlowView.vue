<script setup lang="ts">
/**
 * OCR 主流程頁：上傳 → 辨識 → 文字編修 → 可選 PII 遮罩 → 匯出。
 * PII 操作經子元件 emit 轉呼叫 `usePiiMask`，維持 store / composable 與 UI 分層。
 */
import { computed } from "vue";
import OcrUploadPanel from "@/components/ocr/OcrUploadPanel.vue";
import OcrImagePreview from "@/components/ocr/OcrImagePreview.vue";
import OcrRunPanel from "@/components/ocr/OcrRunPanel.vue";
import OcrExportPanel from "@/components/ocr/OcrExportPanel.vue";
import OcrPiiPanel from "@/components/ocr/OcrPiiPanel.vue";
import OcrTextEditor from "@/components/ocr/OcrTextEditor.vue";
import { useDocumentStore } from "@/stores/document";
import { useEditorStore } from "@/stores/editor";
import { useOcr } from "@/composables/useOcr";
import { useExport } from "@/composables/useExport";
import { usePiiMask } from "@/composables/usePiiMask";
import type { MaskRectInput } from "@/types/mask";

const documentStore = useDocumentStore();
const editorStore = useEditorStore();
const { runOcr } = useOcr();
const { exportImage, exportPdf } = useExport();
const { maskRects, hasOcr, runPiiDetectFromOcr, addMaskRect, removeMaskRect, clearMasks } = usePiiMask();

/**
 * 是否允許送出 OCR：需已選圖檔，且與匯出互斥，避免並行寫入狀態。
 */
const canRun = computed(
  () => !!documentStore.imageFile && !editorStore.isOcrLoading && !editorStore.isExporting,
);

/**
 * 是否允許匯出：需有可預覽圖片，且與 OCR 互斥。
 */
const canExport = computed(
  () =>
    documentStore.hasImage && !editorStore.isOcrLoading && !editorStore.isExporting,
);

/**
 * PII 面板是否整體禁用：OCR 或匯出進行中時關閉，與其他面板 guard 一致。
 */
const piiPanelDisabled = computed(
  () => editorStore.isOcrLoading || editorStore.isExporting,
);

/**
 * 接收上傳面板選取結果並同步目前文件來源。
 *
 * @param file 使用者選取的影像檔；為 `null` 代表清除當前選取
 */
function handleFileSelected(file: File | null) {
  documentStore.setImageFile(file);
}

/**
 * 觸發 OCR 執行流程。
 *
 * 當尚未選取影像或 OCR 執行中時直接忽略，避免重複送出造成狀態競爭。
 */
function handleRunOcr() {
  if (!documentStore.imageFile || editorStore.isOcrLoading || editorStore.isExporting) return;
  runOcr(documentStore.imageFile);
}

/**
 * 清除目前文件與 OCR UI 狀態。
 *
 * OCR 執行中不允許重置，避免進行中的流程與畫面狀態互相覆蓋。
 */
function handleClearAll() {
  if (editorStore.isOcrLoading || editorStore.isExporting) return;
  documentStore.clearDocument();
  editorStore.resetOcrUiState();
  editorStore.resetExportUiState();
}

/**
 * 觸發 regex PII 偵測並寫入 auto 遮罩（細節見 `usePiiMask`）。
 *
 * 於載入或匯出中直接返回，避免與其他流程競爭。
 */
function handlePiiDetect() {
  if (piiPanelDisabled.value) return;
  runPiiDetectFromOcr();
}

/**
 * 清空所有遮罩（含 auto 與 manual）。
 *
 * 於載入或匯出中直接返回。
 */
function handlePiiClearMasks() {
  if (piiPanelDisabled.value) return;
  clearMasks();
}

/**
 * 依穩定 `id` 移除單塊遮罩。
 *
 * @param id `MaskRect.id`
 */
function handlePiiRemoveMask(id: string) {
  if (piiPanelDisabled.value) return;
  removeMaskRect(id);
}

/**
 * 追加一塊手動遮罩；`id` 由 store 補齊。
 *
 * @param input 幾何與來源（通常為 `source: "manual"`）
 */
function handlePiiAddManual(input: MaskRectInput) {
  if (piiPanelDisabled.value) return;
  addMaskRect(input);
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 space-y-6 md:px-6 md:py-8">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">OCR 流程</h1>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <section class="space-y-6 xl:col-span-8">
        <OcrUploadPanel :disabled="editorStore.isOcrLoading || editorStore.isExporting"
          :can-clear="documentStore.hasImage" @file-selected="handleFileSelected" @clear="handleClearAll" />
        <OcrImagePreview :src="documentStore.imageObjectUrl" />
      </section>

      <section class="space-y-6 xl:col-span-4">
        <OcrRunPanel :can-run="canRun" :is-loading="editorStore.isOcrLoading" :progress="editorStore.ocrProgress"
          :status="editorStore.ocrStatus" :error="editorStore.ocrError" @run="handleRunOcr" />
        <OcrTextEditor :model-value="documentStore.correctedText"
          :disabled="editorStore.isOcrLoading || !documentStore.hasOcr"
          @update:model-value="documentStore.setCorrectedText" />
        <OcrPiiPanel :mask-rects="maskRects" :has-ocr="hasOcr" :disabled="piiPanelDisabled" @detect="handlePiiDetect"
          @clear="handlePiiClearMasks" @remove="handlePiiRemoveMask" @add-manual="handlePiiAddManual" />
        <OcrExportPanel :can-export="canExport" :is-exporting="editorStore.isExporting"
          :error="editorStore.exportError" @export-image="exportImage" @export-pdf="exportPdf" />
      </section>
    </div>
  </main>
</template>