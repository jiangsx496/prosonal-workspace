<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { todayLocal, localDateStr, localDateFromISO } from '@/utils/date'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useGoalStore } from '@/stores/goals'
import { useInterviewStore } from '@/stores/interview'
import Icon from '@/components/Icon.vue'

const router = useRouter()
const taskStore = useTaskStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const goalStore = useGoalStore()
const interviewStore = useInterviewStore()

const collapsed = reactive({
  tasks: false,
  goals: false,
  goalList: false,
  trend: false,
  habits: false,
  focus: false,
  interview: false,
})

const today = todayLocal()

// ---- 本周日期（周日开始）----
const weekDays = computed(() => {
  const days: { date: string; label: string; isToday: boolean }[] = []
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getTime() + i * 86400000)
    const dateStr = localDateStr(d)
    days.push({
      date: dateStr,
      label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      isToday: dateStr === today,
    })
  }
  return days
})

// ---- 本周趋势（复用 Review.vue weekStats 逻辑）----
const weekStats = computed(() =>
  weekDays.value.map((d) => ({
    ...d,
    tasks: taskStore.tasksCompletedOn(d.date).length,
    habits: habitStore.habits.filter((h) => (h.completedDates || []).includes(d.date)).length,
    focusMin: Math.round(
      focusStore.sessions
        .filter((s) => localDateFromISO(s.createdAt) === d.date && s.status === 'completed')
        .reduce((sum, s) => sum + s.duration, 0) / 60
    ),
  }))
)

const weekMax = computed(() => {
  let max = 1
  for (const s of weekStats.value) {
    max = Math.max(max, s.tasks, s.habits, Math.ceil(s.focusMin / 25))
  }
  return max
})

// ---- 卡片 a) 任务总览 ----
const weekCompletedTasks = computed(() =>
  weekStats.value.reduce((sum, d) => sum + d.tasks, 0)
)
const weekUncompletedTasks = computed(() =>
  weekDays.value.reduce((sum, d) => sum + taskStore.tasksUncompletedOn(d.date).length, 0)
)
const taskCompletionRate = computed(() => {
  const total = weekCompletedTasks.value + weekUncompletedTasks.value
  return total === 0 ? 0 : Math.round((weekCompletedTasks.value / total) * 100)
})
const todayPendingCount = computed(() => taskStore.pendingCount)

// ---- 卡片 b) 习惯坚持 ----
const todayHabitRate = computed(() => {
  const total = habitStore.activeHabits.length
  return total === 0 ? 0 : Math.round((habitStore.doneCount / total) * 100)
})
const maxStreak = computed(() =>
  habitStore.activeHabits.reduce((max, h) => Math.max(max, h.streak), 0)
)
const weekHabitTrend = computed(() => weekStats.value.map((d) => d.habits))
const habitTrendMax = computed(() => Math.max(1, ...weekHabitTrend.value))

// ---- 卡片 c) 专注统计 ----
function formatMinutes(min: number): string {
  if (min <= 0) return '0 分钟'
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}
const todayFocusText = computed(() => focusStore.formatFocusTime())
const weekFocusMin = computed(() =>
  weekStats.value.reduce((sum, d) => sum + d.focusMin, 0)
)
const weekFocusText = computed(() => formatMinutes(weekFocusMin.value))
const totalFocusSec = computed(() =>
  focusStore.sessions
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.duration, 0)
)
const totalFocusText = computed(() => formatMinutes(Math.round(totalFocusSec.value / 60)))

// ---- 卡片 d) 目标进度 ----
const activeGoalCount = computed(() => goalStore.activeGoals.length)
const avgGoalProgress = computed(() => {
  const list = goalStore.activeGoals
  if (list.length === 0) return 0
  const sum = list.reduce((acc, g) => acc + goalStore.goalProgress(g.id), 0)
  return Math.round(sum / list.length)
})
const nearestDeadlineGoal = computed(() => {
  const sorted = [...goalStore.activeGoals].sort((a, b) => a.deadline.localeCompare(b.deadline))
  return sorted[0] || null
})

// ---- 卡片 e) 面试题掌握度 ----
const totalQuestions = computed(() => interviewStore.totalQuestions)
const masteredCount = computed(() => interviewStore.masteredCount)
const todayReviewCount = computed(() => interviewStore.todayReviewCount)
const masteredPercent = computed(() => {
  const t = totalQuestions.value
  return t === 0 ? 0 : Math.round((masteredCount.value / t) * 100)
})

