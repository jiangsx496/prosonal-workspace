import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todayLocal, localDateStr } from '@/utils/date'
import { generateId as genId } from '@/utils/id'
import { watchPersist } from '@/utils/persist'
import { mockHabits, type Habit, habitCategoryMeta } from '@/mock/habits'

const STORAGE_KEY = 'pw-habits'

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Habit[]
  } catch { /* ignore */ }
  return structuredClone(mockHabits)
}



const todayStr = () => todayLocal()

export const useHabitStore = defineStore('habits', () => {
  const habits = ref<Habit[]>(load())

  watchPersist(habits, STORAGE_KEY)

  const activeHabits = computed(() => habits.value.filter((h) => h.active))

  const doneCount = computed(() => {
    const t = todayStr()
    return habits.value.filter((h) => h.active && h.completedDates.includes(t)).length
  })

  function isDone(h: Habit): boolean {
    return h.completedDates.includes(todayStr())
  }

  function toggle(id: string) {
    const h = habits.value.find((h) => h.id === id)
    if (!h) return
    const t = todayStr()
    const idx = h.completedDates.indexOf(t)
    if (idx >= 0) h.completedDates.splice(idx, 1)
    else h.completedDates.push(t)
    calcStreak(h)
  }

  function calcStreak(h: Habit) {
    const dates = [...h.completedDates].sort().reverse()
    let streak = 0
    const t = new Date()
    for (let i = 0; i < dates.length; i++) {
      const expected = localDateStr(new Date(t.getTime() - i * 86400000))
      if (dates[i] === expected) streak++
      else break
    }
    h.streak = streak
  }

  function weeklyCount(id: string): number {
    const h = habits.value.find((h) => h.id === id)
    if (!h) return 0
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const start = localDateStr(weekStart)
    return h.completedDates.filter((d) => d >= start).length
  }

  type HeatmapDay = { date: string; completed: boolean; isToday: boolean; isFuture: boolean }

  /** 返回最近 5 周（周日~周六）打卡热力图，最后一格覆盖到今天 */
  function getHeatmap(id: string): HeatmapDay[][] {
    const todayDate = todayStr()
    const h = habits.value.find((h) => h.id === id)
    const completedSet = new Set(h?.completedDates || [])

    // 以今天所在周的周六为终点，确保今天在网格内
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const endDay = end.getDay()
    end.setDate(end.getDate() + (6 - endDay))

    // 往前推 34 天再对齐到周日 = 5 整周起点
    const start = new Date(end.getTime() - 34 * 86400000)
    start.setDate(start.getDate() - start.getDay())

    const weeks: HeatmapDay[][] = []
    const current = new Date(start)
    for (let w = 0; w < 5; w++) {
      const week: HeatmapDay[] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = localDateStr(current)
        week.push({
          date: dateStr,
          completed: completedSet.has(dateStr),
          isToday: dateStr === todayDate,
          isFuture: dateStr > todayDate,
        })
        current.setDate(current.getDate() + 1)
      }
      weeks.push(week)
    }
    return weeks
  }

  function addHabit(habit: Habit) { habits.value.unshift(habit) }
  function updateHabit(id: string, patch: Partial<Habit>) {
    const idx = habits.value.findIndex((h) => h.id === id)
    if (idx !== -1) Object.assign(habits.value[idx], patch)
  }
  function removeHabit(id: string) { habits.value = habits.value.filter((h) => h.id !== id) }
  function generateId(): string { return genId('h') }

  return {
    habits, activeHabits, doneCount, isDone, toggle, calcStreak,
    weeklyCount, getHeatmap, addHabit, updateHabit, removeHabit, generateId,
    habitCategoryMeta,
  }
})
