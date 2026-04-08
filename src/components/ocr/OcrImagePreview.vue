<script setup lang="ts">
import Message from "primevue/message";

const props = defineProps<{
  src: string | null;
}>();
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-base font-semibold tracking-tight">預覽</h2>
    </div>

    <Message v-if="!props.src" severity="secondary" size="small" variant="simple">
      尚未選擇圖片
    </Message>

    <img v-else :src="props.src" alt="OCR 來源圖片" class="max-h-96 w-full rounded-lg border object-contain" />
  </section>
</template>