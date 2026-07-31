import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlanDraft, DraftTask } from '@/types/planDraft'
import { flattenTasks } from '@/types/planDraft'
import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import type { Goal } from '@/mock/goals'
import type { Task } from '@/mock/tasks'
import type { Plan, PlanDay, PlanBlock } from '@/types/plan'
import { generatePlanId } from '@/types/plan'

const MAX_TASKS = 35
const MAX_PER_DAY = 8

export const usePlanDraftStore = defineStore('planDraft', () => {
  const currentDraft = ref<PlanDraft | null>(null)
  const creating = ref(false)
  const createResult = ref<{ goalId: string | null; taskCount: number; dayCount: number } | null>(null)

  const hasDraft = computed(() => !!currentDraft.value)
  const allTasks = computed<DraftTask[]>(() => currentDraft.value ? flattenTasks(currentDraft.value) : [])
  const selectedTasks = computed(() => allTasks.value.filter((t) => t.selected))
  const taskCount = computed(() => allTasks.value.length)
  const selectedCount = computed(() => selectedTasks.value.length)
  const isOverLimit = computed(() => taskCount.value > MAX_TASKS)

  /** 质量检测：任务过多/每天过多时返回警告 */
  const qualityWarning = computed<string | null>(() => {
    if (!currentDraft.value) return null
    if (allTasks.value.length === 0) return '未识别到任何任务，请确认内容包含列表格式'
    if (allTasks.value.length > MAX_TASKS) return `解析出 ${allTasks.value.length} 个任务，超过上限 ${MAX_TASKS}，建议精简`
    for (const day of currentDraft.value.days) {
      const dayTaskCount = day.blocks.reduce((sum, b) => sum + b.tasks.length, 0)
      if (dayTaskCount > MAX_PER_DAY) return `Day${day.day} 有 ${dayTaskCount} 个任务，每天建议不超过 ${MAX_PER_DAY}`
    }
    return null
  })

  function generateId(prefix: string = 't'): string {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  /** 接收解析器产出的 PlanDraft */
  function setDraft(draft: PlanDraft): void {
    currentDraft.value = draft
    createResult.value = null
  }

  function updateTaskTitle(taskId: string, title: string) {
    const t = allTasks.value.find((t) => t.id === taskId)
    if (t) t.title = title
  }

  function updateTaskPriority(taskId: string, priority: DraftTask['priority']) {
    const t = allTasks.value.find((t) => t.id === taskId)
    if (t) t.priority = priority
  }

  function toggleTask(taskId: string) {
    const t = allTasks.value.find((t) => t.id === taskId)
    if (t) t.selected = !t.selected
  }

  function updateTaskSelection(taskId: string, selected: boolean) {
    const t = allTasks.value.find((t) => t.id === taskId)
    if (t) t.selected = selected
  }

  function removeTask(taskId: string) {
    if (!currentDraft.value) return
    for (const day of currentDraft.value.days) {
      for (const block of day.blocks) {
        block.tasks = block.tasks.filter((t) => t.id !== taskId)
      }
    }
  }

  /** 选中/取消某天全部任务 */
  function toggleDay(day: number, selected: boolean) {
    const tasks = currentDraft.value?.days.find((d) => d.day === day)?.blocks.flatMap((b) => b.tasks) || []
    tasks.forEach((t) => (t.selected = selected))
  }

  function clearDraft() {
    currentDraft.value = null
    createResult.value = null
  }

  /** 确认创建：PlanDraft → Goal + Task + DailyPlan 三步分流 */
  function confirmCreate(): { goalId: string | null; taskCount: number; dayCount: number } {
    if (!currentDraft.value) return { goalId: null, taskCount: 0, dayCount: 0 }

    const goalStore = useGoalStore()
    const taskStore = useTaskStore()
    const dailyStore = useDailyStore()
    const today = new Date().toISOString().slice(0, 10)

    // Step 1: 创建 Goal
    let goalId: string | null = null
    if (currentDraft.value.goal.title) {
      const existing = goalStore.goals.find((g) => g.title === currentDraft.value!.goal.title && g.status === 'active')
      if (existing) {
        goalId = existing.id
      } else {
        goalId = goalStore.generateId()
        const goalTitle = currentDraft.value.goal.title
        const inferCategory = /面试|学习|复习|前端|后端|算法/.test(goalTitle) ? '学习'
          : /运动|健身|饮食|睡眠|习惯/.test(goalTitle) ? '生活'
          : /项目|开发|代码|部署/.test(goalTitle) ? '开发'
          : '开发'
        const deadlineDate = new Date(Date.now() + currentDraft.value.totalDays * 86400000).toISOString().slice(0, 10)
        goalStore.addGoal({
          id: goalId,
          title: goalTitle,
          description: currentDraft.value.goal.description,
          category: inferCategory,
          startDate: today,
          deadline: deadlineDate,
          progress: 0,
          priority: 'medium',
          status: 'active',
        } as Goal)
      }
    }

    // Step 2: 遍历 days → 创建 Task（绑定 goalId + category 过滤）+ 写入 DailyPlan + 构建 Plan 层级
    let taskCount = 0
    const planDays: PlanDay[] = []

    for (const day of currentDraft.value.days) {
      const planBlocks: PlanBlock[] = []

      for (const block of day.blocks) {
        const taskIdsForBlock: string[] = []

        for (const dt of block.tasks) {
          if (!dt.selected || dt.category !== 'task') continue
          if (taskCount >= MAX_TASKS) break

          const taskId = taskStore.generateId()
          taskStore.addTask({
            id: taskId,
            title: dt.title,
            description: '',
            project: '',
            goalId,
            category: 'study' as Task['category'],
            priority: dt.priority,
            status: 'backlog',
            source: 'ai' as Task['source'],
            dueDate: day.date,
            scheduledDate: day.date,
            deferCount: 0,
            estimatedMinutes: dt.estimatedMinutes || 30,
            createdAt: today,
          } as Task)

          dailyStore.addTaskToDate(taskId, day.date)
          taskIdsForBlock.push(taskId)
          taskCount++
        }

        planBlocks.push({
          id: generatePlanId('blk'),
          category: block.category,
          time: block.time,
          taskIds: taskIdsForBlock,
        })
      }

      planDays.push({
        id: generatePlanId('day'),
        day: day.day,
        date: day.date,
        title: day.title,
        blocks: planBlocks,
      })
    }

    // Step 3: 将 Plan 存入 Goal.plan（持久化层级结构）
    if (goalId && planDays.length > 0) {
      const plan: Plan = {
        startDate: currentDraft.value.startDate,
        totalDays: currentDraft.value.totalDays,
        days: planDays,
      }
      goalStore.updateGoal(goalId, { plan })
    }

    const dayCount = currentDraft.value.days.length
    const result = { goalId, taskCount, dayCount }
    createResult.value = result
    clearDraft()
    return result
  }

  return {
    currentDraft, creating, createResult, hasDraft, allTasks, selectedTasks,
    taskCount, selectedCount, isOverLimit, qualityWarning, MAX_TASKS, MAX_PER_DAY,
    generateId, setDraft, updateTaskTitle, updateTaskPriority, toggleTask,
    updateTaskSelection, removeTask, toggleDay, clearDraft, confirmCreate,
  }
})
