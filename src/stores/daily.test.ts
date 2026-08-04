import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDailyStore } from '@/stores/daily'

// node 测试环境无 localStorage，提供轻量 mock（store 的 load/持久化依赖它）
const lsStore = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => lsStore.get(k) ?? null,
  setItem: (k: string, v: string) => { lsStore.set(k, v) },
  removeItem: (k: string) => { lsStore.delete(k) },
}

describe('DailyPlan id 完整性（云端同步推送需要稳定主键）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    lsStore.clear()
  })

  it('addTaskToDate 创建的 plan 带 id', () => {
    const daily = useDailyStore()
    daily.addTaskToDate('t1', '2026-08-05')
    const p = daily.plans.find((x) => x.date === '2026-08-05')
    expect(p?.id).toBeTruthy()
  })

  it('updateSummary 创建的 plan 带 id', () => {
    const daily = useDailyStore()
    daily.updateSummary('今日总结')
    expect(daily.todayPlan.id).toBeTruthy()
  })

  it('旧数据（无 id）加载时自动补 id', () => {
    localStorage.setItem(
      'pw-daily',
      JSON.stringify([{ date: '2025-01-01', taskIds: [], habitIds: [], summary: '', createdAt: '2025-01-01' }])
    )
    const daily = useDailyStore()
    expect(daily.plans[0].id).toBeTruthy()
  })

  it('旧数据迁移的 id 必须写回 localStorage（推送读 localStorage，只改内存不够）', () => {
    localStorage.setItem(
      'pw-daily',
      JSON.stringify([{ date: '2025-01-01', taskIds: [], habitIds: [], summary: '', createdAt: '2025-01-01' }])
    )
    useDailyStore()
    const stored = JSON.parse(localStorage.getItem('pw-daily')!)
    expect(stored[0].id).toBeTruthy()
  })
})
