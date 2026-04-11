<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();

const props = defineProps<{
  canRun: boolean;
  isLoading: boolean;
  progress: number;
  status?: string;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "run"): void;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-2">
      <p class="text-xs font-medium text-gray-700">OCR 語言（至少選一項）</p>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-2">
          <Checkbox input-id="ocr-lang-eng" binary :model-value="editorStore.ocrIncludeEng"
            :disabled="props.isLoading" @update:model-value="editorStore.setOcrIncludeEng(!!$event)" />
          <label for="ocr-lang-eng" class="cursor-pointer text-sm text-gray-800">英文 (eng)</label>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox input-id="ocr-lang-chi-tra" binary :model-value="editorStore.ocrIncludeChiTra"
            :disabled="props.isLoading" @update:model-value="editorStore.setOcrIncludeChiTra(!!$event)" />
          <label for="ocr-lang-chi-tra" class="cursor-pointer text-sm text-gray-800">繁體中文 (chi_tra)</label>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        目前組合：<span class="font-mono tabular-nums text-gray-700">{{ editorStore.ocrLang }}</span>。勾選繁中時首次辨識會下載較大語言包，請稍候。
      </p>
    </div>

    <div class="grid grid-cols-1 gap-2 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-center xl:gap-3">
      <Button type="button" :label="props.isLoading ? 'OCR 執行中...' : '執行 OCR'" icon="pi pi-play"
        :disabled="!props.canRun || props.isLoading" :loading="props.isLoading" class="xl:shrink-0"
        @click="emit('run')" />

      <div v-if="props.isLoading" class="space-y-1 xl:self-center">
        <p class="text-xs leading-none text-gray-600 tabular-nums">
          {{ props.progress }}%
        </p>
        <ProgressBar :value="props.progress" />
      </div>
    </div>

    <Message v-if="props.error" severity="error" size="small" variant="simple">
      {{ props.error }}
    </Message>
  </section>
</template>