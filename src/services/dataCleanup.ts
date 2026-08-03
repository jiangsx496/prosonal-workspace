import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'

export interface CleanupResult {
  orphanTasksDetached: number
  orphanDailyRefsRemoved: number
  orphanPlanRefsRemoved: number
}

/**
 * 清理无效数据：
 * 1. Task.goalId 指向不存在的 Goal → 解除关联（goalId = null）
 * 2. DailyPlan.taskIds 包含不存在的 Task → 移除引用
 * 3. Goal.plan（days→blocks→taskIds）包含不存在的 Task → 移除引用
 * 4. Goal 没有任何关联任务 → 保留（不处理）
 */
export function cleanupOrphanData(): CleanupResult {
  const goalStore = useGoalStore()
  const taskStore = useTaskStore()
  const dailyStore = useDailyStore()

  const result: CleanupResult = {
    orphanTasksDetached: 0,
    orphanDailyRefsRemoved: 0,
    orphanPlanRefsRemoved: 0,
  }

  const goalIds = new Set(goalStore.goals.map((g) => g.id))
  const taskIds = new Set(taskStore.tasks.map((t) => t.id))

  // 1. 解除孤儿任务的 goalId 关联
  taskStore.tasks.forEach((t) => {
    if (t.goalId && !goalIds.has(t.goalId)) {
      taskStore.updateTask(t.id, { goalId: null })
      result.orphanTasksDetached++
    }
  })

  // 2. 清理 daily plan 中指向不存在 task 的引用
  dailyStore.plans.forEach((p) => {
    const before = p.taskIds.length
    p.taskIds = p.taskIds.filter((id) => taskIds.has(id))
    result.orphanDailyRefsRemoved += before - p.taskIds.length
  })

  // 3. 清理 Goal.plan 中指向不存在 task 的引用
  goalStore.goals.forEach((g) => {
    if (!g.plan) return
    for (const day of g.plan.days) {
      for (const block of day.blocks) {
        const before = block.taskIds.length
        block.taskIds = block.taskIds.filter((id) => taskIds.has(id))
        result.orphanPlanRefsRemoved += before - block.taskIds.length
      }
    }
  })

  return result
}
