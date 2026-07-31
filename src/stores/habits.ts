import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { mockHabits, type Habit, habitCategoryMeta } from '@/mock/habits'

const STORAGE_KEY = 'pw-habits'

function load(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Habit[]
  } catch { /* ignore */ }
  return structuredClone(mockHabits)
}

function save(val: Habit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export const useHabitStore = defineStore('habits', () => {
  const habits = ref<Habit[]>(load())

  watch(habits, (val) => save(val), { deep: true })

  const activeHabits = computed(() => habits.value.filter((h) => h.active))
  const today = todayStr()

  const doneCount = computed(() =>
    habits.value.filter((h) => h.active && h.completedDates.includes(today)).length
  )

  function isDone(h: Habit): boolean {
    return h.completedDates.includes(today)
  }

  function toggle(id: string) {
    const h = habits.value.find((h) => h.id === id)
    if (!h) return
    const idx = h.completedDates.indexOf(today)
    if (idx >= 0) h.completedDates.splice(idx, 1)
    else h.completedDates.push(today)
    calcStreak(h)
  }

  function calcStreak(h: Habit) {
    const dates = [...h.completedDates].sort().reverse()
    let streak = 0
    const t = new Date()
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(t.getTime() - i * 86400000).toISOString().slice(0, 10)
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
    const start = weekStart.toISOString().slice(0, 10)
    return h.completedDates.filter((d) => d >= start).length
  }

  function addHabit(habit: Habit) { habits.value.unshift(habit) }
  function updateHabit(id: string, patch: Partial<Habit>) {
    const idx = habits.value.findIndex((h) => h.id === id)
    if (idx !== -1) Object.assign(habits.value[idx], patch)
  }
  function removeHabit(id: string) { habits.value = habits.value.filter((h) => h.id !== id) }
  function generateId(): string { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }

  return {
    habits, activeHabits, doneCount, isDone, toggle, calcStreak,
    weeklyCount, addHabit, updateHabit, removeHabit, generateId,
    habitCategoryMeta,
  }
})
