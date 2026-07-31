<script setup lang="ts">
import { ref } from 'vue'

const content = ref('')

const placeholder = `# 开始写作...

支持 Markdown 语法，在这里记录你的想法。`
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">笔记</h1>
      <button
        class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        + 新建笔记
      </button>
    </div>

    <div class="bg-card border border-border rounded-xl overflow-hidden min-h-[400px]">
      <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-slate-100">
        <span class="w-3 h-3 rounded-full bg-red-400"></span>
        <span class="w-3 h-3 rounded-full bg-yellow-400"></span>
        <span class="w-3 h-3 rounded-full bg-green-400"></span>
        <span class="ml-2 text-xs text-text-muted">无标题笔记</span>
      </div>
      <textarea
        v-model="content"
        :placeholder="placeholder"
        class="w-full h-[360px] bg-transparent text-text-primary text-sm p-5 resize-none outline-none placeholder-text-muted/50 leading-relaxed font-mono"
      ></textarea>
    </div>
  </div>
</template>
