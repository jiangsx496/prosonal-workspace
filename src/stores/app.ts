import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const isMobile = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setMobile(val: boolean) {
    isMobile.value = val
  }

  return { sidebarCollapsed, isMobile, toggleSidebar, setMobile }
})
