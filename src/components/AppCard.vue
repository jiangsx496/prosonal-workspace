<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div
    class="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
  >
    <h3 v-if="title" class="text-sm font-semibold text-text-primary mb-1">{{ title }}</h3>
    <p v-if="subtitle" class="text-xs text-text-muted">{{ subtitle }}</p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>
