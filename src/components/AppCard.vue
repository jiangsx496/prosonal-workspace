<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div
    class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 shadow-sm shadow-slate-900/3 hover:shadow-md hover:-translate-y-0.5 transition-all"
  >
    <h3 v-if="title" class="text-sm font-semibold text-text-primary mb-1">{{ title }}</h3>
    <p v-if="subtitle" class="text-xs text-text-muted">{{ subtitle }}</p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>
