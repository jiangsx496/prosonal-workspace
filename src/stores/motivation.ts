import { defineStore } from 'pinia'
import { computed } from 'vue'
import { MOTIVATIONS, TIME_SLOT_EMOJI, getHourSlot, type Mood, type TimeSlot } from '@/data/motivations'
import { todayLocal } from '@/utils/date'

/**
 * 动态激励 store — 分时段随机文案引擎
 *
 * 文案按「当天 × 时段」缓存：key = pw-motivation-{date}-{slot}，
 * 同一天同一时段文案固定（刷新不变），跨时段/跨天后重新随机。
 */

const KEY_PREFIX = 'pw-motivation-'

interface CachedEntry {
  mood: Mood
  text: string
}

function cacheKey(date: string, slot: TimeSlot): string {
  return `${KEY_PREFIX}${date}-${slot}`
}

function loadCached(date: string, slot: TimeSlot): CachedEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(date, slot))
    if (raw) {
      const parsed = JSON.parse(raw) as CachedEntry
      // 校验：文案必须存在于当前文案库（防旧缓存残留无效 mood/text）
      if (parsed && typeof parsed.text === 'string' && MOTIVATIONS[slot]?.[parsed.mood]?.includes(parsed.text)) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return null
}

function saveCached(date: string, slot: TimeSlot, entry: CachedEntry): void {
  try {
    localStorage.setItem(cacheKey(date, slot), JSON.stringify(entry))
  } catch { /* ignore */ }
}

export const useMotivationStore = defineStore('motivation', () => {
  // 当前时段（根据当前小时实时计算）
  const currentSlot = computed<TimeSlot>(() => getHourSlot(new Date().getHours()))

  // 当天 × 时段固定文案条目：优先读缓存，miss 则随机生成并缓存
  const currentEntry = computed<CachedEntry>(() => {
    const date = todayLocal()
    const slot = currentSlot.value
    const cached = loadCached(date, slot)
    if (cached) return cached
    const moods = Object.keys(MOTIVATIONS[slot]) as Mood[]
    const mood = moods[Math.floor(Math.random() * moods.length)]
    const pool = MOTIVATIONS[slot][mood]
    const text = pool[Math.floor(Math.random() * pool.length)]
    const entry: CachedEntry = { mood, text }
    saveCached(date, slot, entry)
    return entry
  })

  // 当前文案（当天同时段固定）
  const currentText = computed(() => currentEntry.value.text)

  // 当前时段 emoji
  const currentEmoji = computed(() => TIME_SLOT_EMOJI[currentSlot.value])

  // 当前使用的基调（从缓存条目中读取）
  const currentMood = computed<Mood>(() => currentEntry.value.mood)

  return { currentSlot, currentText, currentEmoji, currentMood }
})
