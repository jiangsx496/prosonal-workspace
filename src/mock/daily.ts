export interface DailyPlan {
  date: string
  taskIds: string[]
  habitIds: string[]
  summary: string
  focusMinutes?: number
  createdAt: string
}

export const mockDailyPlans: DailyPlan[] = []
