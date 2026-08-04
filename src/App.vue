<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
import MobileNav from '@/components/MobileNav.vue'
import { useAppStore } from '@/stores/app'
import { startReminderService, stopReminderService, requestNotificationPermission } from '@/services/reminders'
import { useHotkeys } from '@/composables/useHotkeys'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const store = useAppStore()
const router = useRouter()
useHotkeys(router)

function onResize() {
  store.setMobile(window.innerWidth < 768)
}

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
  requestNotificationPermission()
  startReminderService()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  stopReminderService()
})
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-bg text-text-primary">
    <Sidebar />
    <main class="h-dvh flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6">
      <router-view />
    </main>
    <MobileNav />
  </div>
</template>
