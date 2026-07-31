import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FocusSession {
  id: string
  taskId: string | null
  goalId: string | null
  duration: number       // 实际专注时长（秒）
  startTime: string      // ISO
  endTime: string        // ISO
  status: 'completed' | 'cancelled'
  createdAt: string      // ISO
}

const STORAGE_KEY = 'pw-focus'

function load(): FocusSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as FocusSession[]
  } catch { /* ignore */ }
  return []
}

function save(val: FocusSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export const useFocusStore = defineStore('focus', () => {
  const sessions = ref<FocusSession[]>(load())

  // 持久化（手动在 addSession/removeSession 时调用，避免 watch 开销）

  // ==== 今日统计 ====
  const todaySessions = computed(() =>
    sessions.value.filter((s) => s.createdAt.slice(0, 10) === todayStr())
  )

  const todayFocusSeconds = computed(() =>
    todaySessions.value
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + s.duration, 0)
  )

  const todayFocusMinutes = computed(() => Math.round(todayFocusSeconds.value / 60))

  function formatFocusTime(): string {
    const mins = todayFocusMinutes.value
    if (mins === 0) return '0 分钟'
    if (mins < 60) return `${mins} 分钟`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
  }

  // ==== Session CRUD ====
  function generateId(): string {
    return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  function addSession(session: FocusSession) {
    sessions.value.unshift(session)
    save(sessions.value)
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    save(sessions.value)
  }

  return {
    sessions, todaySessions, todayFocusSeconds, todayFocusMinutes,
    formatFocusTime, addSession, removeSession, generateId,
  }
})
