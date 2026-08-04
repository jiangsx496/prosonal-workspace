<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'
import { useReminderStore } from '@/stores/reminders'
import { useJournalStore } from '@/stores/journal'
import { useFocusStore } from '@/stores/focus'
import { useFeedStore } from '@/stores/feed'
import { useInterviewStore } from '@/stores/interview'
import type { FeedQuestion } from '@/services/feed'
import TaskModal from '@/components/TaskModal.vue'
import GoalCard from '@/components/GoalCard.vue'
import CalendarWidget from '@/components/CalendarWidget.vue'
import FocusScreen from '@/components/FocusScreen.vue'
import MotivationBanner from '@/components/MotivationBanner.vue'
import { generateDailyPlan, sortTasksByPriority } from '@/services/scheduler'
import { todayLocal } from '@/utils/date'
import Icon from '@/components/Icon.vue'

const taskStore = useTaskStore()
const habitStore = useHabitStore()
const goalStore = useGoalStore()
const dailyStore = useDailyStore()
const reminderStore = useReminderStore()
const journalStore = useJournalStore()
const focusStore = useFocusStore()
const feedStore = useFeedStore()
const interviewStore = useInterviewStore()

const showCreate = ref(false)
const generating = ref(false)
const showEndDay = ref(false)
const showFocusScreen = ref(false)
const showAllTasks = ref(false)

const TASK_PREVIEW_COUNT = 5

// ---- 结束今天：生成总结草稿 ----
const endDayDraft = computed(() => {
  const done = todayTasks.value.filter((t) => t.status === 'done')
  const undone = todayTasks.value.filter((t) => t.status !== 'done')
  const habitsDone = habitStore.activeHabits.filter((h) => habitStore.isDone(h))
  const lines: string[] = []
  lines.push(`完成任务（${done.length}）：`)
  done.forEach((t) => lines.push(`  ✅ ${t.title}`))
  if (done.length === 0) lines.push('  （无）')
  lines.push('')
  lines.push(`完成习惯（${habitsDone.length}/${habitStore.activeHabits.length}）：`)
  habitsDone.forEach((h) => lines.push(`  🔥 ${h.name}`))
  if (habitsDone.length === 0) lines.push('  （无）')
  lines.push('')
  if (undone.length > 0) {
    lines.push(`未完成任务（${undone.length}，已标记延期）：`)
    undone.forEach((t) => lines.push(`  📥 ${t.title}`))
  }
  return lines.join('\n')
})

function openEndDay() { showEndDay.value = true }
function saveEndDay() {
  journalStore.createOrUpdate({
    content: endDayDraft.value,
    mood: journalStore.todayJournal?.mood || '😊',
    completedTaskIds: todayTasks.value.filter((t) => t.status === 'done').map((t) => t.id),
    completedHabitIds: habitStore.activeHabits.filter((h) => habitStore.isDone(h)).map((h) => h.id),
  })
  // 自动延期未完成任务
  todayTasks.value.filter((t) => t.status !== 'done').forEach((t) => taskStore.deferTask(t.id))
  showEndDay.value = false
}

onMounted(() => {
  const today = todayLocal()
  const stored = localStorage.getItem('pw-reminders-refreshed')
  if (stored !== today) {
    localStorage.setItem('pw-reminders-refreshed', today)
    reminderStore.refreshDailyReminders(
      taskStore.pendingCount,
      taskStore.deferredTasks.length,
      goalStore.activeGoals.map((g) => {
        const d = new Date(g.deadline); const t = new Date(); t.setHours(0,0,0,0)
        return { id: g.id, title: g.title, days: Math.ceil((d.getTime()-t.getTime())/86400000) }
      }),
      habitStore.activeHabits.filter((h) => !habitStore.isDone(h)).map((h) => h.name),
    )
  }

  // 每日精选（有缓存则秒加载，无缓存则异步获取）
  feedStore.loadToday()
})

async function runScheduler() {
  generating.value = true
  await new Promise((r) => setTimeout(r, 300))
  const count = generateDailyPlan()
  generating.value = false
  alert(count > 0 ? `已生成 ${count} 个今日任务` : '没有新的任务需要安排')
}

