import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanDraft, PlanDraftTask } from '@/mock/planDraft'
import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import type { Goal } from '@/mock/goals'
import type { Task } from '@/mock/tasks'

const MAX_TASKS = 20

export const usePlanDraftStore = defineStore('planDraft', () => {
  const draft = ref<PlanDraft | null>(null)
  const creating = ref(false)

  const hasDraft = computed(() => !!draft.value)
  const selectedTasks = computed(() => draft.value?.tasks.filter((t) => t.selected) || [])
  const taskCount = computed(() => draft.value?.tasks.length || 0)
  const selectedCount = computed(() => selectedTasks.value.length)
  const isOverLimit = computed(() => taskCount.value > MAX_TASKS)

  function generateId(prefix: string = 't'): string {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  function createDraft(data: {
    source: PlanDraft['source']
    title: string
    goalTitle: string
    goalDescription: string
    tasks: { title: string; priority?: PlanDraftTask['priority']; dueDate?: string }[]
    summary?: string
  }): void {
    draft.value = {
      id: generateId('draft'),
      source: data.source,
      title: data.title,
      goal: { title: data.goalTitle, description: data.goalDescription },
      tasks: data.tasks.map((t) => ({
        id: generateId(),
        title: t.title,
        priority: t.priority || 'medium',
        selected: true,
        dueDate: t.dueDate,
      })),
      schedule: [],
      summary: data.summary || '',
      createdAt: new Date().toISOString(),
    }
  }

  function updateTaskTitle(taskId: string, title: string) {
    const t = draft.value?.tasks.find((t) => t.id === taskId)
    if (t) t.title = title
  }

  function updateTaskPriority(taskId: string, priority: PlanDraftTask['priority']) {
    const t = draft.value?.tasks.find((t) => t.id === taskId)
    if (t) t.priority = priority
  }

  function toggleTask(taskId: string) {
    const t = draft.value?.tasks.find((t) => t.id === taskId)
    if (t) t.selected = !t.selected
  }

  function updateTaskSelection(taskId: string, selected: boolean) {
    const t = draft.value?.tasks.find((t) => t.id === taskId)
    if (t) t.selected = selected
  }

  function removeTask(taskId: string) {
    if (!draft.value) return
    draft.value.tasks = draft.value.tasks.filter((t) => t.id !== taskId)
  }

  function clearDraft() {
    draft.value = null
  }

  /** 确认创建：PlanDraft → Goal + Task + DailyPlan */
  function confirmCreate(): { goalId: string | null; taskCount: number } {
    if (!draft.value) return { goalId: null, taskCount: 0 }

    const goalStore = useGoalStore()
    const taskStore = useTaskStore()
    const dailyStore = useDailyStore()
    const today = new Date().toISOString().slice(0, 10)

    // 创建目标
    let goalId: string | null = null
    if (draft.value.goal.title) {
      const existing = goalStore.goals.find((g) => g.title === draft.value!.goal.title && g.status === 'active')
      if (existing) {
        goalId = existing.id
      } else {
        goalId = goalStore.generateId()
        goalStore.addGoal({
          id: goalId,
          title: draft.value.goal.title,
          description: draft.value.goal.description,
          category: '开发',
          startDate: today,
          deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          progress: 0,
          priority: 'medium',
          status: 'active',
        } as Goal)
      }
    }

    // 创建选中的任务
    const tasksToCreate = draft.value.tasks.filter((t) => t.selected)
    tasksToCreate.forEach((t) => {
      const taskId = taskStore.generateId()
      const scheduledDate = t.dueDate || today
      taskStore.addTask({
        id: taskId,
        title: t.title,
        description: t.description || '',
        project: '',
        goalId,
        category: 'work',
        priority: t.priority,
        status: 'backlog',
        source: 'import',
        dueDate: scheduledDate,
        scheduledDate,
        deferCount: 0,
        createdAt: today,
      } as Task)
      // 今天任务自动加入 DailyPlan
      if (scheduledDate === today) {
        dailyStore.addTaskToToday(taskId)
      }
    })

    const result = { goalId, taskCount: tasksToCreate.length }
    clearDraft()
    return result
  }

  return {
    draft, creating, hasDraft, selectedTasks, taskCount, selectedCount, isOverLimit,
    MAX_TASKS,
    createDraft, updateTaskTitle, updateTaskPriority, toggleTask, updateTaskSelection,
    removeTask, clearDraft, confirmCreate,
  }
})
