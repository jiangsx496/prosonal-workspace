<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
import MobileNav from '@/components/MobileNav.vue'
import { useAppStore } from '@/stores/app'
import { startReminderService, stopReminderService, requestNotificationPermission } from '@/services/reminders'
import { onMounted, onUnmounted } from 'vue'

const store = useAppStore()

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
  <div class="flex h-screen overflow-hidden bg-[--color-bg]">
    <Sidebar />
    <main class="flex-1 overflow-y-auto p-4 md:p-8">
      <router-view />
    </main>
    <MobileNav />
  </div>
</template>