// ---- 卡片 f) 每周趋势图：同 weekStats / weekMax ----
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <section class="rounded-3xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 md:p-6">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="text-xs uppercase tracking-[0.16em] text-text-muted">Overview</p>
          <h1 class="mt-2 text-2xl font-semibold text-text-primary">数据看板</h1>
          <p class="mt-1 text-sm text-text-muted">全局统计总览 · {{ today }}</p>
        </div>
        <div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
          <div class="rounded-xl border border-border bg-card-hover/60 px-3 py-2">
            <p class="text-[10px] text-text-muted">待处理</p>
            <p class="mt-1 text-lg font-semibold text-text-primary">{{ todayPendingCount }}</p>
          </div>
          <div class="rounded-xl border border-border bg-card-hover/60 px-3 py-2">
            <p class="text-[10px] text-text-muted">活跃目标</p>
            <p class="mt-1 text-lg font-semibold text-text-primary">{{ activeGoalCount }}</p>
          </div>
          <div class="rounded-xl border border-border bg-card-hover/60 px-3 py-2">
            <p class="text-[10px] text-text-muted">本周专注</p>
            <p class="mt-1 text-lg font-semibold text-text-primary">{{ weekFocusText }}</p>
          </div>
          <div class="rounded-xl border border-border bg-card-hover/60 px-3 py-2">
            <p class="text-[10px] text-text-muted">掌握度</p>
            <p class="mt-1 text-lg font-semibold text-text-primary">{{ masteredPercent }}%</p>
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div class="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" @click="router.push('/tasks')">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="list" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">任务总览</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click.stop="collapsed.tasks = !collapsed.tasks" :title="collapsed.tasks ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.tasks ? '' : 'rotate-90'">▸</span>
            </button>
            <span v-if="!collapsed.tasks" class="text-xs text-accent">查看 →</span>
          </div>
          <div v-show="!collapsed.tasks">
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-2xl font-bold text-text-primary">{{ weekCompletedTasks }}</p>
              <p class="mt-1 text-xs text-text-muted">本周完成</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-green-500">{{ taskCompletionRate }}%</p>
              <p class="mt-1 text-xs text-text-muted">完成率</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-amber-500">{{ todayPendingCount }}</p>
              <p class="mt-1 text-xs text-text-muted">今日待处理</p>
            </div>
          </div>
          </div>
        </div>

        <div class="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" @click="router.push('/goals')">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="target" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">目标进度</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click.stop="collapsed.goals = !collapsed.goals" :title="collapsed.goals ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.goals ? '' : 'rotate-90'">▸</span>
            </button>
            <span v-if="!collapsed.goals" class="text-xs text-accent">查看 →</span>
          </div>
          <div v-show="!collapsed.goals">
          <div class="grid grid-cols-2 gap-2 text-center mb-3">
            <div>
              <p class="text-2xl font-bold text-text-primary">{{ activeGoalCount }}</p>
              <p class="mt-1 text-xs text-text-muted">活跃目标</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-indigo-500">{{ avgGoalProgress }}%</p>
              <p class="mt-1 text-xs text-text-muted">平均进度</p>
            </div>
          </div>
          <button
            v-if="nearestDeadlineGoal"
            class="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
            @click.stop="collapsed.goalList = !collapsed.goalList"
          >
            <span>{{ collapsed.goalList ? '展开目标详情 ▸' : '收起目标详情 ▾' }}</span>
            <span class="text-[10px]">{{ goalStore.activeGoals.length }} 个目标</span>
          </button>
          <div v-show="!collapsed.goalList">
          <div v-if="nearestDeadlineGoal" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-card-hover" @click.stop="router.push(`/goals/${nearestDeadlineGoal.id}`)">
            <span class="text-lg">{{ goalStore.goalIcon(nearestDeadlineGoal.category) }}</span>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text-primary">{{ nearestDeadlineGoal.title }}</p>
              <p class="mt-0.5 text-xs text-text-muted">
                {{ goalStore.daysLeft(nearestDeadlineGoal.deadline).text }} · {{ nearestDeadlineGoal.deadline }}
              </p>
            </div>
          </div>
          <p v-else class="border-t border-border pt-3 text-xs text-text-muted/60">暂无活跃目标</p>
          </div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="chart" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">每周趋势</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click="collapsed.trend = !collapsed.trend" :title="collapsed.trend ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.trend ? '' : 'rotate-90'">▸</span>
            </button>
          </div>
          <div v-show="!collapsed.trend">
          <div class="mb-3 flex h-36 items-end justify-around gap-1">
            <div
              v-for="s in weekStats"
              :key="s.date"
              class="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div class="flex h-28 items-end gap-0.5">
                <div class="w-2.5 rounded-t-sm bg-blue-400 transition-all" :style="{ height: (s.tasks / weekMax * 100) + '%' }" :title="`${s.tasks} 个任务`"></div>
                <div class="w-2.5 rounded-t-sm bg-orange-400 transition-all" :style="{ height: (s.habits / weekMax * 100) + '%' }" :title="`${s.habits} 个习惯`"></div>
                <div class="w-2.5 rounded-t-sm bg-red-400 transition-all" :style="{ height: (Math.ceil(s.focusMin / 25) / weekMax * 100) + '%' }" :title="`${s.focusMin} 分钟专注`"></div>
              </div>
              <span class="text-[10px]" :class="s.isToday ? 'text-accent font-semibold' : 'text-text-muted'">{{ s.label }}</span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-4 border-t border-border pt-2 text-[10px] text-text-muted">
            <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm bg-blue-400"></span>任务</span>
            <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm bg-orange-400"></span>习惯</span>
            <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-sm bg-red-400"></span>专注</span>
            <span class="w-full sm:ml-auto sm:w-auto">单位：任务(个)·习惯(个)·专注(25m番茄)</span>
          </div>
          </div>
        </div>

        <div class="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" @click="router.push('/habits')">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="flame" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">习惯坚持</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click.stop="collapsed.habits = !collapsed.habits" :title="collapsed.habits ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.habits ? '' : 'rotate-90'">▸</span>
            </button>
            <span v-if="!collapsed.habits" class="text-xs text-accent">查看 →</span>
          </div>
          <div v-show="!collapsed.habits">
          <div class="mb-4 grid grid-cols-2 gap-2 text-center">
            <div>
              <p class="text-2xl font-bold text-text-primary">{{ todayHabitRate }}%</p>
              <p class="mt-1 text-xs text-text-muted">今日完成率</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-orange-500">{{ maxStreak }} 天</p>
              <p class="mt-1 text-xs text-text-muted">最长连续</p>
            </div>
          </div>
          <p class="mb-2 text-xs font-medium text-text-secondary">本周完成趋势</p>
          <div class="flex h-8 items-end gap-1">
            <div
              v-for="(v, i) in weekHabitTrend"
              :key="i"
              class="flex-1 rounded-sm bg-orange-400 transition-all"
              :style="{ height: (v / habitTrendMax * 100) + '%' }"
              :title="`${weekDays[i].label} ${v} 个习惯`"
            ></div>
          </div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="clock" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">专注统计</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click="collapsed.focus = !collapsed.focus" :title="collapsed.focus ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.focus ? '' : 'rotate-90'">▸</span>
            </button>
          </div>
          <div v-show="!collapsed.focus">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-text-secondary">今日专注</span>
              <span class="text-sm font-semibold text-text-primary">{{ todayFocusText }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-text-secondary">本周专注</span>
              <span class="text-sm font-semibold text-text-primary">{{ weekFocusText }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-3">
              <span class="text-xs text-text-secondary">累计专注</span>
              <span class="text-base font-bold text-red-500">{{ totalFocusText }}</span>
            </div>
          </div>
          </div>
        </div>

        <div class="cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md" @click="router.push('/interview')">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <Icon name="book" :size="16" class="text-text-muted" />
            <p class="text-sm font-medium text-text-primary">面试题掌握度</p>
            <button class="ml-auto flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary" @click.stop="collapsed.interview = !collapsed.interview" :title="collapsed.interview ? '展开' : '折叠'">
              <span class="text-xs transition-transform" :class="collapsed.interview ? '' : 'rotate-90'">▸</span>
            </button>
            <span v-if="!collapsed.interview" class="text-xs text-accent">查看 →</span>
          </div>
          <div v-show="!collapsed.interview">
          <div class="mb-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-2xl font-bold text-text-primary">{{ totalQuestions }}</p>
              <p class="mt-1 text-xs text-text-muted">总题数</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-green-500">{{ masteredCount }}</p>
              <p class="mt-1 text-xs text-text-muted">已掌握</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-amber-500">{{ todayReviewCount }}</p>
              <p class="mt-1 text-xs text-text-muted">待复习</p>
            </div>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-card-hover">
            <div class="h-full rounded-full bg-green-500 transition-all" :style="{ width: masteredPercent + '%' }"></div>
          </div>
          <p class="mt-1 text-[10px] text-text-muted">已掌握 {{ masteredPercent }}%</p>
          </div>
        </div>
    </div>
  </div>
</template>
