<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useJournalStore } from '@/stores/journal'
import { useGoalStore } from '@/stores/goals'
import TaskModal from '@/components/TaskModal.vue'

const router = useRouter()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const goalStore = useGoalStore()
const journalStore = useJournalStore()

const todayStr = () => new Date().toISOString().slice(0, 10)
const viewMode = ref<'month' | 'week'>('month')
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const selectedDate = ref(todayStr())

// ---- 周视图 ----
const weekStart = ref(getWeekStart(new Date()))
function getWeekStart(d: Date): Date { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s }
function prevWeek() { weekStart.value = new Date(weekStart.value.getTime() - 7 * 86400000) }
function nextWeek() { weekStart.value = new Date(weekStart.value.getTime() + 7 * 86400000) }
function goThisWeek() { weekStart.value = getWeekStart(new Date()) }

const weekDays = computed(() => {
  const days: { date: string; day: number; month: number; label: string; isToday: boolean }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value.getTime() + i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    days.push({
      date: dateStr, day: d.getDate(), month: d.getMonth() + 1,
      label: ['日','一','二','三','四','五','六'][d.getDay()],
      isToday: dateStr === todayStr(),
    })
  }
  return days
})

function weekDayTasks(date: string) {
  const planIds = new Set(goalStore.allTaskIdsByDate(date))
  return taskStore.tasks.filter((t) =>
    t.scheduledDate === date || t.completedAt?.slice(0,10) === date || planIds.has(t.id)
  )
}
function weekDayHabits(date: string) {
  return habitStore.habits.filter((h) => (h.completedDates || []).includes(date))
}
function weekDayFocus(date: string): number {
  return Math.round(focusStore.sessions
    .filter((s) => s.createdAt.slice(0,10) === date && s.status === 'completed')
    .reduce((sum, s) => sum + s.duration, 0) / 60)
}

function selectDate(date: string) {
  selectedDate.value = date
  // 切换到对应月份
  const d = new Date(date)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

const showCreate = ref(false)

const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)

function prevMonth() { if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- } else viewMonth.value-- }
function nextMonth() { if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ } else viewMonth.value++ }

const calendarDays = computed(() => {
  const startWeekday = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells: { date: string; day: number; inMonth: boolean }[] = []
  const prevDays = new Date(viewYear.value, viewMonth.value, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) cells.push({ date: new Date(viewYear.value, viewMonth.value - 1, prevDays - i).toISOString().slice(0, 10), day: prevDays - i, inMonth: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(viewYear.value, viewMonth.value, d).toISOString().slice(0, 10), day: d, inMonth: true })
  const rem = 42 - cells.length
  for (let d = 1; d <= rem; d++) cells.push({ date: new Date(viewYear.value, viewMonth.value + 1, d).toISOString().slice(0, 10), day: d, inMonth: false })
  return cells
})
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ---- 日期状态点 ----
function dayDots(date: string) {
  const tasks = taskStore.tasks.some((t) => (t.scheduledDate === date || t.completedAt?.slice(0, 10) === date) && t.status === 'done')
  const habits = habitStore.habits.some((h) => (h.completedDates || []).includes(date))
  const focus = focusStore.sessions.some((s) => s.createdAt.slice(0, 10) === date && s.status === 'completed')
  return { tasks, habits, focus }
}
function hasAnyActivity(date: string): boolean {
  const d = dayDots(date)
  return d.tasks || d.habits || d.focus
}

// ---- 选中日期类型 ----
const dateType = computed<'past' | 'today' | 'future'>(() => {
  const today = todayStr()
  if (selectedDate.value < today) return 'past'
  if (selectedDate.value === today) return 'today'
  return 'future'
})

