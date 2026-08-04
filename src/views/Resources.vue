<script setup lang="ts">
const resourceItems = [
  { path: '/tasks', label: '任务池', desc: '管理所有任务和计划', icon: '📋', color: '#4f46e5' },
  { path: '/habits', label: '习惯', desc: '长期重复行为追踪', icon: '🔥', color: '#059669' },
  { path: '/journal', label: '日志', desc: '每日记录与心情', icon: '📖', color: '#0891b2' },
  { path: '/notes', label: '笔记', desc: 'Markdown 笔记', icon: '📝', color: '#7c3aed' },
  { path: '/settings', label: '设置', desc: '主题、语言偏好', icon: '⚙️', color: '#64748b' },
]
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">资源</h1>
      <p class="text-xs text-text-muted mt-1">管理工具集</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <router-link
        v-for="item in resourceItems"
        :key="item.path"
        :to="item.path"
        class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 hover:shadow-md transition-all group"
      >
        <div class="flex items-center gap-3 mb-2">
          <h3 class="font-semibold text-text-primary group-hover:text-accent transition-colors">{{ item.label }}</h3>
        </div>
        <p class="text-xs text-text-muted">{{ item.desc }}</p>
      </router-link>
    </div>
  </div>
</template>
