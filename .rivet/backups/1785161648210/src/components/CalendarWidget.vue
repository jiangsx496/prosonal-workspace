<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useJournalStore } from '@/stores/journal'

const taskStore = useTaskStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const journalStore = useJournalStore()

const todayStr = () => new Date().toISOString().slice(0, 10)

// ---- 折叠状态 ----
const expanded = ref(false)
const selectedDate = ref(todayStr())

// ---- 月份导航 ----
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

// ---- 日历网格 ----
const calendarDays = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const cells: { date: string; day: number; inMonth: boolean }[] = []
  const prevMonthDays = new Date(viewYear.value, viewMonth.value, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    cells.push({ date: new Date(viewYear.value, viewMonth.value - 1, d).toISOString().slice(0, 10), day: d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear.value, viewMonth.value, d).toISOString().slice(0, 10), day: d, inMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(viewYear.value, viewMonth.value + 1, d).toISOString().slice(0, 10), day: d, inMonth: false })
  }
  return cells
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ---- 本月计划数量 ----
const monthPlanCount = computed(() => {
  const prefix = `${viewYear.value}-${(viewMonth.value + 1).toString().padStart(2, '0')}`
  return taskStore.tasks.filter((t) => t.scheduledDate?.startsWith(prefix)).length
})

// ---- 每日活动统计 ----
function dayStats(date: string) {
  const tasks = taskStore.tasks.filter((t) => t.scheduledDate === date || t.completedAt?.slice(0, 10) === date)
  const taskDone = tasks.filter((t) => t.status === 'done').length
  const habitsDone = habitStore.habits.filter((h) => (h.completedDates || []).includes(date)).length
  const focusSessions = focusStore.sessions.filter((s) => s.createdAt.slice(0, 10) === date)
  const focusMinutes = Math.round(focusSessions.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.duration, 0) / 60)
  const journal = journalStore.journals.find((j) => j.date === date)
  const hasActivity = taskDone > 0 || habitsDone > 0 || focusMinutes > 0 || !!journal
  return { tasks, taskDone, habitsDone, focusMinutes, focusSessions: focusSessions.length, journal, hasActivity }
}

const selectedStats = computed(() => dayStats(selectedDate.value))
const isToday = computed(() => selectedDate.value === todayStr())
const todayDate = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})
</script>

<template>
  <div class="bg-card border border-border rounded-2xl overflow-hidden">
    <!-- 折叠头部 -->
    <button class="w-full flex items-center justify-between p-5 hover:bg-card-hover transition-colors" @click="expanded = !expanded">
      <div class="flex items-center gap-3">
        <span class="text-xl">📅</span>
        <div class="text-left">
          <p class="text-sm font-semibold text-text-primary">日历</p>
          <p class="text-xs text-text-muted">今天 {{ todayDate }} · 本月 {{ monthPlanCount }} 个计划</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-400" v-if="dayStats(todayStr()).hasActivity" title="今天有记录"></span>
        <span class="text-text-muted text-sm transition-transform" :class="{ 'rotate-180': expanded }">▾</span>
      </div>
    </button>

    <!-- 展开内容 -->
    <div v-if="expanded" class="border-t border-border p-5 space-y-4">
      <!-- 月视图 -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="prevMonth">←</button>
          <span class="text-sm font-semibold text-text-primary">{{ monthLabel }}</span>
          <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="nextMonth">→</button>
        </div>

        <div class="grid grid-cols-7 gap-1 mb-1">
          <div v-for="w in weekdays" :key="w" class="text-center text-xs text-text-muted py-1">{{ w }}</div>
        </div>

        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="cell in calendarDays"
            :key="cell.date"
            class="aspect-square rounded-lg flex flex-col items-center justify-center transition-all"
            :class="[
              cell.inMonth ? '' : 'opacity-30',
              selectedDate === cell.date ? 'bg-accent text-white font-bold' : dayStats(cell.date).hasActivity ? 'bg-accent/8 hover:bg-accent/15' : 'hover:bg-card-hover'
            ]"
            @click="selectedDate = cell.date"
          >
            <span class="text-xs">{{ cell.day }}</span>
            <div v-if="cell.inMonth && dayStats(cell.date).hasActivity" class="flex gap-0.5 mt-0.5">
              <span v-if="dayStats(cell.date).taskDone > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-blue-400'"></span>
              <span v-if="dayStats(cell.date).habitsDone > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-orange-400'"></span>
              <span v-if="dayStats(cell.date).focusMinutes > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-red-400'"></span>
            </div>
          </button>
        </div>

        <div class="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>任务</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>习惯</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>专注</span>
        </div>
      </div>

      <!-- 选中日期详情 -->
      <div class="bg-gray-50 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-text-primary">{{ isToday ? '今天' : selectedDate }}</span>
          <span v-if="selectedStats.hasActivity" class="text-xs text-green-600">有记录</span>
          <span v-else class="text-xs text-text-muted">无记录</span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-white rounded-lg py-2">
            <p class="text-lg font-bold text-text-primary">{{ selectedStats.taskDone }}/{{ selectedStats.tasks.length }}</p>
            <p class="text-xs text-text-muted">📋 任务</p>
          </div>
          <div class="bg-white rounded-lg py-2">
            <p class="text-lg font-bold text-text-primary">{{ selectedStats.habitsDone }}</p>
            <p class="text-xs text-text-muted">🔥 习惯</p>
          </div>
          <div class="bg-white rounded-lg py-2">
            <p class="text-lg font-bold text-text-primary">{{ selectedStats.focusMinutes }}<span class="text-xs">m</span></p>
            <p class="text-xs text-text-muted">🍅 专注</p>
          </div>
        </div>

        <div v-if="selectedStats.tasks.length > 0">
          <p class="text-xs text-text-muted mb-1">任务详情</p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <div v-for="t in selectedStats.tasks" :key="t.id" class="flex items-center gap-2 text-xs">
              <span class="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0" :class="t.status==='done'?'bg-accent border-accent text-white':'border-border'">
                <span v-if="t.status==='done'" class="text-[8px]">✓</span>
              </span>
              <span :class="t.status==='done'?'text-text-muted line-through':'text-text-secondary'">{{ t.title }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedStats.journal">
          <p class="text-xs text-text-muted mb-1">日志摘要</p>
          <p class="text-xs text-text-secondary whitespace-pre-wrap bg-white rounded-lg p-2 max-h-24 overflow-y-auto">{{ selectedStats.journal.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
