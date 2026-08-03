<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { localDateFromISO, todayLocal, computeDateLocal, localDateStr } from '@/utils/date'

const taskStore = useTaskStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()

const today = todayLocal()

/** 活跃度颜色等级（5 档） */
const LEVELS = ['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-500', 'bg-green-700']

interface HeatmapDay {
  date: string
  tasks: number
  habits: number
  focusMin: number
  activity: number
  isFuture: boolean
  isToday: boolean
}

// 预聚合：date → 完成任务数（与 taskStore.tasksCompletedOn 同语义：按 completedAt 统计）
const tasksByDate = computed(() => {
  const m = new Map<string, number>()
  for (const t of taskStore.tasks) {
    if (!t.completedAt) continue
    const d = localDateFromISO(t.completedAt)
    m.set(d, (m.get(d) || 0) + 1)
  }
  return m
})

// 预聚合：date → 习惯完成数
const habitsByDate = computed(() => {
  const m = new Map<string, number>()
  for (const h of habitStore.habits) {
    for (const d of h.completedDates || []) {
      m.set(d, (m.get(d) || 0) + 1)
    }
  }
  return m
})

// 预聚合：date → 已完成专注秒数
const focusSecondsByDate = computed(() => {
  const m = new Map<string, number>()
  for (const s of focusStore.sessions) {
    if (s.status !== 'completed') continue
    const d = localDateFromISO(s.createdAt)
    m.set(d, (m.get(d) || 0) + s.duration)
  }
  return m
})

// 53 周（周日~周六），终点覆盖今天所在周
const weeks = computed<HeatmapDay[][]>(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = computeDateLocal(localDateStr(now), 6 - now.getDay()) // 本周六
  const start = computeDateLocal(end, -(53 * 7 - 1))

  const result: HeatmapDay[][] = []
  let cursor = start
  for (let w = 0; w < 53; w++) {
    const week: HeatmapDay[] = []
    for (let d = 0; d < 7; d++) {
      const focusSec = focusSecondsByDate.value.get(cursor) || 0
      const focusMin = Math.round(focusSec / 60)
      const tasks = tasksByDate.value.get(cursor) || 0
      const habits = habitsByDate.value.get(cursor) || 0
      const activity = tasks + habits + Math.ceil(focusMin / 25)
      week.push({
        date: cursor,
        tasks,
        habits,
        focusMin,
        activity,
        isFuture: cursor > today,
        isToday: cursor === today,
      })
      cursor = computeDateLocal(cursor, 1)
    }
    result.push(week)
  }
  return result
})

type GridCell =
  | { type: 'month'; text: string; key: string }
  | { type: 'day'; day: HeatmapDay; key: string }

// grid-auto-flow: column 按列（周）填充：每列先放月份标签 cell，再放 7 天
const cells = computed<GridCell[]>(() => {
  const out: GridCell[] = []
  let lastMonth = -1
  for (const week of weeks.value) {
    const month = parseInt(week[0].date.slice(5, 7), 10)
    const show = month !== lastMonth
    lastMonth = month
    out.push({ type: 'month', text: show ? `${month}月` : '', key: `m-${week[0].date}` })
    for (const day of week) out.push({ type: 'day', day, key: day.date })
  }
  return out
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${weeks.value.length}, 10px)`,
  gridTemplateRows: '16px repeat(7, 10px)',
  gridAutoFlow: 'column',
}))

function colorClass(day: HeatmapDay): string {
  if (day.isFuture) return 'bg-gray-100/40'
  const a = day.activity
  if (a >= 7) return LEVELS[4]
  if (a >= 5) return LEVELS[3]
  if (a >= 3) return LEVELS[2]
  if (a >= 1) return LEVELS[1]
  return LEVELS[0]
}

function tooltip(day: HeatmapDay): string {
  if (day.isFuture) return ''
  const m = parseInt(day.date.slice(5, 7), 10)
  const d = parseInt(day.date.slice(8, 10), 10)
  return `${m}月${d}日：${day.tasks}任务 ${day.habits}习惯 ${day.focusMin}分钟专注`
}
</script>

<template>
  <div class="bg-card border border-border rounded-2xl p-5">
    <div class="flex items-center gap-2 pb-3 border-b border-border mb-4">
      <span class="text-lg">🔥</span>
      <p class="text-sm font-semibold text-text-primary">贡献热力图</p>
      <span class="ml-auto text-xs text-text-muted">最近一年 · 活跃度 = 完成任务 + 习惯 + 专注番茄</span>
    </div>

    <div class="overflow-x-auto">
      <div class="flex min-w-[680px]">
        <!-- 左侧星期标签（周日~周六） -->
        <div class="grid mr-1 shrink-0" :style="{ gridTemplateRows: '16px repeat(7, 10px)', gap: '2px' }">
          <span></span>
          <span></span>
          <span class="text-[9px] text-text-muted flex items-center justify-center w-3">一</span>
          <span></span>
          <span class="text-[9px] text-text-muted flex items-center justify-center w-3">三</span>
          <span></span>
          <span class="text-[9px] text-text-muted flex items-center justify-center w-3">五</span>
          <span></span>
        </div>
        <!-- 53 列 × 8 行网格（首行为月份标签，后 7 行为周日~周六） -->
        <div class="grid" :style="gridStyle">
          <template v-for="c in cells" :key="c.key">
            <span v-if="c.type === 'month'" class="text-[9px] text-text-muted leading-none">{{ c.text }}</span>
            <div
              v-else
              class="w-[10px] h-[10px] rounded-sm transition-colors"
              :class="[colorClass(c.day), { 'ring-1 ring-accent/70': c.day.isToday }]"
              :title="tooltip(c.day)"
            ></div>
          </template>
        </div>
      </div>
    </div>

    <!-- 底部图例：少 → 多 -->
    <div class="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-border text-[10px] text-text-muted">
      <span>少</span>
      <span v-for="c in LEVELS" :key="c" class="w-[10px] h-[10px] rounded-sm" :class="c"></span>
      <span>多</span>
    </div>
  </div>
</template>
