<script setup lang="ts">
const projects = [
  { id: 1, name: '示例项目', desc: '这是一个占位项目', color: '#4f46e5' },
]
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">项目</h1>
      <button
        class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        + 新建项目
      </button>
    </div>

    <div v-if="projects.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="p in projects"
        :key="p.id"
        class="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-center gap-3 mb-3">
          <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: p.color }"></span>
          <h3 class="font-semibold text-text-primary">{{ p.name }}</h3>
        </div>
        <p class="text-xs text-text-muted">{{ p.desc }}</p>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <span class="text-4xl mb-4">📁</span>
      <p class="text-sm">暂无项目</p>
    </div>
  </div>
</template>
