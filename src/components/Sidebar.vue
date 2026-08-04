<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import SearchModal from '@/components/SearchModal.vue'
import Icon from '@/components/Icon.vue'

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
  <aside
    class="hidden md:flex flex-col h-dvh bg-sidebar/95 backdrop-blur border-r border-border/80 shrink-0 transition-all duration-200"
    :class="store.sidebarCollapsed ? 'w-16' : 'w-56'"
  >
    <div class="flex items-center h-16 border-b border-border/80" :class="store.sidebarCollapsed ? 'justify-center px-2' : 'px-4'">
      <div class="flex items-center gap-2 min-w-0">
        <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white text-sm font-semibold shadow-sm">W</span>
        <div v-if="!store.sidebarCollapsed" class="min-w-0">
          <p class="text-sm font-semibold text-text-primary tracking-tight truncate">Workspace</p>
          <p class="text-[11px] text-text-muted truncate">Personal command center</p>
        </div>
      </div>
    </div>

    <!-- 全局搜索 -->
    <div class="px-2 pt-3 pb-1">
      <button
        class="w-full flex items-center rounded-xl text-sm text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors border border-transparent hover:border-border/70"
        :class="store.sidebarCollapsed ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2.5'"
        title="搜索"
        @click="showSearch = true"
      >
        <Icon name="search" :size="18" />
        <span v-if="!store.sidebarCollapsed" class="truncate">搜索...</span>
        <kbd v-if="!store.sidebarCollapsed" class="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-card-hover border border-border/70 text-text-muted">⌘K</kbd>
      </button>
    </div>

    <nav class="flex-1 py-3 px-2 space-y-1">
      <router-link
        v-for="item in navItems"
        :key="item.name"
        :to="item.path"
        class="flex items-center rounded-xl text-sm transition-all border border-transparent"
        :class="[
          store.sidebarCollapsed ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2.5',
          isActive(item.name)
            ? 'bg-accent/10 text-accent font-medium shadow-sm'
            : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'
        ]"
      >
        <Icon :name="item.icon" :size="18" />
        <span v-if="!store.sidebarCollapsed" class="truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="px-2 pb-4">
      <button
        class="w-full flex items-center justify-center p-2.5 rounded-xl text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors border border-border/70"
        @click="store.toggleSidebar()"
      >
        <Icon :name="store.sidebarCollapsed ? 'chevronRight' : 'chevronLeft'" :size="16" />
      </button>
    </div>

    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </aside>
</template>
