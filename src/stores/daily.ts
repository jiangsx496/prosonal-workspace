import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { watchPersist } from '@/utils/persist'
import { generateId } from '@/utils/id'
import { mockDailyPlans, type DailyPlan } from '@/mock/daily'

const STORAGE_KEY = 'pw-daily'

function load(): DailyPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as any[]
      // 数据规范化：旧版本数据可能缺字段，补齐默认值避免消费方（删除/清理）崩溃
      const migrated = data.map((p) => ({
        // 旧数据无 id：云端同步推送需要稳定主键，自动补齐
        id: p.id || generateId(),
        date: p.date,
        taskIds: Array.isArray(p.taskIds) ? p.taskIds : [],
        habitIds: Array.isArray(p.habitIds) ? p.habitIds : [],
        summary: typeof p.summary === 'string' ? p.summary : '',
        createdAt: p.createdAt || new Date().toISOString(),
      }))
      // 迁移结果写回 localStorage：推送（collectLocalData）读的是 localStorage，
      // 只补内存 id 的话旧数据推送时仍是 null
      if (migrated.some((p, i) => p.id !== data[i]?.id)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      }
      return migrated
    }
  } catch { /* ignore */ }
  return [...mockDailyPlans]
}



export const useDailyStore = defineStore('daily', () => {
  const plans = ref<DailyPlan[]>(load())
  const today = computed(() => todayLocal())

  watchPersist(plans, STORAGE_KEY)

  const todayPlan = computed(() =>
    plans.value.find((p) => p.date === today.value) || {
      id: generateId(),
      date: today.value,
      taskIds: [],
      habitIds: [],
      summary: '',
      focusMinutes: 0,
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
      p = { id: generateId(), date, taskIds: [], habitIds: [], summary: '', createdAt: new Date().toISOString() }
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
      p = { id: generateId(), date: today.value, taskIds: [], habitIds: [], summary: '', createdAt: new Date().toISOString() }
      plans.value.push(p)
    }
    p.summary = text
  }

  /** 获取指定日期的 DailyPlan（复盘页面用） */
  function getPlanByDate(date: string): DailyPlan {
    return plans.value.find((p) => p.date === date) || {
      id: generateId(),
      date,
      taskIds: [],
      habitIds: [],
      summary: '',
      focusMinutes: 0,
      createdAt: new Date().toISOString(),
    }
  }

  return { plans, todayPlan, addTaskToToday, addTaskToDate, removeTaskFromToday, removeTaskFromAllPlans, updateSummary, getPlanByDate, today }
})
