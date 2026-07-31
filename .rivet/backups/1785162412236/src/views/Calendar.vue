<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useJournalStore } from '@/stores/journal'
import TaskModal from '@/components/TaskModal.vue'

const router = useRouter()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const journalStore = useJournalStore()

const todayStr = () => new Date().toISOString().slice(0, 10)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const selectedDate = ref(todayStr())
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

function dayHasActivity(date: string): boolean {
  const tasks = taskStore.tasks.filter((t) => t.scheduledDate === date || t.completedAt?.slice(0, 10) === date)
  const taskDone = tasks.some((t) => t.status === 'done')
  const habitsDone = habitStore.habits.some((h) => (h.completedDates || []).includes(date))
  const focus = focusStore.sessions.some((s) => s.createdAt.slice(0, 10) === date)
  const journal = journalStore.journals.some((j) => j.date === date)
  return taskDone || habitsDone || focus || journal
}

// ---- 选中日期类型 ----
const dateType = computed<'past' | 'today' | 'future'>(() => {
  const today = todayStr()
  if (selectedDate.value < today) return 'past'
  if (selectedDate.value === today) return 'today'
  return 'future'
})

// ---- 选中日期数据 ----
const selectedTasks = computed(() => taskStore.tasks.filter((t) =>
  t.scheduledDate === selectedDate.value || t.completedAt?.slice(0, 10) === selectedDate.value
))
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

// ---- 未来日期创建任务 ----
function addTaskForDate() { showCreate.value = true }
</script>

<template>
  <div class="space-y-4 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">📅 日历</h1>
      <button class="text-xs text-accent hover:underline" @click="router.push('/')">← 返回今天</button>
    </div>

    <!-- 紧凑月历（页面 30% 高度） -->
    <div class="bg-card border border-border rounded-2xl p-4">
      <div class="flex items-center justify-between mb-3">
        <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="prevMonth">←</button>
        <span class="text-sm font-semibold text-text-primary">{{ monthLabel }}</span>
        <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="nextMonth">→</button>
      </div>
      <div class="grid grid-cols-7 gap-0.5 mb-1">
        <div v-for="w in weekdays" :key="w" class="text-center text-xs text-text-muted py-0.5">{{ w }}</div>
      </div>
      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="cell in calendarDays" :key="cell.date"
          class="aspect-square rounded text-xs flex items-center justify-center transition-all relative"
          :class="[
            cell.inMonth ? '' : 'opacity-25',
            selectedDate === cell.date ? 'bg-accent text-white font-bold' : cell.inMonth && dayHasActivity(cell.date) ? 'bg-accent/8 hover:bg-accent/15' : 'hover:bg-card-hover'
          ]"
          @click="selectedDate = cell.date"
        >
          {{ cell.day }}
          <span v-if="cell.inMonth && dayHasActivity(cell.date) && selectedDate !== cell.date" class="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent"></span>
        </button>
      </div>
    </div>

    <!-- 日期详情（三态） -->
    <div class="bg-card border border-border rounded-2xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-text-primary">{{ selectedLabel }}</h3>
        <span class="text-xs" :class="dateType==='today'?'text-accent font-medium':dateType==='future'?'text-blue-500':'text-text-muted'">
          {{ dateType === 'today' ? '今天' : dateType === 'future' ? '未来' : '历史' }}
        </span>
      </div>

      <!-- 过去日期：完成回顾 -->
      <template v-if="dateType === 'past'">
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="text-center bg-gray-50 rounded-lg py-3">
            <p class="text-xl font-bold text-text-primary">{{ selectedDoneTasks.length }}/{{ selectedTasks.length }}</p>
            <p class="text-xs text-text-muted">📋 任务</p>
          </div>
          <div class="text-center bg-gray-50 rounded-lg py-3">
            <p class="text-xl font-bold text-text-primary">{{ selectedHabits.length }}</p>
            <p class="text-xs text-text-muted">🔥 习惯</p>
          </div>
          <div class="text-center bg-gray-50 rounded-lg py-3">
            <p class="text-xl font-bold text-text-primary">{{ selectedFocusMin }}<span class="text-xs">m</span></p>
            <p class="text-xs text-text-muted">🍅 专注</p>
          </div>
        </div>
        <div v-if="selectedTasks.length > 0" class="mb-4">
          <p class="text-xs text-text-muted mb-2">任务完成情况</p>
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
        <div v-if="!selectedTasks.length && !selectedHabits.length && selectedFocusMin === 0 && !selectedJournal" class="text-center py-8 text-text-muted text-sm">
          <span>当天没有记录</span>
        </div>
      </template>

      <!-- 今天：执行视图 -->
      <template v-if="dateType === 'today'">
        <p class="text-xs text-text-muted mb-3">今日计划 {{ selectedPlan?.taskIds.length || 0 }} 个任务</p>
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
        <div class="flex gap-2 pt-2 border-t border-border">
          <button class="text-xs text-accent hover:underline" @click="router.push('/')">→ 前往今日执行</button>
        </div>
      </template>

      <!-- 未来日期：规划视图 -->
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
        <button class="w-full py-2 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors" @click="addTaskForDate">+ 添加任务到 {{ selectedLabel }}</button>
      </template>
    </div>

    <TaskModal :visible="showCreate" :preset-date="selectedDate" @close="showCreate = false" />
  </div>
</template>
