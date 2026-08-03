<script setup lang="ts">
import { computed } from 'vue'
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
    <div>
      <h1 class="text-2xl font-bold text-text-primary">数据看板</h1>
      <p class="text-xs text-text-muted mt-1">全局统计总览 · {{ today }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- a) 任务总览 -->
      <div class="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 transition-colors" @click="router.push('/tasks')">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="list" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">任务总览</p>
          <span class="ml-auto text-xs text-accent">查看 →</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-2xl font-bold text-text-primary">{{ weekCompletedTasks }}</p>
            <p class="text-xs text-text-muted mt-1">本周完成</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-500">{{ taskCompletionRate }}%</p>
            <p class="text-xs text-text-muted mt-1">完成率</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-500">{{ todayPendingCount }}</p>
            <p class="text-xs text-text-muted mt-1">今日待处理</p>
          </div>
        </div>
      </div>

      <!-- b) 习惯坚持 -->
      <div class="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 transition-colors" @click="router.push('/habits')">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="flame" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">习惯坚持</p>
          <span class="ml-auto text-xs text-accent">查看 →</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-center mb-4">
          <div>
            <p class="text-2xl font-bold text-text-primary">{{ todayHabitRate }}%</p>
            <p class="text-xs text-text-muted mt-1">今日完成率</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-orange-500">{{ maxStreak }} 天</p>
            <p class="text-xs text-text-muted mt-1">最长连续</p>
          </div>
        </div>
        <p class="text-xs font-medium text-text-secondary mb-2">本周完成趋势</p>
        <div class="flex items-end gap-1 h-8">
          <div
            v-for="(v, i) in weekHabitTrend"
            :key="i"
            class="flex-1 rounded-sm bg-orange-400 transition-all"
            :style="{ height: (v / habitTrendMax * 100) + '%' }"
            :title="`${weekDays[i].label} ${v} 个习惯`"
          ></div>
        </div>
      </div>

      <!-- c) 专注统计 -->
      <div class="bg-card border border-border rounded-xl p-5">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="clock" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">专注统计</p>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">今日专注</span>
            <span class="text-sm font-semibold text-text-primary">{{ todayFocusText }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary">本周专注</span>
            <span class="text-sm font-semibold text-text-primary">{{ weekFocusText }}</span>
          </div>
          <div class="flex items-center justify-between pt-3 border-t border-border">
            <span class="text-xs text-text-secondary">累计专注</span>
            <span class="text-base font-bold text-red-500">{{ totalFocusText }}</span>
          </div>
        </div>
      </div>

      <!-- d) 目标进度 -->
      <div class="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 transition-colors" @click="router.push('/goals')">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="target" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">目标进度</p>
          <span class="ml-auto text-xs text-accent">查看 →</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-center mb-4">
          <div>
            <p class="text-2xl font-bold text-text-primary">{{ activeGoalCount }}</p>
            <p class="text-xs text-text-muted mt-1">活跃目标</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-indigo-500">{{ avgGoalProgress }}%</p>
            <p class="text-xs text-text-muted mt-1">平均进度</p>
          </div>
        </div>
        <div v-if="nearestDeadlineGoal" class="flex items-center gap-2 pt-3 border-t border-border cursor-pointer hover:bg-card-hover rounded-lg -mx-2 px-2 py-1 transition-colors" @click.stop="router.push(`/goals/${nearestDeadlineGoal.id}`)">
          <span class="text-lg">{{ goalStore.goalIcon(nearestDeadlineGoal.category) }}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ nearestDeadlineGoal.title }}</p>
            <p class="text-xs text-text-muted mt-0.5">
              {{ goalStore.daysLeft(nearestDeadlineGoal.deadline).text }} · {{ nearestDeadlineGoal.deadline }}
            </p>
          </div>
        </div>
        <p v-else class="text-xs text-text-muted/60 pt-3 border-t border-border">暂无活跃目标</p>
      </div>

      <!-- e) 面试题掌握度 -->
      <div class="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-accent/40 transition-colors" @click="router.push('/interview')">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="book" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">面试题掌握度</p>
          <span class="ml-auto text-xs text-accent">查看 →</span>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-4">
          <div>
            <p class="text-2xl font-bold text-text-primary">{{ totalQuestions }}</p>
            <p class="text-xs text-text-muted mt-1">总题数</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-green-500">{{ masteredCount }}</p>
            <p class="text-xs text-text-muted mt-1">已掌握</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-500">{{ todayReviewCount }}</p>
            <p class="text-xs text-text-muted mt-1">待复习</p>
          </div>
        </div>
        <div class="h-2 rounded-full bg-card-hover overflow-hidden">
          <div
            class="h-full rounded-full bg-green-500 transition-all"
            :style="{ width: masteredPercent + '%' }"
          ></div>
        </div>
        <p class="text-[10px] text-text-muted mt-1">已掌握 {{ masteredPercent }}%</p>
      </div>

      <!-- f) 每周趋势图 -->
      <div class="bg-card border border-border rounded-xl p-5">
        <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
          <Icon name="chart" :size="16" class="text-text-muted" />
          <p class="text-sm font-medium text-text-primary">每周趋势</p>
        </div>
        <div class="flex items-end justify-around gap-1 h-32 mb-3">
          <div
            v-for="s in weekStats"
            :key="s.date"
            class="flex-1 flex flex-col items-center gap-1 h-full justify-end"
          >
            <div class="flex gap-0.5 items-end h-28">
              <div
                class="w-2.5 rounded-t-sm bg-blue-400 transition-all"
                :style="{ height: (s.tasks / weekMax * 100) + '%' }"
                :title="`${s.tasks} 个任务`"
              ></div>
              <div
                class="w-2.5 rounded-t-sm bg-orange-400 transition-all"
                :style="{ height: (s.habits / weekMax * 100) + '%' }"
                :title="`${s.habits} 个习惯`"
              ></div>
              <div
                class="w-2.5 rounded-t-sm bg-red-400 transition-all"
                :style="{ height: (Math.ceil(s.focusMin / 25) / weekMax * 100) + '%' }"
                :title="`${s.focusMin} 分钟专注`"
              ></div>
            </div>
            <span
              class="text-[10px]"
              :class="s.isToday ? 'text-accent font-semibold' : 'text-text-muted'"
            >{{ s.label }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 pt-2 border-t border-border text-[10px] text-text-muted flex-wrap">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-blue-400"></span>任务</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-orange-400"></span>习惯</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-red-400"></span>专注</span>
          <span class="w-full sm:ml-auto sm:w-auto">单位：任务(个)·习惯(个)·专注(25m番茄)</span>
        </div>
      </div>
    </div>
  </div>
</template>