// ---- 日期 & 问候 ----
const now = computed(() => {
  const d = new Date()
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  return { month: d.getMonth()+1, day: d.getDate(), weekday: weekdays[d.getDay()], hour: d.getHours(), minute: d.getMinutes() }
})
const greeting = computed(() => {
  const h = now.value.hour
  if (h<6) return { emoji:'🌙', text:'夜深了' }
  if (h<9) return { emoji:'☀️', text:'早上好' }
  if (h<12) return { emoji:'☀️', text:'上午好' }
  if (h<14) return { emoji:'🌤️', text:'中午好' }
  if (h<18) return { emoji:'🌤️', text:'下午好' }
  return { emoji:'🌙', text:'晚上好' }
})
const timeDisplay = computed(() => `${now.value.hour.toString().padStart(2,'0')}:${now.value.minute.toString().padStart(2,'0')}`)

// ---- 今日任务 ----
const todayTaskIds = computed(() => dailyStore.todayPlan.taskIds)
// 三源合并：DailyPlan + status=doing + 所有 Goal.plan 中今天的 taskIds
const todayTasks = computed(() => {
  const planIds = new Set(todayTaskIds.value)
  const statusIds = new Set(taskStore.todayTasks.map((t) => t.id))
  const goalPlanIds = new Set(goalStore.allTodayPlanTaskIds())
  const allIds = new Set([...planIds, ...statusIds, ...goalPlanIds])
  return taskStore.tasks.filter((t) => allIds.has(t.id))
})
const todayDone = computed(() => todayTasks.value.filter((t) => t.status === 'done').length)
const todayTotal = computed(() => todayTasks.value.length)
const progressPct = computed(() => todayTotal.value === 0 ? 0 : Math.round((todayDone.value / todayTotal.value) * 100))

// ---- 优先级排序（与 Scheduler 一致）----
const goalDeadlineMap = computed(() => {
  const m = new Map<string, string>()
  goalStore.goals.forEach((g) => m.set(g.id, g.deadline))
  return m
})
const sortedTodayTasks = computed(() =>
  sortTasksByPriority(todayTasks.value, goalDeadlineMap.value)
)

const visibleTasks = computed(() =>
  showAllTasks.value ? sortedTodayTasks.value : sortedTodayTasks.value.slice(0, TASK_PREVIEW_COUNT)
)

const hasMoreTasks = computed(() => sortedTodayTasks.value.length > TASK_PREVIEW_COUNT)

// ---- 当前行动（只关注 Task，不越界到 Habit）----
const nextAction = computed(() => {
  const urgent = todayTasks.value.find((t) => t.priority === 'high' && t.status !== 'done')
  if (urgent) return { icon: '🔴', text: urgent.title, label: '紧急任务', goalId: urgent.goalId }
  const undone = todayTasks.value.find((t) => t.status !== 'done')
  if (undone) return { icon: '📌', text: undone.title, label: '下一任务', goalId: undone.goalId }
  return { icon: '🎉', text: '今天的任务都完成了！', label: '完成', goalId: null }
})

const priorityDot: Record<string,string> = { high:'bg-red-400', medium:'bg-amber-400', low:'bg-slate-300' }

function toggleAndTrack(taskId: string) { taskStore.toggleTask(taskId) }

/** 把面试题加入今日计划 */
function addQuestionToTasks(q: FeedQuestion) {
  const today = todayLocal()
  const exists = taskStore.tasks.some((t) => t.title === q.question && t.scheduledDate === today)
  if (exists) return
  const id = taskStore.generateId()
  taskStore.addTask({
    id,
    title: q.question,
    description: `[${q.category}] ${q.answer}`,
    project: '',
    goalId: null,
    category: 'study',
    priority: 'medium',
    status: 'doing',
    source: 'manual',
    dueDate: today,
    scheduledDate: today,
    deferCount: 0,
    estimatedMinutes: 15,
    createdAt: today,
  })
  dailyStore.addTaskToToday(id)
}

// ---- 面试题挂目标 ----
const goalPickQuestion = ref<FeedQuestion | null>(null)
const goalPickVisible = ref(false)

/** 把面试题作为任务挂到已有目标下 */
function addQuestionToGoal(goalId: string) {
  const q = goalPickQuestion.value
  if (!q) return
  const today = todayLocal()
  const taskId = taskStore.generateId()
  taskStore.addTask({
    id: taskId,
    title: q.question,
    description: `[${q.category}] ${q.answer}`,
    project: '',
    goalId,
    category: 'study',
    priority: 'medium',
    status: 'doing',
    source: 'manual',
    dueDate: today,
    scheduledDate: today,
    deferCount: 0,
    estimatedMinutes: 20,
    createdAt: today,
  })
  dailyStore.addTaskToToday(taskId)
  goalPickQuestion.value = null
}

