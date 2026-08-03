import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { interviewQuestions, type InterviewQuestion } from '@/data/interviewQuestions'
import { nextReviewDate, masteryFromCount, type Mastery } from '@/utils/reviewScheduler'
import { todayLocal } from '@/utils/date'
import { watchPersist } from '@/utils/persist'

export interface QuestionProgress {
  questionId: string
  mastery: Mastery
  reviewCount: number
  lastReviewDate: string | null
  nextReviewDate: string | null
  marked: boolean
}

const STORAGE_KEY = 'pw-interview-progress'
const CUSTOM_KEY = 'pw-interview-custom'

function loadProgress(): Record<string, QuestionProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Record<string, QuestionProgress>
  } catch { /* ignore */ }
  return {}
}

function loadCustom(): InterviewQuestion[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    if (raw) return JSON.parse(raw) as InterviewQuestion[]
  } catch { /* ignore */ }
  return []
}

export const useInterviewStore = defineStore('interview', () => {
  // 静态题库 + 用户自定义题（AI 生成的题自动入库）
  const customQuestions = ref<InterviewQuestion[]>(loadCustom())
  const questions = computed(() => [...interviewQuestions, ...customQuestions.value])

  watchPersist(() => customQuestions.value, CUSTOM_KEY)
  const progressMap = ref<Record<string, QuestionProgress>>(loadProgress())

  watchPersist(() => progressMap.value, STORAGE_KEY)

  // ==== 计算属性 ====
  const allCategories = computed(() => {
    const set = new Set(questions.value.map((q) => q.category))
    return ['全部', ...Array.from(set)]
  })

  const totalQuestions = computed(() => questions.value.length)

  const progressList = computed(() =>
    questions.value.map((q) => ({
      question: q,
      progress: progressMap.value[q.id] || {
        questionId: q.id,
        mastery: 'new' as Mastery,
        reviewCount: 0,
        lastReviewDate: null,
        nextReviewDate: null,
        marked: false,
      },
    }))
  )

  const masteredCount = computed(() =>
    progressList.value.filter((p) => p.progress.mastery === 'mastered').length
  )

  const learningCount = computed(() =>
    progressList.value.filter((p) => p.progress.mastery === 'learning').length
  )

  const familiarCount = computed(() =>
    progressList.value.filter((p) => p.progress.mastery === 'familiar').length
  )

  const newCount = computed(() =>
    progressList.value.filter((p) => p.progress.mastery === 'new').length
  )

  const markedQuestions = computed(() =>
    progressList.value.filter((p) => p.progress.marked)
  )

  const todayReviewList = computed(() => {
    const today = todayLocal()
    return progressList.value.filter((p) => {
      if (!p.progress.nextReviewDate) return p.progress.mastery === 'new' // 从未学过的也算待复习
      return p.progress.nextReviewDate <= today
    })
  })

  const todayReviewCount = computed(() => todayReviewList.value.length)

  // ==== 操作 ====
  function review(questionId: string) {
    const existing = progressMap.value[questionId]
    const reviewCount = (existing?.reviewCount || 0) + 1
    const today = todayLocal()
    progressMap.value[questionId] = {
      questionId,
      mastery: masteryFromCount(reviewCount),
      reviewCount,
      lastReviewDate: today,
      nextReviewDate: nextReviewDate(reviewCount, today),
      marked: existing?.marked || false,
    }
  }

  function setMastery(questionId: string, mastery: Mastery) {
    const existing = progressMap.value[questionId]
    const reviewCount = existing?.reviewCount || 0
    const today = todayLocal()
    progressMap.value[questionId] = {
      questionId,
      mastery,
      reviewCount,
      lastReviewDate: existing?.lastReviewDate || today,
      nextReviewDate: mastery === 'mastered'
        ? nextReviewDate(Math.max(reviewCount, 5), today)
        : nextReviewDate(reviewCount, today),
      marked: existing?.marked || false,
    }
  }

  function toggleMark(questionId: string) {
    const existing = progressMap.value[questionId] || {
      questionId,
      mastery: 'new' as Mastery,
      reviewCount: 0,
      lastReviewDate: null,
      nextReviewDate: null,
      marked: false,
    }
    progressMap.value[questionId] = {
      ...existing,
      marked: !existing.marked,
    }
  }

  function reset(questionId: string) {
    delete progressMap.value[questionId]
  }

  function resetAll() {
    progressMap.value = {}
  }

  /** 按分类筛选 */
  function byCategory(category: string) {
    if (category === '全部') return progressList.value
    return progressList.value.filter((p) => p.question.category === category)
  }

  /** 获取单题进度 */
  function getProgress(questionId: string): QuestionProgress {
    return progressMap.value[questionId] || {
      questionId,
      mastery: 'new' as const,
      reviewCount: 0,
      lastReviewDate: null,
      nextReviewDate: null,
      marked: false,
    }
  }

  /** 添加自定义题目（AI 生成的题目自动入库） */
  function addCustomQuestion(q: { category: string; question: string; answer: string }) {
    // 用 category + question 生成稳定 ID，避免重复添加
    const raw = q.category + '|' + q.question
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
    }
    const id = 'iq_' + Math.abs(hash).toString(36)
    // 如果已存在则跳过
    if (customQuestions.value.some((existing) => existing.id === id)) return
    customQuestions.value.unshift({ id, ...q })
  }

  return {
    questions,
    progressMap,
    allCategories,
    totalQuestions,
    progressList,
    masteredCount,
    learningCount,
    familiarCount,
    newCount,
    markedQuestions,
    todayReviewList,
    todayReviewCount,
    review,
    setMastery,
    toggleMark,
    reset,
    resetAll,
    byCategory,
    getProgress,
    addCustomQuestion,
    customQuestions,
  }
})
