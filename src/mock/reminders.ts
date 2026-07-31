export interface Reminder {
  id: string
  type: 'task' | 'goal' | 'habit' | 'system'
  targetId: string | null
  message: string
  time: string
  enabled: boolean
  notified: boolean
  createdAt: string
}

export const mockReminders: Reminder[] = []
