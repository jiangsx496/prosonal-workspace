import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { mockGoals, type Goal, goalCategories } from '@/mock/goals'
import { useTaskStore } from '@/stores/tasks'

const STORAGE_KEY = 'pw-goals'

function load(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as Goal[]
      // 自动标记过期 + priority 迁移
      const today = new Date().toISOString().slice(0, 10)
      return data.map((g) => ({
        ...g,
        priority: g.priority || 'medium',
        status: g.status === 'active' && g.deadline < today ? ('expired' as const) : g.status,
      }))
    }
  } catch { /* ignore */ }
  return [...mockGoals]
}

function save(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
}

export const useGoalStore = defineStore('goals', () => {
  const goals = ref<Goal[]>(load())

  watch(goals, (val) => save(val), { deep: true })

  const activeGoals = computed(() => goals.value.filter((g) => g.status === 'active'))
  const completedGoals = computed(() => goals.value.filter((g) => g.status === 'completed'))
  const expiringSoon = computed(() => {
    const today = new Date()
    const week = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)
    return activeGoals.value.filter((g) => g.deadline <= week)
  })
  const expiredGoals = computed(() => goals.value.filter((g) => g.status === 'expired'))

  function addGoal(goal: Goal) {
    goals.value.unshift(goal)
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    const idx = goals.value.findIndex((g) => g.id === id)
    if (idx !== -1) Object.assign(goals.value[idx], patch)
  }

  function completeGoal(id: string) {
    const g = goals.value.find((g) => g.id === id)
    if (g) { g.status = 'completed'; g.progress = 100 }
  }

  function deleteGoal(id: string) {
    goals.value = goals.value.filter((g) => g.id !== id)
  }

  function generateId(): string {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  function daysLeft(deadline: string): { text: string; urgent: boolean } {
    const d = new Date(deadline)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    const days = Math.ceil((d.getTime() - t.getTime()) / 86400000)
    if (days < 0) return { text: `已逾期 ${Math.abs(days)} 天`, urgent: true }
    if (days === 0) return { text: '今天截止', urgent: true }
    if (days === 1) return { text: '明天截止', urgent: true }
    if (days <= 3) return { text: `剩余 ${days} 天`, urgent: false }
    if (days <= 7) return { text: `剩余 ${days} 天`, urgent: false }
    return { text: `剩余 ${days} 天`, urgent: false }
  }

  function goalIcon(category: string): string {
    const map: Record<string, string> = { '开发': '💻', '工作': '💼', '学习': '📚', '生活': '🏠' }
    return map[category] || '🎯'
  }

  function progressColor(pct: number): string {
    if (pct >= 80) return '#16a34a'
    if (pct >= 40) return '#4f46e5'
    return '#d97706'
  }

  // ==== 统一进度计算（页面禁止重复计算）====
  function goalTaskCount(goalId: string): number {
    const taskStore = useTaskStore()
    return taskStore.tasks.filter((t) => t.goalId === goalId).length
  }
  function goalDoneCount(goalId: string): number {
    const taskStore = useTaskStore()
    return taskStore.tasks.filter((t) => t.goalId === goalId && t.status === 'done').length
  }
  function goalProgress(goalId: string): number {
    const total = goalTaskCount(goalId)
    return total === 0 ? 0 : Math.round((goalDoneCount(goalId) / total) * 100)
  }
  function goalNextTask(goalId: string): string {
    const taskStore = useTaskStore()
    const next = taskStore.tasks.find((t) => t.goalId === goalId && t.status !== 'done')
    return next ? next.title : '全部完成 🎉'
  }

  return {
    goals, activeGoals, completedGoals, expiringSoon, expiredGoals,
    addGoal, updateGoal, completeGoal, deleteGoal, generateId,
    daysLeft, goalIcon, progressColor, goalCategories,
    goalTaskCount, goalDoneCount, goalProgress, goalNextTask,
  }
})
