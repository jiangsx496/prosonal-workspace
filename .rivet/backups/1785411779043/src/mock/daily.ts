export interface DailyPlan {
  date: string
  taskIds: string[]
  habitIds: string[]
  summary: string
  createdAt: string
}

export const mockDailyPlans: DailyPlan[] = []
