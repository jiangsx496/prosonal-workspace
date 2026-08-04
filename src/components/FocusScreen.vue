<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useFocusStore } from '@/stores/focus'
import { useTaskStore } from '@/stores/tasks'
import { initAudioContext } from '@/utils/sound'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const focusStore = useFocusStore()
const taskStore = useTaskStore()

const phase = computed(() => focusStore.phase)
const config = computed(() => focusStore.config)

// 右上角展示关联任务名（有 activeTaskId 时）
const activeTaskName = computed(() => {
  const id = focusStore.activeTaskId
  if (!id) return ''
  return taskStore.tasks.find((t) => t.id === id)?.title || ''
})

// 进度环：剩余时间 / 当前阶段总时长（0..1）
const RADIUS = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const progress = computed(() => {
  const total = focusStore.currentDuration
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, focusStore.remaining / total))
})

const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))

// 进度环颜色随 phase 变化
const ringClass = computed(() => {
  switch (phase.value) {
    case 'short-break': return 'stroke-green-500'
    case 'long-break': return 'stroke-orange-500'
    default: return 'stroke-indigo-500'
  }
})

const phaseMeta = computed(() => {
  switch (phase.value) {
    case 'short-break': return { label: '短休息' }
    case 'long-break': return { label: '长休息' }
    default: return { label: '专注中' }
  }
})

// 当前阶段总时长（分钟），来自 config
const durationLabel = computed(() => {
  const mins = phase.value === 'focus'
    ? config.value.focusDuration
    : phase.value === 'short-break' ? config.value.shortBreak : config.value.longBreak
  return `${mins} 分钟`
})

function handleComplete() {
  initAudioContext()
  focusStore.completeFocus()
}

function handleCancel() {
  focusStore.cancelFocus()
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <!-- 右上角：关联任务名 + 关闭 -->
      <div class="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 md:gap-3">
        <span
          v-if="activeTaskName"
          class="max-w-[140px] md:max-w-xs truncate px-3 py-1.5 rounded-full bg-card/10 border border-white/15 text-xs md:text-sm text-white/80"
        >{{ activeTaskName }}</span>
        <button
          class="px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg bg-card/10 hover:bg-card/20 text-white/80 text-xs font-medium transition-colors"
          @click="emit('close')"
        >✕ 关闭</button>
      </div>

      <!-- 阶段标识 -->
      <div class="flex items-center gap-2 mb-4 md:mb-8">
        <span class="text-xs md:text-sm font-medium tracking-widest text-white/60">{{ phaseMeta.label }}</span>
      </div>

      <!-- 圆形进度环 + 倒计时 -->
      <div class="relative w-[240px] h-[240px] md:w-[300px] md:h-[300px]">
        <svg viewBox="0 0 300 300" class="-rotate-90 w-full h-full">
          <circle cx="150" cy="150" :r="RADIUS" fill="none" stroke-width="8" class="stroke-white/10" />
          <circle
            cx="150" cy="150" :r="RADIUS"
            fill="none" stroke-width="8" stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
            :class="ringClass"
            class="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span
            class="text-6xl md:text-8xl font-bold tabular-nums text-white leading-none"
          >{{ focusStore.display }}</span>
          <span class="mt-2 md:mt-4 text-xs md:text-sm text-white/50">本轮 {{ durationLabel }}</span>
        </div>
      </div>

      <!-- 底部控制栏 -->
      <div class="mt-8 md:mt-12 flex items-center gap-2 md:gap-4 flex-wrap justify-center px-4">
        <button
          v-if="focusStore.running"
          class="px-5 py-2.5 rounded-xl bg-card/10 hover:bg-card/20 text-white text-sm font-medium transition-colors"
          @click="focusStore.pauseFocus()"
        >暂停</button>
        <button
          v-else
          class="px-5 py-2.5 rounded-xl bg-card/10 hover:bg-card/20 text-white text-sm font-medium transition-colors"
          @click="focusStore.resumeFocus()"
        >继续</button>
        <button
          class="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
          @click="handleComplete"
        >✓ 完成</button>
        <button
          class="px-5 py-2.5 rounded-xl border border-red-400/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
          @click="handleCancel"
        >✕ 放弃</button>
      </div>
    </div>
  </Teleport>
</template>
