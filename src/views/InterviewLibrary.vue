<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useInterviewStore } from '@/stores/interview'
import { useDailyStore } from '@/stores/daily'
import { useTaskStore } from '@/stores/tasks'
import { MASTERY_LABELS, MASTERY_BG, type Mastery } from '@/utils/reviewScheduler'
import { todayLocal } from '@/utils/date'

const router = useRouter()
const interviewStore = useInterviewStore()
const dailyStore = useDailyStore()
const taskStore = useTaskStore()

// 从 store 获取题目列表（包含静态题 + AI 生成的自定义题）
const interviewQuestions = computed(() => interviewStore.questions)

// ---- 筛选 ----
const activeCategory = ref<string>('all')
const activeMastery = ref<Mastery | 'all' | 'due'>('all')
const showMarkedOnly = ref(false)
const addedFeedback = ref<Record<string, string>>({})

const categories = computed(() => {
  const set = new Set(interviewQuestions.value.map((q) => q.category))
  return ['all', ...Array.from(set)]
})

const masteryFilters: { key: Mastery | 'all' | 'due'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'due', label: '⏰ 待复习' },
  { key: 'new', label: '未学' },
  { key: 'learning', label: '学习中' },
  { key: 'familiar', label: '熟悉' },
  { key: 'mastered', label: '已掌握' },
]

// ---- 过滤题目 ----
const filteredQuestions = computed(() => {
  let list = interviewQuestions.value

  if (showMarkedOnly.value) {
    list = list.filter((q) => interviewStore.getProgress(q.id).marked)
  }

  if (activeCategory.value !== 'all') {
    list = list.filter((q) => q.category === activeCategory.value)
  }

  if (activeMastery.value === 'due') {
    const today = todayLocal()
    list = list.filter((q) => {
      const p = interviewStore.getProgress(q.id)
      return !p.nextReviewDate || p.nextReviewDate <= today
    })
  } else if (activeMastery.value !== 'all') {
    list = list.filter((q) => {
      const p = interviewStore.getProgress(q.id)
      return p.mastery === activeMastery.value
    })
  }

  return list
})

// ---- 统计 ----
const stats = computed(() => {
  const all = interviewQuestions.value
  const total = all.length
  const mastered = all.filter((q) => interviewStore.getProgress(q.id).mastery === 'mastered').length
  const today = todayLocal()
  const due = all.filter((q) => {
    const p = interviewStore.getProgress(q.id)
    return !p.nextReviewDate || p.nextReviewDate <= today
  }).length
  return { total, mastered, due }
})

// ---- 操作 ----
function setMastery(questionId: string, mastery: Mastery) {
  interviewStore.setMastery(questionId, mastery)
}

function toggleMark(questionId: string) {
  interviewStore.toggleMark(questionId)
}

function addToTodayPlan(question: string, answer: string, questionId: string) {
  const today = todayLocal()
  const exists = taskStore.tasks.some((t) => t.title === question && t.scheduledDate === today)
  if (exists) {
    addedFeedback.value[questionId] = '已在今日计划中'
    setTimeout(() => { delete addedFeedback.value[questionId] }, 2000)
    return
  }
  const id = taskStore.generateId()
  taskStore.addTask({
    id,
    title: question,
    description: answer,
    project: '',
    goalId: null,
    category: 'study',
    priority: 'medium',
    status: 'doing',
    source: 'manual',
    dueDate: today,
    scheduledDate: today,
    deferCount: 0,
    estimatedMinutes: 15,
    createdAt: today,
  })
  dailyStore.addTaskToToday(id)
  addedFeedback.value[questionId] = '✓ 去查看'
  setTimeout(() => { delete addedFeedback.value[questionId] }, 3000)
}

function goToday() {
  router.push('/')
}
</script>

