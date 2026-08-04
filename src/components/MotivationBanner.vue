<script setup lang="ts">
import { computed } from 'vue'
import { useMotivationStore } from '@/stores/motivation'
import { useTaskStore } from '@/stores/tasks'
import { useInterviewStore } from '@/stores/interview'
import type { TimeSlot } from '@/data/motivations'

const motivationStore = useMotivationStore()
const taskStore = useTaskStore()
const interviewStore = useInterviewStore()

/** 各时段渐变背景 + 文字配色（深夜背景深，需浅色文字保证可读性） */
const SLOT_STYLES: Record<TimeSlot, { bg: string; text: string; sub: string }> = {
  dawn: {
    bg: 'bg-gradient-to-br from-orange-200 via-amber-100 to-orange-100',
    text: 'text-orange-900',
    sub: 'text-orange-700/80',
  },
  morning: {
    bg: 'bg-gradient-to-br from-sky-300 via-blue-200 to-sky-100',
    text: 'text-sky-950',
    sub: 'text-sky-800/80',
  },
  noon: {
    bg: 'bg-gradient-to-br from-amber-200 via-yellow-100 to-amber-100',
    text: 'text-amber-900',
    sub: 'text-amber-700/80',
  },
  afternoon: {
    bg: 'bg-gradient-to-br from-orange-300 via-orange-200 to-amber-100',
    text: 'text-orange-950',
    sub: 'text-orange-800/80',
  },
  evening: {
    bg: 'bg-gradient-to-br from-indigo-300 via-purple-200 to-indigo-200',
    text: 'text-indigo-950',
    sub: 'text-indigo-800/80',
  },
  night: {
    bg: 'bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900',
    text: 'text-indigo-100',
    sub: 'text-indigo-200/80',
  },
}

const style = computed(() => SLOT_STYLES[motivationStore.currentSlot])

/** 今日待办（含进行中） */
const todayPending = computed(() => taskStore.pendingCount)

/** 待复习面试题数 */
const todayReview = computed(() => interviewStore.todayReviewCount)
</script>

<template>
  <div :class="['rounded-xl px-5 py-4 shadow-sm border border-border/40', style.bg]">
    <div class="flex items-center gap-4">
      <span class="text-3xl shrink-0 select-none">{{ motivationStore.currentEmoji }}</span>
      <p :class="['text-base leading-relaxed', style.text]">{{ motivationStore.currentText }}</p>
    </div>
    <div :class="['mt-2 text-xs', style.sub]">
      今日待办 {{ todayPending }} 项 · 待复习面试题 {{ todayReview }} 题
    </div>
  </div>
</template>