// ---- 统一统计数据 ----
const selectedTasks = computed(() => {
  // 三源合并：scheduledDate 匹配 + completedAt 匹配 + Goal.plan 中该日期的 taskIds
  const planTaskIds = new Set(goalStore.allTaskIdsByDate(selectedDate.value))
  return taskStore.tasks.filter((t) =>
    t.scheduledDate === selectedDate.value ||
    t.completedAt?.slice(0, 10) === selectedDate.value ||
    planTaskIds.has(t.id)
  )
})
const selectedDoneTasks = computed(() => selectedTasks.value.filter((t) => t.status === 'done'))
const selectedHabits = computed(() => habitStore.habits.filter((h) => (h.completedDates || []).includes(selectedDate.value)))
const selectedFocusMin = computed(() => Math.round(
  focusStore.sessions.filter((s) => s.createdAt.slice(0, 10) === selectedDate.value && s.status === 'completed')
    .reduce((sum, s) => sum + s.duration, 0) / 60
))
const selectedJournal = computed(() => journalStore.journals.find((j) => j.date === selectedDate.value))
const selectedPlan = computed(() => dailyStore.plans.find((p) => p.date === selectedDate.value))

const selectedLabel = computed(() => {
  const d = new Date(selectedDate.value)
  const wd = ['日','一','二','三','四','五','六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${wd}`
})

const typeLabel = computed(() => dateType.value === 'today' ? '今天' : dateType.value === 'future' ? '未来计划' : '历史回顾')
const typeColor = computed(() => dateType.value === 'today' ? 'text-accent' : dateType.value === 'future' ? 'text-blue-500' : 'text-text-muted')

function addTaskForDate() { showCreate.value = true }
</script>

<template>
  <div class="space-y-4 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">📅 日历</h1>
      <div class="flex items-center gap-2">
        <div class="flex rounded-lg bg-card-hover border border-border overflow-hidden">
          <button class="px-3 py-1 text-xs transition-colors" :class="viewMode==='month'?'bg-accent text-white':'text-text-secondary'" @click="viewMode='month'">月</button>
          <button class="px-3 py-1 text-xs transition-colors" :class="viewMode==='week'?'bg-accent text-white':'text-text-secondary'" @click="viewMode='week'">周</button>
        </div>
        <button class="text-xs text-accent hover:underline" @click="router.push('/')">← 返回今天</button>
      </div>
    </div>

    <!-- 月视图 -->
    <div v-if="viewMode === 'month'" class="bg-card border border-border rounded-2xl p-4">
      <div class="flex items-center justify-between mb-3">
        <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="prevMonth">←</button>
        <span class="text-sm font-semibold text-text-primary">{{ monthLabel }}</span>
        <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="nextMonth">→</button>
      </div>

      <div class="grid grid-cols-7 gap-0.5 mb-1">
        <div v-for="w in weekdays" :key="w" class="text-center text-xs text-text-muted py-1">{{ w }}</div>
      </div>

      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="cell in calendarDays" :key="cell.date"
          class="aspect-square flex flex-col items-center justify-center transition-all relative group"
          @click="selectedDate = cell.date"
        >
          <!-- 圆形背景 -->
          <span
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all"
            :class="[
              !cell.inMonth ? 'text-gray-300' :
              selectedDate === cell.date ? 'bg-accent text-white font-bold' :
              cell.date === todayStr() ? 'bg-accent/10 text-accent font-medium ring-1 ring-accent/30' :
              hasAnyActivity(cell.date) ? 'text-text-primary hover:bg-accent/8' :
              'text-text-secondary hover:bg-card-hover'
            ]"
          >{{ cell.day }}</span>
          <!-- 状态点 -->
          <div v-if="cell.inMonth && hasAnyActivity(cell.date)" class="flex gap-0.5 mt-0.5 h-1">
            <span v-if="dayDots(cell.date).tasks" class="w-1 h-1 rounded-full bg-blue-400"></span>
            <span v-if="dayDots(cell.date).habits" class="w-1 h-1 rounded-full bg-orange-400"></span>
            <span v-if="dayDots(cell.date).focus" class="w-1 h-1 rounded-full bg-red-400"></span>
          </div>
        </button>
      </div>

      <!-- 图例 -->
      <div class="flex items-center gap-4 mt-3 pt-2 border-t border-border text-xs text-text-muted">
        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>任务</span>
        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>习惯</span>
        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>专注</span>
        <span class="ml-auto flex items-center gap-1"><span class="w-2 h-2 rounded-full ring-1 ring-accent/30 bg-accent/10"></span>今天</span>
      </div>
    </div>

    <!-- 周视图 -->
    <div v-if="viewMode === 'week'" class="bg-card border border-border rounded-2xl p-4">
      <div class="flex items-center justify-between mb-4">
        <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="prevWeek">←</button>
        <span class="text-sm font-semibold text-text-primary">{{ weekDays[0]?.month }}月{{ weekDays[0]?.day }}日 - {{ weekDays[6]?.month }}月{{ weekDays[6]?.day }}日</span>
        <div class="flex items-center gap-1">
          <button class="text-xs text-accent hover:underline" @click="goThisWeek">本周</button>
          <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="nextWeek">→</button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-2">
        <div v-for="d in weekDays" :key="d.date" class="min-h-[200px] rounded-xl p-2 cursor-pointer transition-colors"
          :class="[d.isToday ? 'bg-accent/5 ring-1 ring-accent/30' : 'hover:bg-card-hover', selectedDate === d.date ? 'ring-2 ring-accent' : '']"
          @click="selectDate(d.date)">
          <div class="text-center mb-2">
            <p class="text-xs text-text-muted">{{ d.label }}</p>
            <p class="text-lg font-bold" :class="d.isToday ? 'text-accent' : 'text-text-primary'">{{ d.day }}</p>
          </div>

          <!-- 任务 -->
          <div v-if="weekDayTasks(d.date).length > 0" class="space-y-0.5 mb-1.5">
            <div v-for="t in weekDayTasks(d.date).slice(0, 3)" :key="t.id" class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="t.status==='done'?'bg-green-400':'bg-blue-400'"></span>
              <span class="text-[10px] truncate" :class="t.status==='done'?'text-text-muted line-through':'text-text-secondary'">{{ t.title }}</span>
            </div>
            <p v-if="weekDayTasks(d.date).length > 3" class="text-[10px] text-text-muted pl-2">+{{ weekDayTasks(d.date).length - 3 }} 项</p>
          </div>

          <!-- 习惯 -->
          <div v-if="weekDayHabits(d.date).length > 0" class="flex flex-wrap gap-0.5">
            <span v-for="h in weekDayHabits(d.date)" :key="h.id" class="text-[10px] px-1 py-0.5 rounded bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">{{ h.name.slice(0,4) }}</span>
          </div>

          <!-- 专注 -->
          <p v-if="weekDayFocus(d.date) > 0" class="text-[10px] text-text-muted mt-1">🍅 {{ weekDayFocus(d.date) }}m</p>
        </div>
      </div>
    </div>

    <!-- 日期详情（固定结构） -->
    <div class="bg-card border border-border rounded-2xl p-5">
      <!-- 标题 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-text-primary">{{ selectedLabel }}</h3>
        <span class="text-xs font-medium" :class="typeColor">{{ typeLabel }}</span>
      </div>

      <!-- 统一统计卡 -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="text-center bg-gray-50 rounded-xl py-3">
          <p class="text-2xl font-bold text-text-primary">{{ selectedDoneTasks.length }}<span class="text-sm text-text-muted">/{{ selectedTasks.length }}</span></p>
          <p class="text-xs text-text-muted mt-0.5">📋 任务完成</p>
        </div>
        <div class="text-center bg-gray-50 rounded-xl py-3">
          <p class="text-2xl font-bold text-text-primary">{{ selectedHabits.length }}</p>
          <p class="text-xs text-text-muted mt-0.5">🔥 习惯完成</p>
        </div>
        <div class="text-center bg-gray-50 rounded-xl py-3">
          <p class="text-2xl font-bold text-text-primary">{{ selectedFocusMin }}<span class="text-sm text-text-muted">m</span></p>
          <p class="text-xs text-text-muted mt-0.5">🍅 专注时间</p>
        </div>
      </div>

      <!-- 过去：历史记录 -->
      <template v-if="dateType === 'past'">
        <div v-if="selectedTasks.length > 0" class="mb-4">
          <p class="text-xs text-text-muted mb-2">任务详情</p>
          <div class="space-y-1">
            <div v-for="t in selectedTasks" :key="t.id" class="flex items-center gap-2 text-xs py-1">
              <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0" :class="t.status==='done'?'bg-accent border-accent text-white':'border-border'"><span v-if="t.status==='done'">✓</span></span>
              <span :class="t.status==='done'?'text-text-muted line-through':'text-text-secondary'">{{ t.title }}</span>
            </div>
          </div>
        </div>
        <div v-if="selectedHabits.length > 0" class="mb-4">
          <p class="text-xs text-text-muted mb-2">习惯打卡</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="h in selectedHabits" :key="h.id" class="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600">{{ habitStore.habitCategoryMeta[h.category]?.icon || '✅' }} {{ h.name }}</span>
          </div>
        </div>
        <div v-if="selectedJournal">
          <p class="text-xs text-text-muted mb-2">日志总结</p>
          <p class="text-xs text-text-secondary whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{{ selectedJournal.content }}</p>
        </div>
        <div v-if="!selectedTasks.length && !selectedHabits.length && selectedFocusMin === 0 && !selectedJournal" class="text-center py-6 text-text-muted text-sm">
          <span>当天没有记录</span>
        </div>
      </template>

      <!-- 今天：执行计划 -->
      <template v-if="dateType === 'today'">
        <p class="text-xs text-text-muted mb-3">今日计划 {{ selectedPlan?.taskIds.length || 0 }} 个任务 · {{ selectedTasks.length }} 个关联</p>
        <div v-if="selectedTasks.length > 0" class="space-y-1 mb-4">
          <div v-for="t in selectedTasks" :key="t.id" class="flex items-center gap-2 text-xs py-1">
            <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0" :class="t.status==='done'?'bg-accent border-accent text-white':'border-border'"><span v-if="t.status==='done'">✓</span></span>
            <span :class="t.status==='done'?'text-text-muted line-through':'text-text-secondary'">{{ t.title }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-text-muted italic mb-4">还没有计划任务</p>
        <div v-if="selectedHabits.length > 0" class="mb-4">
          <p class="text-xs text-text-muted mb-2">已打卡习惯</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="h in selectedHabits" :key="h.id" class="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600">{{ habitStore.habitCategoryMeta[h.category]?.icon || '✅' }} {{ h.name }}</span>
          </div>
        </div>
        <button class="text-xs text-accent hover:underline" @click="router.push('/')">→ 前往今日执行</button>
      </template>

      <!-- 未来：规划 + 添加 -->
      <template v-if="dateType === 'future'">
        <div v-if="selectedTasks.length > 0" class="mb-4">
          <p class="text-xs text-text-muted mb-2">已安排任务（{{ selectedTasks.length }}）</p>
          <div class="space-y-1">
            <div v-for="t in selectedTasks" :key="t.id" class="flex items-center gap-2 text-xs py-1">
              <span class="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
              <span class="text-text-secondary">{{ t.title }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 text-text-muted text-sm mb-4">
          <span>这天还没有安排</span>
        </div>
        <button class="w-full py-2.5 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors" @click="addTaskForDate">+ 添加任务到 {{ selectedLabel }}</button>
      </template>
    </div>

    <TaskModal :visible="showCreate" :preset-date="selectedDate" @close="showCreate = false" />
  </div>
</template>
