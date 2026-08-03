/**
 * 本地时区日期工具
 *
 * 背景：`new Date().toISOString().slice(0, 10)` 返回 UTC 日期，
 * 在 UTC+8（本项目目标时区）下，本地凌晨 0:00–8:00 会取到「昨天」。
 * 所有日期键统一改用本模块的本地时区实现。
 */

/** 本地时区 YYYY-MM-DD（不用 toISOString，避免 UTC 偏移） */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天（本地时区） */
export function todayLocal(): string {
  return localDateStr()
}

/** 从基准日（YYYY-MM-DD，按本地解析）偏移 N 天 */
export function computeDateLocal(base: string, addDays: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + addDays)
  return localDateStr(dt)
}
