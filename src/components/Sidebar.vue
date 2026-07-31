<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import SearchModal from '@/components/SearchModal.vue'

const store = useAppStore()
const route = useRoute()
const showSearch = ref(false)

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
  if (e.key === 'Escape' && showSearch.value) {
    showSearch.value = false
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const navItems = [
  { path: '/', name: 'execute', label: '今天', icon: '📊' },
  { path: '/inbox', name: 'inbox', label: '收集', icon: '📥' },
  { path: '/goals', name: 'goals', label: '目标', icon: '🎯' },
  { path: '/resources', name: 'resources', label: '资源', icon: '🗂️' },
  { path: '/review', name: 'review', label: '复盘', icon: '🔄' },
  { path: '/calendar', name: 'calendar', label: '日历', icon: '📅' },
]

const isActive = computed(() => (name: string) => route.name === name)
</script>

<template>
  <aside
    class="hidden md:flex flex-col w-56 h-screen bg-sidebar border-r border-border shrink-0 transition-all duration-200"
    :class="{ 'w-16': store.sidebarCollapsed }"
  >
    <div class="flex items-center h-14 px-4 border-b border-border">
      <span class="text-xl font-bold text-accent tracking-tight">
        <template v-if="!store.sidebarCollapsed">WS</template>
        <template v-else>W</template>
      </span>
    </div>

    <!-- 全局搜索 -->
    <div class="px-2 pb-1">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors"
        @click="showSearch = true"
      >
        <span class="text-lg flex-shrink-0">🔍</span>
        <span v-if="!store.sidebarCollapsed" class="truncate">搜索...</span>
        <kbd v-if="!store.sidebarCollapsed" class="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-card-hover border border-border text-text-muted">⌘K</kbd>
      </button>
    </div>

    <nav class="flex-1 py-3 px-2 space-y-0.5">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
        :class="
          isActive(item.name)
            ? 'bg-accent/10 text-accent'
            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
        "
      >
        <span class="text-lg flex-shrink-0">{{ item.icon }}</span>
        <span v-if="!store.sidebarCollapsed" class="truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="px-3 pb-4">
      <button
        class="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors"
        @click="store.toggleSidebar()"
      >
        <span class="text-sm">{{ store.sidebarCollapsed ? '▶' : '◀' }}</span>
      </button>
    </div>

    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </aside>
</template>