function openGoalPicker(q: FeedQuestion) {
  if (goalPickQuestion.value === q && goalPickVisible.value) {
    goalPickVisible.value = false
    return
  }
  goalPickQuestion.value = q
  goalPickVisible.value = true
}

/** 收藏首页面试题（同时入库 interviewStore 支持后续复习） */
function toggleFavoriteQuestion(q: FeedQuestion) {
  // 先确保题目在题库里（AI 生成的题可能还没入库）
  interviewStore.addCustomQuestion({ category: q.category, question: q.question, answer: q.answer })
  // 用和 interviewQuestions 一样的 hash 逻辑生成 ID 查找
  const raw = q.category + '|' + q.question
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }
  const questionId = 'iq_' + Math.abs(hash).toString(36)
  interviewStore.toggleMark(questionId)
}

/** 判断首页面试题是否已收藏 */
function isQuestionFavorited(q: FeedQuestion): boolean {
  const raw = q.category + '|' + q.question
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }
  const questionId = 'iq_' + Math.abs(hash).toString(36)
  return interviewStore.getProgress(questionId).marked
}

function deferUnfinished() {
  todayTasks.value.filter((t) => t.status !== 'done').forEach((t) => taskStore.deferTask(t.id))
}
function goalName(goalId: string | null): string {
  if (!goalId) return ''
  const g = goalStore.goals.find((g) => g.id === goalId)
  return g ? goalStore.goalIcon(g.category) + ' ' + g.title : ''
}

// ---- 快捷键事件监听（与 useHotkeys composable 配合）----
function onHotkeyFocus() { showFocusScreen.value = true }
function onHotkeyNewTask() { showCreate.value = true }
function onHotkeyToggleFirst() {
  const first = sortedTodayTasks.value.find((t) => t.status !== 'done')
  if (first) toggleAndTrack(first.id)
}
function onHotkeySearch() {
  // 模拟点击 Sidebar 的搜索按钮
  const btn = document.querySelector('[title="搜索"]') as HTMLElement
  if (btn) btn.click()
}

onMounted(() => {
  window.addEventListener('hotkey-focus', onHotkeyFocus)
  window.addEventListener('hotkey-new-task', onHotkeyNewTask)
  window.addEventListener('hotkey-toggle-first', onHotkeyToggleFirst)
  window.addEventListener('hotkey-search', onHotkeySearch)
})

onUnmounted(() => {
  window.removeEventListener('hotkey-focus', onHotkeyFocus)
  window.removeEventListener('hotkey-new-task', onHotkeyNewTask)
  window.removeEventListener('hotkey-toggle-first', onHotkeyToggleFirst)
  window.removeEventListener('hotkey-search', onHotkeySearch)
})
</script>

