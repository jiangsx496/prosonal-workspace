export interface DailyPlan {
  /** 云端同步主键（推送 upsert onConflict 需要稳定 id） */
  id: string
  date: string
  taskIds: string[]
  habitIds: string[]
  summary: string
  focusMinutes?: number
  createdAt: string
}

export const mockDailyPlans: DailyPlan[] = []
