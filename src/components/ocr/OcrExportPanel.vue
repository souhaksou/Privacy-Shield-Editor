<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";

const props = defineProps<{
  canExport: boolean;
  isExporting: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: "export-image"): void;
  (e: "export-pdf"): void;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        label="匯出 PNG"
        icon="pi pi-image"
        :disabled="!props.canExport || props.isExporting"
        :loading="props.isExporting"
        @click="emit('export-image')"
      />
      <Button
        type="button"
        label="匯出 PDF"
        icon="pi pi-file-pdf"
        severity="secondary"
        :disabled="!props.canExport || props.isExporting"
        :loading="props.isExporting"
        @click="emit('export-pdf')"
      />
    </div>

    <Message v-if="props.error" severity="error" size="small" variant="simple">
      {{ props.error }}
    </Message>
  </section>
</template>
