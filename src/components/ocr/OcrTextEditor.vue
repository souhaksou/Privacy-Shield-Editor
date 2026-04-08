<script setup lang="ts">
import Textarea from "primevue/textarea";

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-base font-semibold tracking-tight">OCR 文字</h2>
    </div>
    <Textarea :value="props.modelValue" :disabled="props.disabled" rows="12" class="w-full h-96 max-h-96"
      placeholder="OCR 結果會顯示在這裡..." @input="handleInput" />
  </section>
</template>