<template>
  <div class="space-y-5 pb-20 md:pb-0">
    <!-- 标题 + 统计 -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary">面试题库</h1>
      <p class="text-xs text-text-muted mt-1">系统复习，反复巩固</p>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-text-primary">{{ stats.total }}</p>
        <p class="text-xs text-text-muted mt-1">总题数</p>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-green-500">{{ stats.mastered }}</p>
        <p class="text-xs text-text-muted mt-1">已掌握</p>
      </div>
      <div class="bg-card border border-border rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-amber-500">{{ stats.due }}</p>
        <p class="text-xs text-text-muted mt-1">待复习</p>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="cat in categories"
        :key="cat"
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        :class="activeCategory === cat ? 'bg-accent text-white' : 'bg-card border border-border text-text-muted hover:bg-card-hover'"
        @click="activeCategory = cat"
      >{{ cat === 'all' ? '全部分类' : cat }}</button>
    </div>

    <!-- 掌握度筛选 -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="f in masteryFilters"
        :key="f.key"
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        :class="activeMastery === f.key ? 'bg-accent text-white' : 'bg-card border border-border text-text-muted hover:bg-card-hover'"
        @click="activeMastery = f.key"
      >{{ f.label }}</button>
      <button
        class="px-3 py-1 rounded-full text-xs font-medium transition-colors ml-auto"
        :class="showMarkedOnly ? 'bg-amber-500 text-white' : 'bg-card border border-border text-text-muted hover:bg-card-hover'"
        @click="showMarkedOnly = !showMarkedOnly"
      >{{ showMarkedOnly ? '★ 仅看收藏' : '☆ 收藏库' }}</button>
    </div>

    <!-- 题目列表 -->
    <div class="space-y-3">
      <details
        v-for="q in filteredQuestions"
        :key="q.id"
        class="bg-card border border-border rounded-xl overflow-hidden group"
      >
        <summary class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-card-hover transition-colors">
          <span class="flex-1 min-w-0 text-sm text-text-primary">{{ q.question }}</span>
          <span class="text-xs px-2 py-0.5 rounded shrink-0" :class="MASTERY_BG[interviewStore.getProgress(q.id).mastery]">
            {{ MASTERY_LABELS[interviewStore.getProgress(q.id).mastery] }}
          </span>
          <span v-if="interviewStore.getProgress(q.id).marked" class="text-xs text-amber-500 shrink-0">★</span>
        </summary>

        <div class="px-4 pb-4 pt-1 space-y-3">
          <!-- 分类标签 -->
          <span class="inline-block text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">{{ q.category }}</span>

          <!-- 答案 -->
          <p class="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed pl-3 border-l-2 border-accent/30">{{ q.answer }}</p>

          <!-- 掌握度操作 -->
          <div class="flex items-center gap-2 flex-wrap pt-2">
            <span class="text-xs text-text-muted mr-1">标记掌握度：</span>
            <button
              v-for="m in (['learning', 'familiar', 'mastered'] as Mastery[])"
              :key="m"
              class="px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
              :class="MASTERY_BG[m]"
              @click="setMastery(q.id, m)"
            >{{ MASTERY_LABELS[m] }}</button>

            <button
              class="px-2 py-1 rounded text-xs font-medium bg-card border border-border text-text-muted hover:bg-card-hover transition-colors ml-auto"
              @click="toggleMark(q.id)"
            >{{ interviewStore.getProgress(q.id).marked ? '★ 取消收藏' : '☆ 收藏' }}</button>

            <button
              v-if="!addedFeedback[q.id]"
              class="px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              @click="addToTodayPlan(q.question, q.answer, q.id)"
            >+ 加入今日计划</button>
            <button
              v-else-if="addedFeedback[q.id]?.includes('查看')"
              class="px-2 py-1 rounded text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
              @click="goToday"
            >{{ addedFeedback[q.id] }}</button>
            <span
              v-else
              class="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700"
            >{{ addedFeedback[q.id] }}</span>
          </div>
        </div>
      </details>

      <div v-if="filteredQuestions.length === 0" class="flex flex-col items-center justify-center py-16 text-text-muted">
        <p class="text-sm">没有符合条件的题目</p>
      </div>
    </div>
  </div>
</template>
