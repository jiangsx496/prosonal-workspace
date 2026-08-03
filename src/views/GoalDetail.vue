<script setup lang="ts">
import { computed, ref } from 'vue'
import { todayLocal } from '@/utils/date'
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

// ---- 完成 & 删除 ----
function handleComplete() {
  if (!goal.value) return
  goalStore.completeGoal(goal.value.id)
}
function handleDelete() {
  if (!goal.value) return
  if (!confirm(`确定删除目标「${goal.value.title}」及其关联任务？`)) return
  goalStore.deleteGoal(goal.value.id)
  router.push('/goals')
}

const goalTasks = computed(() => taskStore.tasks.filter((t) => t.goalId === goalId.value))
const doneTasks = computed(() => goalTasks.value.filter((t) => t.status === 'done'))
const undoneTasks = computed(() => goalTasks.value.filter((t) => t.status !== 'done'))

const priorityDot: Record<string, string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-300' }

// ---- Plan 计划视图 ----
const plan = computed(() => goal.value?.plan || null)
const showTaskPool = ref(false)       // 任务池默认折叠

/** 根据 taskId 从 TaskStore 查 Task */
function getTask(taskId: string): Task | undefined {
  return taskStore.tasks.find((t) => t.id === taskId)
}

/** 进度：有 Plan 用 Plan 进度，否则用旧逻辑 */
const displayProgress = computed(() => {
  const planPct = goalStore.goalPlanProgress(goalId.value)
  return planPct !== null ? planPct : goalStore.goalProgress(goalId.value)
})

// ---- 快速添加关联任务 ----
const newTaskTitle = ref('')
const newTaskPriority = ref<Task['priority']>('medium')

function addQuickTask() {
  const title = newTaskTitle.value.trim()
  if (!title || !goalId.value) return
  const today = todayLocal()
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
          <span v-if="goal.status==='completed'" class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">已完成</span>
        </div>
        <p class="text-xs text-text-muted mt-1">{{ goal.description }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button v-if="goal.status !== 'completed'"
          class="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
          @click="handleComplete"
        >✓ 完成</button>
        <button
          class="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
          @click="handleDelete"
        >🗑 删除</button>
      </div>
    </div>

    <!-- 进度面板 -->
    <div class="bg-card border border-border rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-3xl font-bold" :class="displayProgress>=100?'text-green-500':'text-accent'">{{ displayProgress }}%</p>
          <p class="text-xs text-text-muted mt-1">{{ goalStore.goalDoneCount(goal.id) }}/{{ goalStore.goalTaskCount(goal.id) }} 任务完成</p>
        </div>
        <div class="text-right">
          <p class="text-xs text-text-muted">截止日期</p>
          <p class="text-sm font-medium text-text-primary">{{ goal.deadline }}</p>
          <p class="text-xs mt-1" :class="goalStore.daysLeft(goal.deadline).urgent?'text-red-500 font-medium':'text-text-muted'">{{ goalStore.daysLeft(goal.deadline).text }}</p>
        </div>
      </div>
      <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700" :style="{width:displayProgress+'%',backgroundColor:goalStore.progressColor(displayProgress)}"></div>
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

    <!-- 计划视图（Plan 层级展示） -->
    <div v-if="plan" class="bg-card border border-border rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-text-primary">📅 计划视图</h3>
        <span class="text-xs text-text-muted">{{ plan.totalDays }} 天 · 从 {{ plan.startDate }} 开始</span>
      </div>
      <div class="space-y-3">
        <div v-for="day in plan.days" :key="day.id" class="border border-border rounded-xl overflow-hidden">
          <!-- Day 头部 -->
          <div class="flex items-center gap-2 px-3 py-2 bg-gray-50">
            <span class="text-xs font-bold text-accent">📅 Day{{ day.day }}</span>
            <span class="text-xs text-text-muted">{{ day.date }}</span>
            <span class="text-xs text-text-secondary ml-1">{{ day.title.replace(/^Day\d+[：:]?\s*/, '') }}</span>
            <span class="text-xs text-text-muted ml-auto">
              {{ day.blocks.reduce((sum, b) => sum + b.taskIds.length, 0) }} 个任务
            </span>
          </div>
          <!-- 时间块 -->
          <div v-for="block in day.blocks" :key="block.id" class="px-3 py-2 border-t border-border/50">
            <div class="flex items-center gap-2 mb-1">
              <span v-if="block.time" class="text-xs font-mono text-text-muted">{{ block.time }}</span>
              <span class="text-xs text-text-secondary">{{ block.category }}</span>
            </div>
            <!-- 任务列表（按 taskIds 查 Task） -->
            <div v-for="tid in block.taskIds" :key="tid" class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <span class="w-2 h-2 rounded-full shrink-0" :class="getTask(tid)?.priority ? priorityDot[getTask(tid)!.priority] : 'bg-slate-300'"></span>
              <span class="flex-1 text-sm truncate" :class="getTask(tid)?.status==='done'?'text-text-muted line-through':'text-text-primary'">{{ getTask(tid)?.title || '（任务已删除）' }}</span>
              <span class="text-xs w-5 h-5 rounded border flex items-center justify-center cursor-pointer hover:border-accent/50"
                :class="getTask(tid)?.status==='done'?'bg-accent border-accent text-white':'border-border'"
                @click.stop="tid && taskStore.toggleTask(tid)"
              ><span v-if="getTask(tid)?.status==='done'">✓</span></span>
            </div>
            <div v-if="block.taskIds.length === 0" class="text-xs text-text-muted italic py-1 px-2">无任务</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务池（原关联任务，默认折叠） -->
    <div class="bg-card border border-border rounded-xl p-5">
      <button class="flex items-center justify-between w-full mb-4" @click="showTaskPool = !showTaskPool">
        <h3 class="text-sm font-semibold text-text-primary">🗂️ 任务池</h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-muted">{{ doneTasks.length }}/{{ goalTasks.length }}</span>
          <span class="text-xs text-text-muted">{{ showTaskPool ? '▾' : '▸' }}</span>
        </div>
      </button>

      <div v-show="showTaskPool">

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
        <p class="text-xs text-text-muted mb-2">待完成 · 勾选后点「安排到今天」</p>
        <div v-for="t in undoneTasks" :key="t.id" class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
          <button
            class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
            :class="selectedTaskIds.has(t.id) ? 'bg-accent border-accent text-white' : 'border-gray-300 hover:border-accent/50'"
            @click.stop="toggleSelect(t.id)"
          ><span v-if="selectedTaskIds.has(t.id)" class="text-xs">📅</span></button>
          <span class="w-2 h-2 rounded-full shrink-0" :class="priorityDot[t.priority]"></span>
          <span class="flex-1 text-sm text-text-primary truncate">{{ t.title }}</span>
          <span class="text-xs w-5 h-5 rounded border border-border flex items-center justify-center cursor-pointer group-hover:border-accent/50" @click.stop="taskStore.toggleTask(t.id)"></span>
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
      </div><!-- /v-show=showTaskPool -->
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
