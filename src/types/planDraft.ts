/**
 * 统一层级 PlanDraft 类型定义
 *
 * 层级结构：Goal → Days → Blocks → Tasks
 * 取代 mock/planDraft.ts 和 stores/plans.ts 中的两套不兼容定义
 */

export type Priority = 'high' | 'medium' | 'low'

/** AI 内容分类过滤：只有 task 才进入 TaskStore */
export type ContentCategory = 'task' | 'note' | 'review'

/** 草稿中的任务（最底层） */
export interface DraftTask {
  id: string
  title: string
  priority: Priority
  selected: boolean           // 用户可勾选/取消
  category: ContentCategory   // AI 分类标记：只有 'task' 才进入 TaskStore
  estimatedMinutes?: number   // AI 估算的完成时间（分钟）
}

/** 时间块（中间层：学习/项目/复盘等） */
export interface DraftBlock {
  id: string
  category: string            // '学习' | '项目' | '复盘' | '其他'
  time?: string               // 'HH:MM' 可选
  tasks: DraftTask[]
}

/** 每日计划（Day 层） */
export interface DraftDay {
  id: string
  day: number                 // 第几天（1-based）
  date: string                // YYYY-MM-DD
  title: string               // 如 "Day1：认识项目结构"
  blocks: DraftBlock[]
}

/** PlanDraft（顶层：目标 + 天） */
export interface PlanDraft {
  id: string
  source: 'file' | 'text' | 'image'
  goal: {
    title: string
    description: string
  }
  days: DraftDay[]
  startDate: string
  totalDays: number
  createdAt: string
}

// ==== 便捷计算函数 ====

/** 草稿中所有任务的扁平视图 */
export function flattenTasks(draft: PlanDraft): DraftTask[] {
  return draft.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks))
}

/** 某一天的所有任务 */
export function dayTasks(draft: PlanDraft, day: number): DraftTask[] {
  return draft.days.find((d) => d.day === day)?.blocks.flatMap((b) => b.tasks) || []
}

import { generateId } from '@/utils/id'

/** 生成草稿内部 ID */
export function generateDraftId(prefix: string = 'dt'): string {
  return generateId(prefix)
}

/** 计算从基准日偏移 N 天后的日期（本地时区，避免 UTC 偏移） */
export function computeDate(base: string, addDays: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + addDays)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
