import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'
import type { Task } from '@/mock/tasks'

const MAX_DAILY_TASKS = 8

export function generateDailyPlan(date?: string) {
  const taskStore = useTaskStore()
  const goalStore = useGoalStore()
  const dailyStore = useDailyStore()

  const today = date || new Date().toISOString().slice(0, 10)

  const candidates: Task[] = []

  // 1. 延期任务优先
  candidates.push(...taskStore.tasks.filter((t) => t.status === 'deferred'))

  // 2. backlog 任务（活跃目标关联 或 高优先级）
  const activeGoalIds = goalStore.activeGoals.map((g) => g.id)
  candidates.push(...taskStore.tasks.filter((t) =>
    t.status === 'backlog' &&
    (activeGoalIds.includes(t.goalId || '') || t.priority === 'high')
  ))

  // 3. 排序：优先级 → 截止日
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  candidates.sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (p !== 0) return p
    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })

  // 4. 取前 N 个，写入 DailyPlan + 改 status=today
  const selected = candidates.slice(0, MAX_DAILY_TASKS)
  selected.forEach((t) => {
    dailyStore.addTaskToToday(t.id)
    taskStore.updateTask(t.id, {
      ...(t.status === 'deferred' ? { deferCount: 0 } : {}),
    })
  })

  return selected.length
}
