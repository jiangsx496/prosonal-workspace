<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useFocusStore } from '@/stores/focus'

const taskStore = useTaskStore()
const habitStore = useHabitStore()
const focusStore = useFocusStore()

const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

// ---- 昨天复盘数据 ----
const yesterdayCompleted = computed(() => taskStore.tasksCompletedOn(yesterday))
const yesterdayUncompleted = computed(() => taskStore.tasksUncompletedOn(yesterday))
const yesterdayDeferred = computed(() =>
  taskStore.tasks.filter((t) => t.status === 'deferred' && t.deferredAt?.slice(0, 10) === yesterday)
)

// 昨天完成的习惯
const yesterdayHabits = computed(() =>
  habitStore.activeHabits.filter((h) => (h.completedDates || []).includes(yesterday))
)

// 昨天专注时间（秒 → 分钟）
const yesterdayFocusMinutes = computed(() =>
  focusStore.sessions
    .filter((s) => s.createdAt.slice(0, 10) === yesterday && s.status === 'completed')
    .reduce((sum, s) => sum + s.duration, 0) / 60
)

// ---- 今天延期任务（保留原功能） ----
const editDate = computed<Record<string, string>>(() => ({}))
const editDateMap: Record<string, string> = {}

function reschedule(id: string) {
  const d = editDateMap[id] || today
  taskStore.updateTask(id, { scheduledDate: d, status: 'backlog', deferCount: 0 })
  delete editDateMap[id]
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">复盘</h1>
      <p class="text-xs text-text-muted mt-1">回顾昨天，规划今天</p>
    </div>

    <!-- 昨天复盘卡片 -->
    <div class="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div class="flex items-center gap-2 pb-3 border-b border-border">
        <span class="text-lg">📊</span>
        <p class="text-sm font-semibold text-text-primary">昨天复盘 · {{ yesterday }}</p>
      </div>

      <!-- 昨天完成任务 -->
      <div>
        <p class="text-xs font-medium text-text-secondary mb-2">✅ 完成（{{ yesterdayCompleted.length }}）</p>
        <div v-if="yesterdayCompleted.length > 0" class="space-y-1">
          <div v-for="t in yesterdayCompleted" :key="t.id" class="flex items-center gap-2 py-1 px-2">
            <span class="text-xs text-green-500">✅</span>
            <span class="text-sm text-text-muted line-through">{{ t.title }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-text-muted/60 py-1 px-2">（无）</p>
      </div>

      <!-- 昨天未完成任务 -->
      <div>
        <p class="text-xs font-medium text-text-secondary mb-2">⏳ 未完成（{{ yesterdayUncompleted.length }}）</p>
        <div v-if="yesterdayUncompleted.length > 0" class="space-y-1">
          <div v-for="t in yesterdayUncompleted" :key="t.id" class="flex items-center gap-2 py-1 px-2">
            <span class="text-xs text-amber-500">⏳</span>
            <span class="text-sm text-text-primary">{{ t.title }}</span>
            <span class="text-xs text-text-muted ml-auto">{{ t.status === 'deferred' ? '已延期' : '待完成' }}</span>
          </div>
        </div>
        <p v-else class="text-xs text-text-muted/60 py-1 px-2">（全部完成 🎉）</p>
      </div>

      <!-- 昨天习惯 -->
      <div>
        <p class="text-xs font-medium text-text-secondary mb-2">🔥 习惯（{{ yesterdayHabits.length }}）</p>
        <div v-if="yesterdayHabits.length > 0" class="space-y-1">
          <div v-for="h in yesterdayHabits" :key="h.id" class="flex items-center gap-2 py-1 px-2">
            <span class="text-xs">🔥</span>
            <span class="text-sm text-text-primary">{{ h.name }}</span>
            <span class="text-xs text-amber-500 ml-auto">{{ h.streak }}天</span>
          </div>
        </div>
        <p v-else class="text-xs text-text-muted/60 py-1 px-2">（无）</p>
      </div>

      <!-- 昨天专注 -->
      <div>
        <p class="text-xs font-medium text-text-secondary mb-2">🍅 专注</p>
        <p class="text-sm text-text-primary px-2">{{ Math.round(yesterdayFocusMinutes) }} 分钟</p>
      </div>
    </div>

    <!-- 延期任务处理（保留原功能） -->
    <div v-if="taskStore.deferredTasks.length > 0">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-sm font-semibold text-text-primary">📥 延期任务（{{ taskStore.deferredTasks.length }}）</span>
      </div>
      <div class="space-y-3">
        <div v-for="t in taskStore.deferredTasks" :key="t.id" class="bg-card border border-border rounded-xl p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w0">
              <p class="text-sm font-medium text-text-primary mb-1">{{ t.title }}</p>
              <div class="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                <span>{{ t.project }}</span>
                <span class="text-border">·</span>
                <span>原截止: {{ t.dueDate }}</span>
                <span class="text-border">·</span>
                <span class="text-amber-500 font-medium">延期 {{ t.deferCount }} 次</span>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded border bg-amber-50 text-amber-700 shrink-0">已延期</span>
          </div>
          <div class="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
            <input type="date" :value="editDateMap[t.id] || today" @input="editDateMap[t.id] = ($event.target as HTMLInputElement).value"
              class="px-2 py-1 rounded border border-border text-xs bg-gray-50 outline-none focus:border-accent" />
            <button class="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors" @click="reschedule(t.id)">重新安排</button>
            <button class="px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors" @click="taskStore.completeTask(t.id)">标记完成</button>
            <button class="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors ml-auto" @click="taskStore.removeTask(t.id)">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="taskStore.deferredTasks.length === 0 && yesterdayCompleted.length === 0 && yesterdayUncompleted.length === 0" class="flex flex-col items-center justify-center py-20 text-text-muted">
      <span class="text-4xl mb-4">📊</span>
      <p class="text-sm">还没有复盘数据</p>
      <p class="text-xs mt-1 opacity-60">完成任务后这里会出现记录</p>
    </div>
  </div>
</template>
