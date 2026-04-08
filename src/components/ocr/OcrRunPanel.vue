<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";
import ProgressBar from "primevue/progressbar";

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