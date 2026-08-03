import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { todayLocal, localDateFromISO } from '@/utils/date'
import { generateId as genId } from '@/utils/id'
import { useTaskStore } from '@/stores/tasks'
import { playCompleteSound, playBreakSound, initAudioContext } from '@/utils/sound'

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

export interface FocusConfig {
  focusDuration: number    // 专注时长（分钟），默认 25
  shortBreak: number       // 短休时长（分钟），默认 5
  longBreak: number        // 长休时长（分钟），默认 15
  longBreakInterval: number // 每完成几次专注后长休，默认 4
  autoStartBreak: boolean  // 专注完成自动开始休息，默认 false
  soundEnabled: boolean    // 完成音效，默认 true
}

export type FocusPhase = 'focus' | 'short-break' | 'long-break'

const STORAGE_KEY = 'pw-focus'
const CONFIG_KEY = 'pw-focus-config'
const DEFAULT_CONFIG: FocusConfig = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreak: false,
  soundEnabled: true,
}

function loadSessions(): FocusSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as FocusSession[]
  } catch { /* ignore */ }
  return []
}

function loadConfig(): FocusConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG
}

function saveSessions(val: FocusSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

function saveConfig(val: FocusConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(val))
}

const todayStr = () => todayLocal()

/** 根据 phase 和 config 获取时长（秒） */
function durationForPhase(phase: FocusPhase, config: FocusConfig): number {
  switch (phase) {
    case 'focus': return config.focusDuration * 60
    case 'short-break': return config.shortBreak * 60
    case 'long-break': return config.longBreak * 60
  }
}

export const useFocusStore = defineStore('focus', () => {
  const sessions = ref<FocusSession[]>(loadSessions())
  const config = ref<FocusConfig>(loadConfig())

  // ==== 计时器状态 ====
  const phase = ref<FocusPhase>('focus')
  const remaining = ref(durationForPhase('focus', config.value))
  const running = ref(false)
  const activeTaskId = ref<string | null>(null)
  const activeStartTime = ref<string | null>(null)
  const completedFocusCount = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const currentDuration = computed(() => durationForPhase(phase.value, config.value))

  const display = computed(() => {
    const m = Math.floor(remaining.value / 60)
    const s = remaining.value % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  })

  const isIdle = computed(() => !running.value && remaining.value === currentDuration.value)
  const isActive = computed(() => running.value || remaining.value < currentDuration.value)

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

  // ==== config 持久化 ====
  watch(config, (val) => saveConfig(val), { deep: true })

  // ==== document.title 同步（F9）====
  watch([running, remaining, phase], () => {
    if (running.value) {
      const icon = phase.value === 'focus' ? '🍅' : '☕'
      document.title = `${icon} ${display.value} | Personal Workspace`
    } else {
      document.title = 'Personal Workspace'
    }
  })

  // ==== 计时器内部控制 ====
  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        handlePhaseComplete()
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
    saveSessions(sessions.value)
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    saveSessions(sessions.value)
  }

  function updateConfig(partial: Partial<FocusConfig>) {
    config.value = { ...config.value, ...partial }
    if (isIdle.value) {
      remaining.value = durationForPhase(phase.value, config.value)
    }
  }

  // ==== 阶段完成处理 ====
  function handlePhaseComplete() {
    stopTimer()

    if (phase.value === 'focus') {
      // 记录专注 session
      const elapsed = currentDuration.value - remaining.value
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
      completedFocusCount.value++

      // 音效 + 通知
      if (config.value.soundEnabled) {
        initAudioContext()
        playCompleteSound()
      }
      sendNotification('🍅 专注完成！', `完成了 ${config.value.focusDuration} 分钟专注，休息一下吧。`)

      // 进入休息阶段
      const isLongBreak = completedFocusCount.value % config.value.longBreakInterval === 0
      enterPhase(isLongBreak ? 'long-break' : 'short-break')
    } else {
      // 休息完成
      if (config.value.soundEnabled) {
        playBreakSound()
      }
      sendNotification('☕ 休息结束', '准备好开始下一轮专注了吗？')
      enterPhase('focus')
    }
  }

  function enterPhase(newPhase: FocusPhase) {
    phase.value = newPhase
    remaining.value = durationForPhase(newPhase, config.value)

    if (newPhase === 'focus') {
      // 进入专注阶段——重置任务关联或保持
      activeStartTime.value = new Date().toISOString()
    }

    if (config.value.autoStartBreak || newPhase === 'focus') {
      running.value = true
      startTimer()
    } else {
      running.value = false
    }
  }

  function sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' })
    }
  }

  // ==== 公开操作 ====
  function startFocus(taskId?: string) {
    initAudioContext()
    activeTaskId.value = taskId || null
    activeStartTime.value = new Date().toISOString()
    phase.value = 'focus'
    remaining.value = durationForPhase('focus', config.value)
    completedFocusCount.value = 0
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
    handlePhaseComplete()
  }

  function cancelFocus() {
    stopTimer()
    resetState()
  }

  function resetState() {
    running.value = false
    phase.value = 'focus'
    remaining.value = durationForPhase('focus', config.value)
    activeTaskId.value = null
    activeStartTime.value = null
  }

  function skipPhase() {
    handlePhaseComplete()
  }

  return {
    // 状态
    sessions, config, phase, remaining, running, activeTaskId, completedFocusCount,
    currentDuration, display, isIdle, isActive,
    todaySessions, todayFocusSeconds, todayFocusMinutes,
    // 方法
    formatFocusTime, startFocus, pauseFocus, resumeFocus,
    completeFocus, cancelFocus, skipPhase, updateConfig,
    addSession, removeSession, generateId,
  }
})
