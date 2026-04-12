<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();

const props = defineProps<{
  canRun: boolean;
  isLoading: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "run"): void;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-2">
      <p class="text-xs font-medium text-pse-secondary">OCR 語言（至少選一項）</p>
      <div
        class="flex flex-col gap-2 sm:grid sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:gap-y-2">
        <div class="flex flex-row flex-nowrap items-center gap-x-4 sm:contents">
          <div class="flex items-center gap-2">
            <Checkbox input-id="ocr-lang-eng" binary :model-value="editorStore.ocrIncludeEng"
              :disabled="props.isLoading" @update:model-value="editorStore.setOcrIncludeEng(!!$event)" />
            <label for="ocr-lang-eng" class="cursor-pointer text-sm text-pse-text">英文</label>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox input-id="ocr-lang-chi-tra" binary :model-value="editorStore.ocrIncludeChiTra"
              :disabled="props.isLoading" @update:model-value="editorStore.setOcrIncludeChiTra(!!$event)" />
            <label for="ocr-lang-chi-tra" class="cursor-pointer text-sm text-pse-text">中文</label>
          </div>
        </div>
        <div class="min-w-0 justify-self-stretch sm:justify-self-end">
          <Button type="button" class="min-w-[12rem] w-full sm:w-auto"
            :label="props.isLoading ? 'OCR 執行中...' : '執行 OCR'" icon="pi pi-play"
            :disabled="!props.canRun || props.isLoading" :loading="props.isLoading" @click="emit('run')" />
        </div>
      </div>
    </div>

    <Message v-if="props.error" severity="error" size="small" variant="simple">
      {{ props.error }}
    </Message>
  </section>
</template>
