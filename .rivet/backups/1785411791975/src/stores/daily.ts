import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { mockDailyPlans, type DailyPlan } from '@/mock/daily'

const STORAGE_KEY = 'pw-daily'

function load(): DailyPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DailyPlan[]
  } catch { /* ignore */ }
  return [...mockDailyPlans]
}

function save(val: DailyPlan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

export const useDailyStore = defineStore('daily', () => {
  const plans = ref<DailyPlan[]>(load())
  const today = computed(() => new Date().toISOString().slice(0, 10))

  watch(plans, (val) => save(val), { deep: true })

  const todayPlan = computed(() =>
    plans.value.find((p) => p.date === today.value) || {
      date: today.value,
      taskIds: [],
      habitIds: [],
      summary: '',
      createdAt: new Date().toISOString(),
    }
  )

  function addTaskToToday(taskId: string) {
    addTaskToDate(taskId, today.value)
  }

  /** 将任务添加到指定日期的 DailyPlan */
  function addTaskToDate(taskId: string, date: string) {
    let p = plans.value.find((p) => p.date === date)
    if (!p) {
      p = { date, taskIds: [], habitIds: [], summary: '', createdAt: new Date().toISOString() }
      plans.value.push(p)
    }
    if (!p.taskIds.includes(taskId)) p.taskIds.push(taskId)
  }

  function removeTaskFromToday(taskId: string) {
    const p = plans.value.find((p) => p.date === today.value)
    if (p) p.taskIds = p.taskIds.filter((id) => id !== taskId)
  }

  /** 从所有日期计划中移除指定 taskId（任务删除时调用） */
  function removeTaskFromAllPlans(taskId: string) {
    plans.value.forEach((p) => {
      if (p.taskIds.includes(taskId)) {
        p.taskIds = p.taskIds.filter((id) => id !== taskId)
      }
    })
  }

  function updateSummary(text: string) {
    let p = plans.value.find((p) => p.date === today.value)
    if (!p) {
      p = { date: today.value, taskIds: [], habitIds: [], summary: '', createdAt: new Date().toISOString() }
      plans.value.push(p)
    }
    p.summary = text
  }

  return { plans, todayPlan, addTaskToToday, addTaskToDate, removeTaskFromToday, removeTaskFromAllPlans, updateSummary, today }
})
