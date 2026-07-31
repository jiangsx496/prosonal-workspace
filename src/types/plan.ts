/**
 * Plan 类型定义 — Goal 的执行计划层级结构
 *
 * 层级：Goal → Plan → Days[] → Blocks[] → taskIds[]（引用 TaskStore）
 *
 * 设计决策：
 * - Plan 嵌入 Goal（1:1 关系），不独立 Store
 * - Block 存 taskIds（引用 Task.id），Task 实体仍由 TaskStore 管理
 * - 字段结构与 PlanDraft 对齐，便于 AI 草稿落地转换
 */

export interface PlanBlock {
  id: string
  category: string          // '学习' | '项目' | '复盘' | '上午' 等
  time?: string             // 'HH:MM' 或 '上午'/'下午'
  taskIds: string[]         // 引用 TaskStore 中的 Task.id
}

export interface PlanDay {
  id: string
  day: number               // 第几天（1-based）
  date: string              // YYYY-MM-DD
  title: string             // 如 "Day1：JavaScript 作用域"
  blocks: PlanBlock[]
}

export interface Plan {
  startDate: string
  totalDays: number
  days: PlanDay[]
}

// ==== 查询工具函数 ====

/** 获取 Plan 中指定日期的 Day，找不到返回 null */
export function getDayByDate(plan: Plan | undefined, date: string): PlanDay | null {
  if (!plan) return null
  return plan.days.find((d) => d.date === date) || null
}

/** 获取 Plan 中今天的 Day */
export function getTodayDay(plan: Plan | undefined): PlanDay | null {
  const today = new Date().toISOString().slice(0, 10)
  return getDayByDate(plan, today)
}

/** 获取 Plan 中所有 taskId（扁平化） */
export function flattenPlanTaskIds(plan: Plan | undefined): string[] {
  if (!plan) return []
  return plan.days.flatMap((d) => d.blocks.flatMap((b) => b.taskIds))
}

/** 获取指定日期在 Plan 中的所有 taskId */
export function getTaskIdsByDate(plan: Plan | undefined, date: string): string[] {
  const day = getDayByDate(plan, date)
  if (!day) return []
  return day.blocks.flatMap((b) => b.taskIds)
}

/** 从 PlanDraft 的 DraftBlock 格式生成 Plan 的 Block id */
export function generatePlanId(prefix: string = 'pb'): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

/** 从指定 Plan 中移除某个 taskId 引用（任务删除时调用） */
export function removeTaskIdFromPlan(plan: Plan | undefined, taskId: string): void {
  if (!plan) return
  for (const day of plan.days) {
    for (const block of day.blocks) {
      const idx = block.taskIds.indexOf(taskId)
      if (idx !== -1) block.taskIds.splice(idx, 1)
    }
  }
}
