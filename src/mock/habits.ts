export interface Habit {
  id: string
  name: string
  category: '运动' | '学习' | '生活' | '工作'
  frequency: 'daily' | 'weekly'
  target: string
  completedDates: string[]
  streak: number
  active: boolean
  createdAt: string
}

export const habitCategoryMeta: Record<string, { label: string; icon: string }> = {
  '运动': { label: '运动', icon: '🏃' },
  '学习': { label: '学习', icon: '📚' },
  '生活': { label: '生活', icon: '🏠' },
  '工作': { label: '工作', icon: '💼' },
}

export const mockHabits: Habit[] = [
  { id: 'h1', name: '运动 30 分钟', category: '运动', frequency: 'daily', target: '30 分钟', completedDates: ['2025-07-27'], streak: 3, active: true, createdAt: '2025-07-01' },
  { id: 'h2', name: '阅读 20 页', category: '学习', frequency: 'daily', target: '20 页', completedDates: ['2025-07-25','2025-07-26','2025-07-27'], streak: 7, active: true, createdAt: '2025-07-01' },
  { id: 'h3', name: '学习 1 小时', category: '学习', frequency: 'daily', target: '1 小时', completedDates: ['2025-07-27'], streak: 5, active: true, createdAt: '2025-07-01' },
  { id: 'h4', name: '英语单词 50 个', category: '学习', frequency: 'daily', target: '50 个', completedDates: [], streak: 0, active: true, createdAt: '2025-07-15' },
]
