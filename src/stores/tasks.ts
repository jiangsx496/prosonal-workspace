import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { todayLocal } from '@/utils/date'
import { mockTasks, type Task, projects } from '@/mock/tasks'
import { useDailyStore } from '@/stores/daily'
import { useGoalStore } from '@/stores/goals'

export type TaskFilter = 'all' | 'today' | 'doing' | 'done' | 'deferred'

const STORAGE_KEY = 'pw-tasks'

// 旧 status → 新 status 映射
const STATUS_MIGRATION: Record<string, Task['status']> = {
  'inbox': 'backlog', 'scheduled': 'backlog', 'todo': 'backlog', 'today': 'backlog',
  'in-progress': 'doing', 'backlog': 'backlog', 'done': 'done', 'deferred': 'deferred',
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as any[]
      return data.map((t) => ({
        ...t,
        category: t.category || 'work',
        scheduledDate: t.scheduledDate || '',
        source: t.source || 'manual',
        deferCount: t.deferCount || 0,
        estimatedMinutes: t.estimatedMinutes || 30,
        status: STATUS_MIGRATION[t.status] || 'backlog',
      })) as Task[]
    }
  } catch { /* ignore */ }
  return [...mockTasks]
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>(loadTasks())
  const filter = ref<TaskFilter>('all')

  watch(tasks, (val) => saveTasks(val), { deep: true })

  const today = computed(() => todayLocal())

  // 从 localStorage 读 DailyPlan 的今日 taskIds
  function getDailyPlanTaskIds(): string[] {
    try {
      const raw = localStorage.getItem('pw-daily')
      if (raw) {
        const plans = JSON.parse(raw)
        const found = plans.find((p: any) => p.date === today.value)
        return found ? found.taskIds : []
      }
    } catch { /* ignore */ }
    return []
  }

  const filteredTasks = computed(() => {
    const dailyIds = getDailyPlanTaskIds()
    switch (filter.value) {
      case 'today': return tasks.value.filter((t) => dailyIds.includes(t.id) || t.status === 'doing')
      case 'doing': return tasks.value.filter((t) => t.status === 'doing')
      case 'done': return tasks.value.filter((t) => t.status === 'done')
      case 'deferred': return tasks.value.filter((t) => t.status === 'deferred')
      default: return tasks.value
    }
  })

  const todayTasks = computed(() => {
    const dailyIds = getDailyPlanTaskIds()
    return tasks.value.filter((t) => dailyIds.includes(t.id) || t.status === 'doing')
  })

  const urgentToday = computed(() => {
    const dailyIds = getDailyPlanTaskIds()
    return tasks.value.filter((t) => dailyIds.includes(t.id) && t.priority === 'high')
  })

  const pendingCount = computed(() => {
    const dailyIds = getDailyPlanTaskIds()
    return tasks.value.filter((t) => dailyIds.includes(t.id) || t.status === 'doing').length
  })

  const deferredTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'deferred')
  )

  function addTask(task: Task) {
    tasks.value.unshift(task)
  }

  function removeTask(id: string) {
    // 同步清理 daily plan 和 goal plan 中对该 taskId 的引用
    const dailyStore = useDailyStore()
    dailyStore.removeTaskFromAllPlans(id)
    // 清理所有 Goal 的 Plan 中的 taskId 引用
    const t = tasks.value.find((t) => t.id === id)
    if (t?.goalId) {
      const goalStore = useGoalStore()
      goalStore.removeTaskIdFromGoalPlan(t.goalId, id)
    }
    tasks.value = tasks.value.filter((t) => t.id !== id)
  }

  function toggleTask(id: string) {
    const t = tasks.value.find((t) => t.id === id)
    if (!t) return
    if (t.status === 'done') {
      t.status = 'backlog'
      t.completedAt = null
    } else {
      t.status = 'done'
      t.completedAt = new Date().toISOString()
    }
  }

  function scheduleForToday(id: string) {
    const t = tasks.value.find((t) => t.id === id)
    if (t) { t.scheduledDate = today.value }
  }

  function deferTask(id: string) {
    const t = tasks.value.find((t) => t.id === id)
    if (t) { t.status = 'deferred'; t.deferCount++; t.deferredAt = new Date().toISOString() }
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) Object.assign(tasks.value[idx], patch)
  }

  function completeTask(id: string) {
    const t = tasks.value.find((t) => t.id === id)
    if (t) { t.status = 'done'; t.completedAt = new Date().toISOString() }
  }

  function restoreTask(id: string) {
    const t = tasks.value.find((t) => t.id === id)
    if (t) { t.status = 'backlog'; t.completedAt = null }
  }

  function setFilter(f: TaskFilter) {
    filter.value = f
  }

  /**
   * 任务状态显示优先级：done > deferred > overdue > normal
   * 用于列表渲染时的视觉状态判断（不修改原数据）
   */
  function taskDisplayStatus(task: Task): 'done' | 'deferred' | 'overdue' | 'normal' {
    if (task.status === 'done') return 'done'
    if (task.status === 'deferred') return 'deferred'
    // scheduledDate < 今天 且未完成 → 延期（不用 dueDate 判断每日任务）
    if (task.scheduledDate && task.scheduledDate < today.value) return 'overdue'
    return 'normal'
  }

  /** 获取指定日期完成的任务列表 */
  function tasksCompletedOn(date: string): Task[] {
    return tasks.value.filter((t) => t.completedAt?.slice(0, 10) === date)
  }

  /** 获取指定日期未完成的今日任务（scheduledDate 匹配但未 done） */
  function tasksUncompletedOn(date: string): Task[] {
    return tasks.value.filter((t) =>
      t.scheduledDate === date && t.status !== 'done'
    )
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  return {
    tasks, filter, filteredTasks, todayTasks, urgentToday, pendingCount, deferredTasks,
    addTask, removeTask, updateTask, toggleTask, completeTask, restoreTask,
    scheduleForToday, deferTask, setFilter, generateId, projects,
    taskDisplayStatus, tasksCompletedOn, tasksUncompletedOn,
  }
})
