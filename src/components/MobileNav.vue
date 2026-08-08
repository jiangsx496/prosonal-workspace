<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'

const route = useRoute()

const navItems = [
  { path: '/', name: 'execute', label: '今天', icon: 'today' },
  { path: '/inbox', name: 'inbox', label: '收集', icon: 'inbox' },
  { path: '/goals', name: 'goals', label: '目标', icon: 'target' },
  { path: '/resources', name: 'resources', label: '资源', icon: 'folder' },
  { path: '/review', name: 'review', label: '复盘', icon: 'refresh' },
  { path: '/dashboard', name: 'dashboard', label: '看板', icon: 'chart' },
  { path: '/interview', name: 'interview', label: '题库', icon: 'book' },
  { path: '/calendar', name: 'calendar', label: '日历', icon: 'calendar' },
]

const isActive = computed(() => (name: string) => route.name === name)
</script>

<template>
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 safe-area-bottom"
  >
    <div class="flex justify-around items-center h-16 rounded-2xl bg-card/95 backdrop-blur border border-border/80 shadow-lg shadow-slate-900/5 px-2">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1.5 rounded-xl text-[10px] transition-colors"
        :class="
          isActive(item.name)
            ? 'text-accent bg-accent/10'
            : 'text-text-muted hover:text-text-secondary'
        "
      >
        <Icon :name="item.icon" :size="20" />
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
