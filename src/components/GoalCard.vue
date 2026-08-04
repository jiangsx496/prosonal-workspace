<script setup lang="ts">
import { computed } from 'vue'
import { useGoalStore } from '@/stores/goals'
import type { Goal } from '@/mock/goals'

const props = withDefaults(defineProps<{
  goal: Goal
  highlight?: boolean
}>(), { highlight: false })

const goalStore = useGoalStore()

const progress = computed(() => goalStore.goalProgress(props.goal.id))
const doneCount = computed(() => goalStore.goalDoneCount(props.goal.id))
const taskCount = computed(() => goalStore.goalTaskCount(props.goal.id))
const daysLeft = computed(() => goalStore.daysLeft(props.goal.deadline))
const nextTask = computed(() => goalStore.goalNextTask(props.goal.id))

const priorityBadge = computed(() => {
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: '🔴 高', cls: 'bg-red-50 text-red-600' },
    medium: { label: '🟡 中', cls: 'bg-amber-50 text-amber-600' },
    low: { label: '⚪ 低', cls: 'bg-slate-100 text-slate-500' },
  }
  return map[props.goal.priority] || map.medium
})
</script>

<template>
  <router-link
    :to="`/goals/${goal.id}`"
    :class="[
      'block border rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
      highlight
        ? 'bg-accent/5 border-accent/20 hover:border-accent/35'
        : 'bg-card border-border hover:border-accent/20'
    ]"
  >
    <!-- 头部：图标+标题+优先级+剩余时间 -->
    <div class="flex items-start justify-between mb-3 gap-2">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span :class="highlight ? 'text-xl' : 'text-base'">{{ goalStore.goalIcon(goal.category) }}</span>
        <div class="min-w-0">
          <p :class="['font-medium text-text-primary truncate', highlight ? 'text-sm' : 'text-sm']">{{ goal.title }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs px-1.5 py-0.5 rounded font-medium" :class="priorityBadge.cls">{{ priorityBadge.label }}</span>
            <span v-if="highlight" class="text-xs text-text-muted">{{ taskCount }} 个任务</span>
          </div>
        </div>
      </div>
      <div class="text-right shrink-0">
        <p :class="['font-bold', progress >= 100 ? 'text-green-500' : 'text-accent', highlight ? 'text-2xl' : 'text-lg']">{{ progress }}%</p>
        <p class="text-xs" :class="daysLeft.urgent ? 'text-red-500 font-medium' : 'text-text-muted'">{{ daysLeft.text }}</p>
      </div>
    </div>

    <!-- 进度条 -->
    <div :class="['bg-card-hover rounded-full overflow-hidden mb-2', highlight ? 'h-2' : 'h-1.5']">
      <div class="h-full rounded-full transition-all duration-500" :style="{ width: progress + '%', backgroundColor: goalStore.progressColor(progress) }"></div>
    </div>

    <!-- 底部信息 -->
    <div class="flex items-center justify-between text-xs text-text-muted">
      <span class="shrink-0">{{ doneCount }}/{{ taskCount }} 任务</span>
      <span class="truncate ml-2 flex items-center gap-1 min-w-0">
        <span class="shrink-0">→</span>
        <span class="truncate">{{ nextTask }}</span>
      </span>
    </div>
  </router-link>
</template>
