<script setup lang="ts">
import { computed } from 'vue'
import { localDateStr, localDateFromISO } from '@/utils/date'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'
import { useJournalStore } from '@/stores/journal'

const router = useRouter()
const taskStore = useTaskStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()
const journalStore = useJournalStore()

const now = new Date()
const todayDate = `${now.getMonth() + 1}月${now.getDate()}日`
const monthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
const monthPlanCount = computed(() =>
  taskStore.tasks.filter((t) => t.scheduledDate?.startsWith(monthPrefix)).length
)

const todayStr = localDateStr(now)
const todayHasActivity = computed(() => {
  const tasks = taskStore.tasks.filter((t) => t.scheduledDate === todayStr || (t.completedAt && localDateFromISO(t.completedAt) === todayStr))
  const habitsDone = habitStore.habits.some((h) => (h.completedDates || []).includes(todayStr))
  const focus = focusStore.sessions.some((s) => localDateFromISO(s.createdAt) === todayStr)
  const journal = journalStore.journals.some((j) => j.date === todayStr)
  return tasks.some((t) => t.status === 'done') || habitsDone || focus || journal
})

function goCalendar() { router.push('/calendar') }
</script>

<template>
  <button
    class="w-full flex items-center justify-between p-4 mt-3 bg-card-hover/50 hover:bg-card-hover rounded-xl transition-colors"
    @click="goCalendar"
  >
    <div class="flex items-center gap-3">
      <span class="text-lg">📅</span>
      <div class="text-left">
        <p class="text-sm font-medium text-text-primary">时间入口</p>
        <p class="text-xs text-text-muted">今天 {{ todayDate }} · 本月 {{ monthPlanCount }} 个计划</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span v-if="todayHasActivity" class="w-1.5 h-1.5 rounded-full bg-green-400" title="今天有记录"></span>
      <span class="text-text-muted text-xs">查看日历 →</span>
    </div>
  </button>
</template>
