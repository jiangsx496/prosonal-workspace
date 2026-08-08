<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
import MobileNav from '@/components/MobileNav.vue'
import SearchModal from '@/components/SearchModal.vue'
import Icon from '@/components/Icon.vue'
import { useAppStore } from '@/stores/app'
import { startReminderService, stopReminderService, requestNotificationPermission } from '@/services/reminders'
import { useHotkeys } from '@/composables/useHotkeys'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()
const showSearch = ref(false)
useHotkeys(router)

function onResize() {
  store.setMobile(window.innerWidth < 768)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
  if (e.key === 'Escape' && showSearch.value) {
    showSearch.value = false
  }
}

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKeydown)
  requestNotificationPermission()
  startReminderService()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKeydown)
  stopReminderService()
})
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-bg text-text-primary">
    <Sidebar @search="showSearch = true" />
    <main class="h-dvh flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
      <!-- 移动端全局搜索入口（桌面端由侧边栏提供） -->
      <button
        class="md:hidden w-full flex items-center gap-2.5 rounded-xl mb-3 px-3 py-2.5 text-sm text-text-muted bg-card/60 hover:bg-card-hover hover:text-text-primary transition-colors border border-border/70"
        title="搜索"
        @click="showSearch = true"
      >
        <Icon name="search" :size="18" />
        <span class="truncate">搜索...</span>
      </button>
      <router-view />
    </main>
    <MobileNav />
    <SearchModal v-if="showSearch" @close="showSearch = false" />
  </div>
</template>
