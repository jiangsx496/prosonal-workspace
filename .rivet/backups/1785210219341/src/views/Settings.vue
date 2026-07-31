<script setup lang="ts">
import { ref } from 'vue'

const theme = ref('light')
const language = ref('zh-CN')
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0 max-w-lg">
    <h1 class="text-2xl font-bold text-text-primary">设置</h1>

    <div class="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 class="text-sm font-semibold text-text-primary">外观</h3>

      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary">主题</span>
        <select
          v-model="theme"
          class="bg-card-hover text-text-primary text-sm px-3 py-1.5 rounded-lg border border-border outline-none focus:border-accent"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary">语言</span>
        <select
          v-model="language"
          class="bg-card-hover text-text-primary text-sm px-3 py-1.5 rounded-lg border border-border outline-none focus:border-accent"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <div class="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 class="text-sm font-semibold text-text-primary">关于</h3>
      <p class="text-xs text-text-muted leading-relaxed">
        Personal Workspace v0.1.0<br />
        一个简洁的个人工作台，帮助你管理任务、项目和笔记。
      </p>
    </div>
  </div>
</template>
