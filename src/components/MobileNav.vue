<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const navItems = [
  { path: '/', name: 'execute', label: '今天', icon: '📊' },
  { path: '/inbox', name: 'inbox', label: '收集', icon: '📥' },
  { path: '/goals', name: 'goals', label: '目标', icon: '🎯' },
  { path: '/resources', name: 'resources', label: '资源', icon: '🗂️' },
  { path: '/review', name: 'review', label: '复盘', icon: '🔄' },
]

const isActive = computed(() => (name: string) => route.name === name)
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-bottom"
  >
    <div class="flex justify-around items-center h-16 px-2">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 rounded-lg text-xs transition-colors"
        :class="
          isActive(item.name)
            ? 'text-accent'
            : 'text-text-muted hover:text-text-secondary'
        "
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span class="truncate max-w-full">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
