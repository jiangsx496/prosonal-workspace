import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todayLocal, localDateFromISO } from '@/utils/date'
import { generateId as genId } from '@/utils/id'
import { useTaskStore } from '@/stores/tasks'

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
const FOCUS_DEFAULT = 25 * 60  // 25 分钟（秒）

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

const todayStr = () => todayLocal()

export const useFocusStore = defineStore('focus', () => {
  const sessions = ref<FocusSession[]>(load())

  // ==== 计时器状态 ====
  const remaining = ref(FOCUS_DEFAULT)
  const running = ref(false)
  const activeTaskId = ref<string | null>(null)
  const activeStartTime = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  const display = computed(() => {
    const m = Math.floor(remaining.value / 60)
    const s = remaining.value % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  })

  const isIdle = computed(() => !running.value && remaining.value === FOCUS_DEFAULT)
  const isActive = computed(() => running.value || remaining.value < FOCUS_DEFAULT)

  // ==== 今日统计 ====
  const todaySessions = computed(() =>
    sessions.value.filter((s) => localDateFromISO(s.createdAt) === todayStr())
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

  // ==== 计时器内部控制 ====
  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        completeFocus()
      }
    }, 1000)
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null }
  }

  function generateId(): string {
    return genId('f')
  }

  function addSession(session: FocusSession) {
    sessions.value.unshift(session)
    save(sessions.value)
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    save(sessions.value)
  }

  // ==== 公开操作 ====
  function startFocus(taskId?: string) {
    activeTaskId.value = taskId || null
    activeStartTime.value = new Date().toISOString()
    remaining.value = FOCUS_DEFAULT
    running.value = true
    startTimer()
  }

  function pauseFocus() {
    running.value = false
    stopTimer()
  }

  function resumeFocus() {
    running.value = true
    startTimer()
  }

  function completeFocus() {
    stopTimer()
    const elapsed = FOCUS_DEFAULT - remaining.value
    if (elapsed > 0) {
      const taskStore = useTaskStore()
      const goalId = activeTaskId.value
        ? (taskStore.tasks.find((t) => t.id === activeTaskId.value)?.goalId || null)
        : null
      const nowIso = new Date().toISOString()
      addSession({
        id: generateId(),
        taskId: activeTaskId.value,
        goalId,
        duration: elapsed,
        startTime: activeStartTime.value || nowIso,
        endTime: nowIso,
        status: 'completed',
        createdAt: nowIso,
      })
    }
    resetState()
  }

  function cancelFocus() {
    stopTimer()
    resetState()
  }

  function resetState() {
    running.value = false
    remaining.value = FOCUS_DEFAULT
    activeTaskId.value = null
    activeStartTime.value = null
  }

  return {
    // 状态
    sessions, remaining, running, activeTaskId,
    display, isIdle, isActive,
    todaySessions, todayFocusSeconds, todayFocusMinutes,
    // 方法
    formatFocusTime, startFocus, pauseFocus, resumeFocus,
    completeFocus, cancelFocus, addSession, removeSession, generateId,
  }
})
