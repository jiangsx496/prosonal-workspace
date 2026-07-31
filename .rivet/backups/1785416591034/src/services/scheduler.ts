import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'
import type { Task } from '@/mock/tasks'

const MAX_DAILY_TASKS = 8

/**
 * 多因子排序权重（数值越小越靠前）：
 * 1. 延期任务：最高优先（0 分桶）
 * 2. 目标截止紧迫度：关联目标截止日越近越优先
 * 3. 任务优先级：high > medium > low
 * 4. 任务截止日：越近越优先
 */
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** 计算任务关联目标的剩余天数，无目标返回 Infinity */
function goalDaysLeft(task: Task, goalDeadlines: Map<string, string>): number {
  if (!task.goalId) return Infinity
  const deadline = goalDeadlines.get(task.goalId)
  if (!deadline) return Infinity
  const d = new Date(deadline)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - t.getTime()) / 86400000)
}

export function generateDailyPlan(date?: string) {
  const taskStore = useTaskStore()
  const goalStore = useGoalStore()
  const dailyStore = useDailyStore()

  const today = date || new Date().toISOString().slice(0, 10)

  // 预构建目标截止日 lookup
  const goalDeadlines = new Map<string, string>()
  goalStore.goals.forEach((g) => goalDeadlines.set(g.id, g.deadline))

  // 候选池：backlog + deferred 任务
  const candidates: Task[] = taskStore.tasks.filter((t) =>
    t.status === 'backlog' || t.status === 'deferred'
  )

  // 多因子排序
  candidates.sort((a, b) => {
    // 1. 延期任务优先（deferred < backlog）
    const aDeferred = a.status === 'deferred' ? 0 : 1
    const bDeferred = b.status === 'deferred' ? 0 : 1
    if (aDeferred !== bDeferred) return aDeferred - bDeferred

    // 2. 目标截止紧迫度（剩余天数升序，Infinity 排最后）
    const aGoalDays = goalDaysLeft(a, goalDeadlines)
    const bGoalDays = goalDaysLeft(b, goalDeadlines)
    if (aGoalDays !== bGoalDays) return aGoalDays - bGoalDays

    // 3. 任务优先级
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (p !== 0) return p

    // 4. 延期次数（越多越靠前）
    const dc = (b.deferCount || 0) - (a.deferCount || 0)
    if (dc !== 0) return dc

    // 5. 任务截止日
    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })

  // 取前 N 个，写入 DailyPlan
  const selected = candidates.slice(0, MAX_DAILY_TASKS)
  selected.forEach((t) => {
    dailyStore.addTaskToToday(t.id)
    // 延期任务恢复
    if (t.status === 'deferred') {
      taskStore.updateTask(t.id, { deferCount: 0 })
    }
  })

  return selected.length
}

/** 导出排序函数供 Execute 页面内联排序使用，保证一致性 */
export function sortTasksByPriority(tasks: Task[], goalDeadlines: Map<string, string>): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. 目标截止紧迫度
    const aGoalDays = goalDaysLeft(a, goalDeadlines)
    const bGoalDays = goalDaysLeft(b, goalDeadlines)
    if (aGoalDays !== bGoalDays) return aGoalDays - bGoalDays

    // 2. 任务优先级
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (p !== 0) return p

    // 3. 延期次数（越多越靠前）
    const dc = (b.deferCount || 0) - (a.deferCount || 0)
    if (dc !== 0) return dc

    // 4. 任务截止日
    return (a.dueDate || '').localeCompare(b.dueDate || '')
  })
}
