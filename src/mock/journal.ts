export interface Journal {
  id: string
  date: string
  content: string
  completedTaskIds: string[]
  completedHabitIds: string[]
  mood: '😊'|'😐'|'😤'|'🎉'|'😴'
  createdAt: string
}

export const moodOptions = ['😊','😐','😤','🎉','😴'] as const

export const mockJournals: Journal[] = []
