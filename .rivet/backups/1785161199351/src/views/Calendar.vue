<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useJournalStore } from '@/stores/journal'

const taskStore = useTaskStore()
const dailyStore = useDailyStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const journalStore = useJournalStore()

const todayStr = () => new Date().toISOString().slice(0, 10)

// ---- 月份导航 ----
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())  // 0-indexed
const selectedDate = ref(todayStr())

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
  const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0)
  const startWeekday = firstDay.getDay()  // 0=周日
  const daysInMonth = lastDay.getDate()

  const cells: { date: string; day: number; inMonth: boolean }[] = []
  // 上月填充
  const prevMonthDays = new Date(viewYear.value, viewMonth.value, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const date = new Date(viewYear.value, viewMonth.value - 1, d).toISOString().slice(0, 10)
    cells.push({ date, day: d, inMonth: false })
  }
  // 本月
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear.value, viewMonth.value, d).toISOString().slice(0, 10)
    cells.push({ date, day: d, inMonth: true })
  }
  // 下月填充到 42 格
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(viewYear.value, viewMonth.value + 1, d).toISOString().slice(0, 10)
    cells.push({ date, day: d, inMonth: false })
  }
  return cells
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// ---- 每日活动统计 ----
function dayStats(date: string) {
  const tasks = taskStore.tasks.filter((t) => t.scheduledDate === date || t.completedAt?.slice(0, 10) === date)
  const taskDone = tasks.filter((t) => t.status === 'done').length
  const plan = dailyStore.plans.find((p) => p.date === date)
  const planTaskCount = plan?.taskIds.length || 0

  // 习惯：有 completedDates 包含该日期的
  const habitsDone = habitStore.habits.filter((h) => h.completedDates.includes(date)).length

  // 专注
  const focusSessions = focusStore.sessions.filter((s) => s.createdAt.slice(0, 10) === date)
  const focusSeconds = focusSessions.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.duration, 0)
  const focusMinutes = Math.round(focusSeconds / 60)

  // 日志
  const journal = journalStore.journals.find((j) => j.date === date)

  const hasActivity = taskDone > 0 || habitsDone > 0 || focusMinutes > 0 || !!journal
  return { tasks, taskDone, planTaskCount, habitsDone, focusMinutes, focusSessions: focusSessions.length, journal, hasActivity }
}

// ---- 选中日期详情 ----
const selectedStats = computed(() => dayStats(selectedDate.value))
const isToday = computed(() => selectedDate.value === todayStr())
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <!-- 标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">📅 日历</h1>
        <p class="text-xs text-text-muted mt-1">回顾每一天的完成情况</p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <!-- 月视图 -->
      <div class="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
        <!-- 月份导航 -->
        <div class="flex items-center justify-between mb-4">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="prevMonth">←</button>
          <span class="text-lg font-semibold text-text-primary">{{ monthLabel }}</span>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="nextMonth">→</button>
        </div>

        <!-- 星期表头 -->
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div v-for="w in weekdays" :key="w" class="text-center text-xs text-text-muted font-medium py-1">{{ w }}</div>
        </div>

        <!-- 日期网格 -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="cell in calendarDays"
            :key="cell.date"
            class="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
            :class="[
              cell.inMonth ? '' : 'opacity-30',
              selectedDate === cell.date ? 'bg-accent text-white font-bold' : dayStats(cell.date).hasActivity ? 'bg-accent/8 hover:bg-accent/15' : 'hover:bg-card-hover'
            ]"
            @click="selectedDate = cell.date"
          >
            <span class="text-sm">{{ cell.day }}</span>
            <!-- 活动指示点 -->
            <div v-if="cell.inMonth && dayStats(cell.date).hasActivity" class="flex gap-0.5 mt-0.5">
              <span v-if="dayStats(cell.date).taskDone > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-blue-400'"></span>
              <span v-if="dayStats(cell.date).habitsDone > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-orange-400'"></span>
              <span v-if="dayStats(cell.date).focusMinutes > 0" class="w-1 h-1 rounded-full" :class="selectedDate === cell.date ? 'bg-white' : 'bg-red-400'"></span>
            </div>
          </button>
        </div>

        <!-- 图例 -->
        <div class="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-text-muted">
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>任务</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span>习惯</span>
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>专注</span>
        </div>
      </div>

      <!-- 日期详情 -->
      <div class="space-y-4">
        <div class="bg-card border border-border rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-text-primary">{{ isToday ? '今天' : selectedDate }}</h3>
            <span v-if="selectedStats.hasActivity" class="text-xs text-green-600 font-medium">有记录</span>
            <span v-else class="text-xs text-text-muted">无记录</span>
          </div>

          <!-- 任务完成 -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted">📋 任务完成</span>
              <span class="text-xs font-medium text-text-primary">{{ selectedStats.taskDone }} / {{ selectedStats.tasks.length }}</span>
            </div>
            <div v-if="selectedStats.tasks.length > 0" class="space-y-1 max-h-40 overflow-y-auto">
              <div v-for="t in selectedStats.tasks" :key="t.id" class="flex items-center gap-2 text-xs py-1">
                <span class="w-4 h-4 rounded border flex items-center justify-center shrink-0" :class="t.status==='done'?'bg-accent border-accent text-white':'border-border'">
                  <span v-if="t.status==='done'">✓</span>
                </span>
                <span :class="t.status==='done'?'text-text-muted line-through':'text-text-secondary'">{{ t.title }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-text-muted italic">当天无任务记录</p>
          </div>

          <!-- 习惯打卡 -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted">🔥 习惯打卡</span>
              <span class="text-xs font-medium text-text-primary">{{ selectedStats.habitsDone }} 个</span>
            </div>
            <div v-if="selectedStats.habitsDone > 0" class="flex flex-wrap gap-1">
              <span v-for="h in habitStore.habits.filter((h) => h.completedDates.includes(selectedDate))" :key="h.id" class="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-600">
                {{ habitStore.habitCategoryMeta[h.category]?.icon || '✅' }} {{ h.name }}
              </span>
            </div>
            <p v-else class="text-xs text-text-muted italic">当天无打卡记录</p>
          </div>

          <!-- 专注时间 -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted">🍅 专注时间</span>
              <span class="text-xs font-medium text-text-primary">{{ selectedStats.focusMinutes }} 分钟 · {{ selectedStats.focusSessions }} 次</span>
            </div>
            <div v-if="selectedStats.focusMinutes > 0" class="h-1.5 bg-card-hover rounded-full overflow-hidden">
              <div class="h-full bg-red-400 rounded-full transition-all" :style="{ width: Math.min(selectedStats.focusMinutes / 120 * 100, 100) + '%' }"></div>
            </div>
            <p v-else class="text-xs text-text-muted italic">当天无专注记录</p>
          </div>

          <!-- 每日总结 -->
          <div>
            <span class="text-xs text-text-muted block mb-2">✏️ 每日总结</span>
            <p v-if="selectedStats.journal" class="text-xs text-text-secondary whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{{ selectedStats.journal.content }}</p>
            <p v-else class="text-xs text-text-muted italic">当天无总结记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
