import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '@/stores/tasks'
import { todayLocal } from '@/utils/date'

describe('todayTasks 今日任务闭环', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('安排了今天的任务（scheduledDate=today，未延期）应出现在今日任务', () => {
    const taskStore = useTaskStore()
    const today = todayLocal()

    taskStore.addTask({
      id: 't1', title: '安排了今天的任务', project: '', goalId: null,
      category: 'work', priority: 'medium', status: 'backlog',
      source: 'manual', dueDate: today, scheduledDate: today,
      deferCount: 0, estimatedMinutes: 30, createdAt: today,
    } as any)

    expect(taskStore.todayTasks.some((t) => t.id === 't1')).toBe(true)
    // 任务池「今日」筛选应同样包含
    taskStore.setFilter('today')
    expect(taskStore.filteredTasks.some((t) => t.id === 't1')).toBe(true)
  })

  it('已延期的任务（即使 scheduledDate=today）不应出现在今日任务', () => {
    const taskStore = useTaskStore()
    const today = todayLocal()

    taskStore.addTask({
      id: 't2', title: '延期的任务', project: '', goalId: null,
      category: 'work', priority: 'medium', status: 'deferred',
      source: 'manual', dueDate: today, scheduledDate: today,
      deferCount: 1, estimatedMinutes: 30, createdAt: today,
    } as any)

    expect(taskStore.todayTasks.some((t) => t.id === 't2')).toBe(false)
  })

  it('进行中的任务应出现在今日任务', () => {
    const taskStore = useTaskStore()
    const today = todayLocal()

    taskStore.addTask({
      id: 't3', title: '进行中的任务', project: '', goalId: null,
      category: 'work', priority: 'medium', status: 'doing',
      source: 'manual', dueDate: today, scheduledDate: '',
      deferCount: 0, estimatedMinutes: 30, createdAt: today,
    } as any)

    expect(taskStore.todayTasks.some((t) => t.id === 't3')).toBe(true)
  })
})
