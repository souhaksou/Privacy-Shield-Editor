<script setup lang="ts">
import { computed } from "vue";
import OcrUploadPanel from "@/components/ocr/OcrUploadPanel.vue";
import OcrImagePreview from "@/components/ocr/OcrImagePreview.vue";
import OcrRunPanel from "@/components/ocr/OcrRunPanel.vue";
import OcrTextEditor from "@/components/ocr/OcrTextEditor.vue";
import { useDocumentStore } from "@/stores/document";
import { useEditorStore } from "@/stores/editor";
import { useOcr } from "@/composables/useOcr";

const documentStore = useDocumentStore();
const editorStore = useEditorStore();
const { runOcr } = useOcr();

const canRun = computed(() => !!documentStore.imageFile && !editorStore.isOcrLoading);

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
  if (!documentStore.imageFile || editorStore.isOcrLoading) return;
  runOcr(documentStore.imageFile);
}

/**
 * 清除目前文件與 OCR UI 狀態。
 *
 * OCR 執行中不允許重置，避免進行中的流程與畫面狀態互相覆蓋。
 */
function handleClearAll() {
  if (editorStore.isOcrLoading) return;
  documentStore.clearDocument();
  editorStore.resetOcrUiState();
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 space-y-6 md:px-6 md:py-8">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">OCR 流程</h1>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <section class="space-y-6 xl:col-span-8">
        <OcrUploadPanel :disabled="editorStore.isOcrLoading" :can-clear="documentStore.hasImage"
          @file-selected="handleFileSelected" @clear="handleClearAll" />
        <OcrImagePreview :src="documentStore.imageObjectUrl" />
      </section>

      <section class="space-y-6 xl:col-span-4">
        <OcrRunPanel :can-run="canRun" :is-loading="editorStore.isOcrLoading" :progress="editorStore.ocrProgress"
          :status="editorStore.ocrStatus" :error="editorStore.ocrError" @run="handleRunOcr" />
        <OcrTextEditor :model-value="documentStore.correctedText"
          :disabled="editorStore.isOcrLoading || !documentStore.hasOcr"
          @update:model-value="documentStore.setCorrectedText" />
      </section>
    </div>
  </main>
</template>