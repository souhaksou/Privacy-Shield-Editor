<script setup lang="ts">
defineProps<{ collapsed: boolean }>();
</script>

<template>
  <svg
    class="collapse-chevron"
    :class="{ 'is-collapsed': collapsed }"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      d="M5 8 L10 13 L15 8"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.collapse-chevron {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  color: var(--color-pse-secondary);
  transition: transform 0.2s ease;
}

.collapse-chevron.is-collapsed {
  transform: scaleY(-1);
}
</style>
