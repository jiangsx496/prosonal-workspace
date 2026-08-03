import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'
import { useTaskStore } from '@/stores/tasks'

describe('deleteGoal 目标删除', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('旧数据 daily plan 缺 taskIds 字段时，删除目标仍应成功（不抛错、目标与关联任务均移除）', () => {
    const goalStore = useGoalStore()
    const dailyStore = useDailyStore()
    const taskStore = useTaskStore()

    // 模拟旧版本 localStorage 遗留数据：plan 无 taskIds 字段
    dailyStore.plans = [
      { date: '2025-01-01', habitIds: [], summary: '', createdAt: '2025-01-01' } as any,
    ]

    const goalId = goalStore.generateId()
    goalStore.addGoal({
      id: goalId, title: '测试目标', description: '', category: '开发',
      startDate: '2025-01-01', deadline: '2025-02-01',
      progress: 0, priority: 'medium', status: 'active',
    } as any)

    const taskId = taskStore.generateId()
    taskStore.addTask({
      id: taskId, title: '关联任务', project: '', goalId,
      category: 'work', priority: 'medium', status: 'backlog',
      source: 'manual', dueDate: '2025-01-01', scheduledDate: '',
      deferCount: 0, createdAt: '2025-01-01',
    } as any)

    // cascade 删除不应被旧数据打断
    expect(() => goalStore.deleteGoal(goalId)).not.toThrow()
    expect(goalStore.goals.find((g) => g.id === goalId)).toBeUndefined()
    expect(taskStore.tasks.find((t) => t.id === taskId)).toBeUndefined()
  })
})
