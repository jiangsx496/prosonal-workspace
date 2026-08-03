import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { fetchDailyFeed, type DailyFeed, type FeedRepo, type FeedQuestion } from '@/services/feed'
import { useInterviewStore } from '@/stores/interview'

const STORAGE_PREFIX = 'pw-feed-'

function todayStr(): string {
  return todayLocal()
}

function loadCached(date: string): DailyFeed | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + date)
    if (raw) return JSON.parse(raw) as DailyFeed
  } catch { /* ignore */ }
  return null
}

function saveCached(date: string, feed: DailyFeed) {
  localStorage.setItem(STORAGE_PREFIX + date, JSON.stringify(feed))
}

export const useFeedStore = defineStore('feed', () => {
  const feed = ref<DailyFeed | null>(loadCached(todayStr()))
  const loading = ref(false)
  const error = ref('')

  const todayRepos = computed<FeedRepo[]>(() => feed.value?.repos || [])
  const todayQuestions = computed<FeedQuestion[]>(() => feed.value?.questions || [])
  const hasFeed = computed(() => !!feed.value && (todayRepos.value.length > 0 || todayQuestions.value.length > 0))

  /** 获取今日 feed：有缓存用缓存，否则重新获取 */
  async function loadToday(force: boolean = false) {
    const today = todayStr()

    if (!force) {
      const cached = loadCached(today)
      if (cached) {
        feed.value = cached
        return cached
      }
    }

    loading.value = true
    error.value = ''

    try {
      const data = await fetchDailyFeed(today, force)
      feed.value = data
      saveCached(today, data)
      // AI 生成的面试题自动入库（支持反复复习）
      const interviewStore = useInterviewStore()
      data.questions.forEach((q) => {
        interviewStore.addCustomQuestion({ category: q.category, question: q.question, answer: q.answer })
      })
      return data
    } catch (e: any) {
      error.value = e.message || '获取每日精选失败'
      return null
    } finally {
      loading.value = false
    }
  }

  return { feed, loading, error, todayRepos, todayQuestions, hasFeed, loadToday }
})