<template>
  <div class="space-y-4 pb-20 md:pb-0">
    <section class="rounded-3xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 md:p-6">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs uppercase tracking-[0.16em] text-text-muted">Control Tower</p>
          <p class="mt-2 text-3xl md:text-4xl font-light text-text-primary tracking-tight tabular-nums">{{ timeDisplay }}</p>
          <p class="mt-1 text-lg md:text-xl font-medium text-text-primary">{{ greeting.text }}</p>
          <p class="mt-1 text-sm text-text-muted">{{ now.month }}月{{ now.day }}日 {{ now.weekday }} · {{ taskStore.pendingCount }} 项待办 · {{ habitStore.doneCount }}/{{ habitStore.activeHabits.length }} 习惯</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover" @click="showCreate = true">+ 快速新建</button>
          <button class="rounded-xl bg-card-hover px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50" :disabled="generating" @click="runScheduler">{{ generating ? '生成中...' : '生成今日计划' }}</button>
          <button class="rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-card-hover" @click="openEndDay">结束今天</button>
        </div>
      </div>
      <div class="mt-5 flex flex-wrap gap-2 text-[10px] text-text-muted">
        <span class="rounded-full border border-border bg-card-hover/60 px-2.5 py-1">1 看状态</span>
        <span class="rounded-full border border-border bg-card-hover/60 px-2.5 py-1">2 执行任务</span>
        <span class="rounded-full border border-border bg-card-hover/60 px-2.5 py-1">3 专注推进</span>
        <span class="rounded-full border border-border bg-card-hover/60 px-2.5 py-1">4 补充输入</span>
        <span class="rounded-full border border-border bg-card-hover/60 px-2.5 py-1">5 收尾复盘</span>
      </div>
      <div class="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div class="rounded-2xl border border-border bg-card-hover/60 p-4">
          <p class="text-xs text-text-muted">今日完成</p>
          <div class="mt-2 flex items-end justify-between gap-2">
            <span class="text-2xl font-semibold tabular-nums text-text-primary">{{ todayDone }}/{{ todayTotal }}</span>
            <span class="text-sm font-medium tabular-nums" :class="progressPct===100?'text-emerald-500':'text-accent'">{{ progressPct }}%</span>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-card-hover">
            <div class="h-full rounded-full transition-all duration-700" :style="{width:progressPct+'%',backgroundColor:progressPct===100?'#16a34a':'var(--color-accent)'}"></div>
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-card-hover/60 p-4">
          <p class="text-xs text-text-muted">待处理</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{{ taskStore.pendingCount }}</p>
          <p class="mt-1 text-sm text-text-secondary">今天要推进的任务量</p>
        </div>
        <div class="rounded-2xl border border-border bg-card-hover/60 p-4">
          <p class="text-xs text-text-muted">累计专注</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{{ focusStore.formatFocusTime() }}</p>
          <p class="mt-1 text-sm text-text-secondary">今天已经投入的时间</p>
        </div>
      </div>
    </section>

    <MotivationBanner />

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)]">
      <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <Icon name="list" :size="16" class="text-text-muted" />
            <h3 class="text-sm font-medium text-text-primary">1. 今日任务</h3>
          </div>
          <span class="text-xs text-text-muted">{{ todayDone }}/{{ todayTotal }}</span>
        </div>
        <div class="mt-4">
          <div v-if="todayTasks.length > 0" class="space-y-1">
            <div v-for="t in visibleTasks" :key="t.id" class="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-card-hover" @click="toggleAndTrack(t.id)">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="priorityDot[t.priority]"></span>
              <div class="min-w-0 flex-1">
                <span class="block text-sm" :class="t.status==='done'?'text-text-muted line-through':'text-text-primary'">{{ t.title }}</span>
                <span v-if="t.goalId && goalName(t.goalId)" class="mt-0.5 flex items-center gap-1 truncate text-xs text-accent/70">
                  <span>🎯</span><span class="truncate">{{ goalName(t.goalId) }}</span>
                </span>
              </div>
              <span class="flex h-5 w-5 items-center justify-center rounded border text-xs group-hover:border-accent/50" :class="t.status==='done'?'border-accent bg-accent text-white':'border-border'"><span v-if="t.status==='done'">✓</span></span>
            </div>
            <button
              v-if="hasMoreTasks"
              class="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs text-text-muted transition-colors hover:bg-card-hover hover:text-accent"
              @click="showAllTasks = !showAllTasks"
            >
              <span>{{ showAllTasks ? '收起' : `展开全部（${sortedTodayTasks.length} 个）` }}</span>
              <span class="transition-transform" :class="showAllTasks ? 'rotate-180' : ''">▾</span>
            </button>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-sm text-text-muted">
            <span>今天还没有计划任务</span>
            <button class="mt-2 text-xs text-accent hover:underline" @click="showCreate=true">+ 添加第一个任务</button>
          </div>
        </div>
        <div v-if="todayTasks.length>0" class="mt-3 border-t border-border pt-3">
          <button class="text-xs text-text-muted transition-colors hover:text-amber-500" @click="deferUnfinished">将未完成的标记为延期</button>
        </div>
      </div>

      <div class="space-y-4">
        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Icon name="play" :size="16" class="text-text-muted" />
              <h3 class="text-sm font-medium text-text-primary">2. 当前行动与专注</h3>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="h-10 w-1 shrink-0 rounded-full" :class="nextAction.icon==='🎉' ? 'bg-emerald-400' : 'bg-accent'"></div>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-text-muted">{{ nextAction.label }}</p>
              <p class="truncate text-base font-medium text-text-primary">{{ nextAction.text }}</p>
              <p v-if="nextAction.goalId && goalName(nextAction.goalId)" class="mt-0.5 truncate text-xs text-text-muted">{{ goalName(nextAction.goalId) }}</p>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between rounded-xl border border-border bg-card-hover/60 px-3 py-2">
            <span class="text-xs text-text-muted">本次/今日专注</span>
            <span class="text-sm font-medium tabular-nums text-text-primary">{{ focusStore.formatFocusTime() }}</span>
          </div>
          <button
            class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            @click="showFocusScreen = true"
          ><Icon name="play" :size="14" /> {{ focusStore.isIdle ? '开始专注' : '打开专注屏幕' }}</button>
        </section>

        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-text-primary">时间入口</h3>
            <span class="text-xs text-text-muted">日历</span>
          </div>
          <CalendarWidget />
        </section>
      </div>
    </section>

    <section class="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Icon name="sparkles" :size="16" class="text-text-muted" />
            <h3 class="text-sm font-medium text-text-primary">4. 每日精选</h3>
          </div>
          <button class="text-xs text-text-muted transition-colors hover:text-accent disabled:opacity-50" :disabled="feedStore.loading" @click="feedStore.loadToday(true)">{{ feedStore.loading ? '刷新中...' : '刷新' }}</button>
        </div>
        <div v-if="feedStore.loading && !feedStore.hasFeed" class="py-6 text-center text-xs text-text-muted">
          <span>正在获取今日精选...</span>
        </div>
        <div v-else-if="feedStore.error" class="py-4 text-center text-xs text-amber-600">
          {{ feedStore.error }}
        </div>
        <div v-else-if="feedStore.hasFeed" class="space-y-4">
          <div v-if="feedStore.todayRepos.length > 0">
            <p class="mb-2 text-xs font-medium text-text-secondary">GitHub 热门</p>
            <div class="space-y-1.5">
              <a
                v-for="repo in feedStore.todayRepos"
                :key="repo.url"
                :href="repo.url"
                target="_blank"
                rel="noopener"
                class="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-card-hover"
              >
                <span class="shrink-0 text-xs mt-0.5">⭐ {{ repo.stars > 999 ? (repo.stars / 1000).toFixed(1) + 'k' : repo.stars }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-accent group-hover:underline">{{ repo.name }}</p>
                  <p v-if="repo.description" class="mt-0.5 line-clamp-2 text-xs text-text-muted">{{ repo.description }}</p>
                </div>
              </a>
            </div>
          </div>

          <div v-if="feedStore.todayQuestions.length > 0">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-xs font-medium text-text-secondary">每日面试题</p>
              <router-link to="/interview" class="text-xs text-accent hover:underline">题库 →</router-link>
            </div>
            <div class="space-y-1.5">
              <details
                v-for="(q, idx) in feedStore.todayQuestions"
                :key="idx"
                class="rounded-lg px-2 py-1.5 transition-colors hover:bg-card-hover"
              >
                <summary class="flex cursor-pointer select-none items-center justify-between gap-2 text-sm text-text-primary">
                  <span class="min-w-0 flex-1">{{ q.question }}</span>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      class="shrink-0 text-xs hover:underline"
                      :class="isQuestionFavorited(q) ? 'text-amber-500' : 'text-text-muted'"
                      @click.stop.prevent="toggleFavoriteQuestion(q)"
                    >{{ isQuestionFavorited(q) ? '★' : '☆' }}</button>
                    <button
                      class="shrink-0 text-xs text-accent hover:underline"
                      @click.stop.prevent="addQuestionToTasks(q)"
                    >+ 计划</button>
                    <div class="relative">
                      <button
                        class="shrink-0 text-xs text-orange-500 hover:underline"
                        @click.stop.prevent="openGoalPicker(q)"
                      >→ 目标</button>
                      <div
                        v-if="goalPickVisible && goalPickQuestion === q"
                        class="absolute right-0 top-full z-50 mt-1 max-h-48 w-48 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-xl"
                        @click.stop
                      >
                        <p class="px-3 py-1.5 text-[10px] text-text-muted">选择目标</p>
                        <button
                          v-for="g in goalStore.sortedActiveGoals"
                          :key="g.id"
                          class="w-full truncate px-3 py-1.5 text-left text-xs text-text-primary transition-colors hover:bg-card-hover"
                          @click="addQuestionToGoal(g.id); goalPickVisible = false"
                        >{{ goalStore.goalIcon(g.category) }} {{ g.title }}</button>
                        <div v-if="goalStore.sortedActiveGoals.length === 0" class="px-3 py-2 text-[10px] text-text-muted">
                          暂无活跃目标，请先创建
                        </div>
                      </div>
                    </div>
                  </div>
                </summary>
                <div class="mt-2 border-l-2 border-accent/30 pl-3">
                  <p class="whitespace-pre-wrap text-xs text-text-muted">{{ q.answer }}</p>
                  <span class="mt-1 inline-block rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">{{ q.category }}</span>
                </div>
              </details>
            </div>
          </div>
        </div>
        <div v-else class="py-4 text-center text-xs text-text-muted">
          <span>暂无精选内容，点击刷新获取</span>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Icon name="flame" :size="16" class="text-text-muted" />
              <h3 class="text-sm font-medium text-text-primary">5. 今日习惯</h3>
            </div>
            <span class="text-xs text-text-muted">{{ habitStore.doneCount }}/{{ habitStore.activeHabits.length }}</span>
          </div>
          <div class="space-y-2">
            <div v-for="h in habitStore.activeHabits" :key="h.id" class="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-card-hover" @click="habitStore.toggle(h.id)">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ habitStore.habitCategoryMeta[h.category]?.icon || '✅' }}</span>
                <div>
                  <span class="text-sm" :class="habitStore.isDone(h)?'text-text-muted line-through':'text-text-primary'">{{ h.name }}</span>
                  <span class="ml-1 text-xs text-text-muted">本周 {{ habitStore.weeklyCount(h.id) }}/{{ h.frequency==='weekly'?1:7 }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-amber-500">{{ h.streak }}天</span>
                <span class="flex h-5 w-5 items-center justify-center rounded border text-xs" :class="habitStore.isDone(h)?'border-accent bg-accent text-white':'border-border'"><span v-if="habitStore.isDone(h)">✓</span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center gap-2 mb-4">
            <Icon name="target" :size="16" class="text-text-muted" />
            <h3 class="text-sm font-medium text-text-primary">6. 当前目标</h3>
          </div>
          <div v-if="goalStore.sortedActiveGoals.length > 0" class="space-y-3">
            <GoalCard
              v-for="(g, idx) in goalStore.sortedActiveGoals.slice(0, 3)"
              :key="g.id"
              :goal="g"
              :highlight="idx === 0"
            />
          </div>
          <div v-else class="flex flex-col items-center justify-center py-6 text-sm text-text-muted">
            <span>还没有进行中的目标</span>
            <router-link to="/goals" class="mt-1 text-xs text-accent hover:underline">+ 创建第一个目标</router-link>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="edit" :size="16" class="text-text-muted" />
            <h3 class="text-sm font-medium text-text-primary">7. 今日总结</h3>
          </div>
          <textarea
            :value="dailyStore.todayPlan.summary"
            @input="dailyStore.updateSummary(($event.target as HTMLTextAreaElement).value)"
            placeholder="今天完成了什么？有什么收获？..."
            class="h-28 w-full resize-none rounded-lg border border-border bg-card-hover/50 px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted/50 focus:border-accent focus:bg-card"
          ></textarea>
          <router-link to="/journal" class="mt-2 block text-right text-xs text-accent hover:underline">📖 记录完整日志 →</router-link>
        </div>
      </div>
    </section>

    <button class="fixed bottom-20 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-accent-hover hover:shadow-xl md:bottom-8 md:right-8" @click="showCreate=true" title="快速创建任务"><Icon name="plus" :size="20" /></button>
    <TaskModal :visible="showCreate" @close="showCreate=false" />
    <FocusScreen :visible="showFocusScreen" @close="showFocusScreen=false" />

    <Teleport to="body">
      <div v-if="showEndDay" class="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" @click.self="showEndDay=false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative w-full max-w-lg mx-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-slate-900/15">
          <div class="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 class="text-sm font-semibold text-text-primary">🌙 结束今天</h2>
            <button class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-card-hover" @click="showEndDay=false">✕</button>
          </div>
          <div class="p-5">
            <p class="mb-3 text-xs text-text-muted">以下是今日总结草稿，保存后将自动延期未完成任务并记录到日志：</p>
            <pre class="max-h-[50vh] w-full overflow-y-auto rounded-lg border border-border bg-card-hover/50 px-4 py-3 font-mono whitespace-pre-wrap text-xs text-text-secondary">{{ endDayDraft }}</pre>
          </div>
          <div class="flex justify-end gap-2 border-t border-border bg-card-hover/30 px-5 py-4">
            <button class="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-card-hover" @click="showEndDay=false">取消</button>
            <router-link to="/journal" class="rounded-lg px-4 py-2 text-sm text-accent transition-colors hover:bg-accent/10" @click="saveEndDay()">保存并查看日志</router-link>
            <button class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover" @click="saveEndDay()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
