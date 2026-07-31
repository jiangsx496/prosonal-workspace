<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import type { Task } from '@/mock/tasks'

const route = useRoute()
const router = useRouter()
const goalStore = useGoalStore()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()

const goalId = computed(() => route.params.id as string)
const goal = computed(() => goalStore.goals.find((g) => g.id === goalId.value))

const goalTasks = computed(() => taskStore.tasks.filter((t) => t.goalId === goalId.value))
const doneTasks = computed(() => goalTasks.value.filter((t) => t.status === 'done'))
const undoneTasks = computed(() => goalTasks.value.filter((t) => t.status !== 'done'))

const priorityDot: Record<string, string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-300' }

// ---- 快速添加关联任务 ----
const newTaskTitle = ref('')
const newTaskPriority = ref<Task['priority']>('medium')

function addQuickTask() {
  const title = newTaskTitle.value.trim()
  if (!title || !goalId.value) return
  const today = new Date().toISOString().slice(0, 10)
  taskStore.addTask({
    id: taskStore.generateId(), title,
    project: '', goalId: goalId.value,
    category: 'work', priority: newTaskPriority.value,
    status: 'backlog', source: 'goal',
    dueDate: goal.value?.deadline || today, scheduledDate: '',
    deferCount: 0, createdAt: today,
  } as Task)
  newTaskTitle.value = ''
}

// ---- 安排到今天：勾选模式 ----
const selectedTaskIds = ref<Set<string>>(new Set())
const scheduleMsg = ref('')

function toggleSelect(taskId: string) {
  if (selectedTaskIds.value.has(taskId)) {
    selectedTaskIds.value.delete(taskId)
  } else {
    selectedTaskIds.value.add(taskId)
  }
}

function scheduleSelected() {
  if (selectedTaskIds.value.size === 0) return
  let added = 0
  selectedTaskIds.value.forEach((id) => {
    dailyStore.addTaskToToday(id)
    added++
  })
  scheduleMsg.value = `已将 ${added} 个任务安排到今天`
  selectedTaskIds.value.clear()
  setTimeout(() => { scheduleMsg.value = '' }, 3000)
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0" v-if="goal">
    <!-- 返回 + 标题 -->
    <div class="flex items-center gap-3">
      <button class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="router.push('/goals')">←</button>
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ goalStore.goalIcon(goal.category) }}</span>
          <h1 class="text-2xl font-bold text-text-primary">{{ goal.title }}</h1>
        </div>
        <p class="text-xs text-text-muted mt-1">{{ goal.description }}</p>
      </div>
    </div>

    <!-- 进度面板 -->
    <div class="bg-card border border-border rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-3xl font-bold" :class="goalStore.goalProgress(goal.id)>=100?'text-green-500':'text-accent'">{{ goalStore.goalProgress(goal.id) }}%</p>
          <p class="text-xs text-text-muted mt-1">{{ goalStore.goalDoneCount(goal.id) }}/{{ goalStore.goalTaskCount(goal.id) }} 任务完成</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-text-muted">截止日期</p>
          <p class="text-sm font-medium text-text-primary">{{ goal.deadline }}</p>
          <p class="text-xs mt-1" :class="goalStore.daysLeft(goal.deadline).urgent?'text-red-500 font-medium':'text-text-muted'">{{ goalStore.daysLeft(goal.deadline).text }}</p>
        </div>
      </div>
      <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700" :style="{width:goalStore.goalProgress(goal.id)+'%',backgroundColor:goalStore.progressColor(goalStore.goalProgress(goal.id))}"></div>
      </div>
      <!-- 安排到今天 -->
      <div class="mt-4 flex items-center gap-3">
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="selectedTaskIds.size === 0"
          @click="scheduleSelected"
        >📅 安排到今天（已选 {{ selectedTaskIds.size }} 个）</button>
        <span v-if="scheduleMsg" class="text-xs text-green-600 font-medium">{{ scheduleMsg }}</span>
      </div>
    </div>

    <!-- 关联任务 -->
    <div class="bg-card border border-border rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-text-primary">📋 关联任务</h3>
        <span class="text-xs text-text-muted">{{ doneTasks.length }}/{{ goalTasks.length }}</span>
      </div>

      <!-- 快速添加任务 -->
      <div class="flex gap-2 mb-4">
        <input v-model="newTaskTitle" type="text" placeholder="添加任务，按回车确认" class="flex-1 px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent focus:bg-white transition-colors" @keyup.enter="addQuickTask" />
        <select v-model="newTaskPriority" class="px-2 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-xs outline-none focus:border-accent">
          <option value="high">🔴</option>
          <option value="medium">🟡</option>
          <option value="low">⚪</option>
        </select>
        <button class="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!newTaskTitle.trim()" @click="addQuickTask">+</button>
      </div>

      <div v-if="undoneTasks.length > 0" class="space-y-1 mb-4">
        <p class="text-xs text-text-muted mb-2">待完成</p>
        <div v-for="t in undoneTasks" :key="t.id" class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group" @click="taskStore.toggleTask(t.id)">
          <span class="w-2 h-2 rounded-full shrink-0" :class="priorityDot[t.priority]"></span>
          <span class="flex-1 text-sm text-text-primary truncate">{{ t.title }}</span>
          <span class="text-xs w-5 h-5 rounded border border-border flex items-center justify-center group-hover:border-accent/50"></span>
        </div>
      </div>

      <div v-if="doneTasks.length > 0">
        <p class="text-xs text-text-muted mb-2">已完成</p>
        <div v-for="t in doneTasks" :key="t.id" class="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer" @click="taskStore.toggleTask(t.id)">
          <span class="w-2 h-2 rounded-full shrink-0 bg-green-400"></span>
          <span class="flex-1 text-sm text-text-muted line-through truncate">{{ t.title }}</span>
          <span class="text-xs w-5 h-5 rounded bg-accent border-accent text-white flex items-center justify-center">✓</span>
        </div>
      </div>

      <div v-if="goalTasks.length === 0" class="flex flex-col items-center justify-center py-8 text-text-muted text-sm">
        <span>还没有关联任务</span>
        <span class="text-xs mt-1 opacity-60">在上方输入框添加第一个任务</span>
      </div>
    </div>

    <!-- 下一步 -->
    <div v-if="goalStore.goalNextTask(goal.id) !== '全部完成 🎉'" class="bg-gradient-to-r from-accent/10 to-blue-50 border border-accent/20 rounded-2xl p-5 flex items-center gap-4">
      <span class="text-2xl">→</span>
      <div>
        <p class="text-xs text-text-muted">下一步行动</p>
        <p class="text-sm font-medium text-text-primary">{{ goalStore.goalNextTask(goal.id) }}</p>
      </div>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
    <span class="text-4xl mb-4">🔍</span>
    <p class="text-sm">目标不存在</p>
    <router-link to="/goals" class="text-xs text-accent hover:underline mt-2">返回目标列表</router-link>
  </div>
</template>
