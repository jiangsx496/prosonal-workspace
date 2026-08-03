import { describe, it, expect } from 'vitest'
import { localDateStr, todayLocal, computeDateLocal } from './date'

describe('localDateStr', () => {
  it('格式化本地日期为 YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 5, 14, 12, 0, 0))).toBe('2026-06-14')
  })

  it('凌晨 01:00 不偏移（UTC+8 时区下 toISOString 会取到昨天）', () => {
    // 本地时间构造：2026-06-14 01:00
    const d = new Date(2026, 5, 14, 1, 0, 0)
    expect(localDateStr(d)).toBe('2026-06-14')
    // 对照：在 UTC+8（本项目目标时区）下，toISOString 返回 2026-06-13（缺陷行为）
    const tzOffset = -new Date(2026, 5, 14).getTimezoneOffset() / 60
    if (tzOffset === 8) {
      expect(d.toISOString().slice(0, 10)).toBe('2026-06-13')
    }
  })

  it('深夜 23:59 不偏移', () => {
    const d = new Date(2026, 5, 14, 23, 59, 0)
    expect(localDateStr(d)).toBe('2026-06-14')
  })

  it('无参数返回今天（格式正确）', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('computeDateLocal', () => {
  it('正向偏移', () => {
    expect(computeDateLocal('2026-06-14', 1)).toBe('2026-06-15')
  })

  it('负向偏移', () => {
    expect(computeDateLocal('2026-06-14', -1)).toBe('2026-06-13')
  })

  it('跨年', () => {
    expect(computeDateLocal('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('非闰年 2 月', () => {
    expect(computeDateLocal('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('闰年 2 月', () => {
    expect(computeDateLocal('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('零偏移返回原值', () => {
    expect(computeDateLocal('2026-06-14', 0)).toBe('2026-06-14')
  })
})
