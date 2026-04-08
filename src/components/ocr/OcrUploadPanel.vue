<script setup lang="ts">
import Button from "primevue/button";

const props = defineProps<{
  disabled?: boolean;
  canClear?: boolean;
}>();

const emit = defineEmits<{
  (e: "file-selected", file: File | null): void;
  (e: "clear"): void;
}>();

function handleChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  emit("file-selected", file);
  input.value = "";
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <label class="inline-flex">
        <input class="hidden" type="file" accept="image/*" :disabled="props.disabled" @change="handleChange" />
        <Button as="span" label="選擇圖片" icon="pi pi-upload" :disabled="props.disabled" />
      </label>
      <Button label="清除" icon="pi pi-trash" severity="secondary" variant="outlined"
        :disabled="props.disabled || !props.canClear" @click="emit('clear')" />
    </div>
  </section>
</template>