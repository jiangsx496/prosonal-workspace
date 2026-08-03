/**
 * 间隔复习算法（简化版艾宾浩斯）
 *
 * 根据当前掌握度和复习次数计算下次复习日期。
 */

import { computeDateLocal } from './date'

export type Mastery = 'new' | 'learning' | 'familiar' | 'mastered'

/** 间隔天数表：按复习次数映射 */
const INTERVAL_DAYS: Record<number, number> = {
  0: 1,   // new → 首次学习后 1 天
  1: 1,   // 第 1 次复习 → 1 天后
  2: 3,   // 第 2 次 → 3 天后
  3: 7,   // 第 3 次 → 7 天后
  4: 14,  // 第 4 次 → 14 天后
}

/** 最大间隔天数 */
const MAX_INTERVAL = 30

/** 根据复习次数计算下次复习日期 */
export function nextReviewDate(reviewCount: number, fromDate: string = new Date().toISOString().slice(0, 10)): string {
  const interval = INTERVAL_DAYS[reviewCount] ?? MAX_INTERVAL
  return computeDateLocal(fromDate, interval)
}

/** 根据复习次数计算掌握度 */
export function masteryFromCount(reviewCount: number): Mastery {
  if (reviewCount === 0) return 'new'
  if (reviewCount <= 2) return 'learning'
  if (reviewCount <= 4) return 'familiar'
  return 'mastered'
}

/** 掌握度 → 显示标签 */
export const MASTERY_LABELS: Record<Mastery, string> = {
  new: '未学',
  learning: '学习中',
  familiar: '熟悉',
  mastered: '已掌握',
}

/** 掌握度 → 颜色 class */
export const MASTERY_COLORS: Record<Mastery, string> = {
  new: 'text-text-muted',
  learning: 'text-amber-500',
  familiar: 'text-blue-500',
  mastered: 'text-green-500',
}

/** 掌握度 → 背景色 class */
export const MASTERY_BG: Record<Mastery, string> = {
  new: 'bg-gray-100 text-text-muted',
  learning: 'bg-amber-50 text-amber-700',
  familiar: 'bg-blue-50 text-blue-700',
  mastered: 'bg-green-50 text-green-700',
}
