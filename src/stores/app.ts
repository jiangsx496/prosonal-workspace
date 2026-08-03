import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system' | 'focus-dark' | 'warm-eye'

const THEME_CLASSES = ['dark', 'theme-focus-dark', 'theme-warm-eye']

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem('pw-theme')
    if (v === 'light' || v === 'dark' || v === 'system' || v === 'focus-dark' || v === 'warm-eye') return v
  } catch { /* ignore */ }
  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove(...THEME_CLASSES)
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'focus-dark') {
    root.classList.add('theme-focus-dark')
  } else if (theme === 'warm-eye') {
    root.classList.add('theme-warm-eye')
  } else {
    // system — follow OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const isMobile = ref(false)
  const theme = ref<Theme>(loadTheme())

  // 立即应用主题
  applyTheme(theme.value)

  // 监听主题变化
  watch(theme, (val) => {
    applyTheme(val)
    localStorage.setItem('pw-theme', val)
  })

  // 系统主题变化时自动同步
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') applyTheme('system')
    })
  }

  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setMobile(val: boolean) { isMobile.value = val }

  return { sidebarCollapsed, isMobile, theme, toggleSidebar, setMobile }
})
