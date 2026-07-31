import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { mockReminders, type Reminder } from '@/mock/reminders'

const STORAGE_KEY = 'pw-reminders'

function load(): Reminder[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return structuredClone(mockReminders)
}
function save(v: Reminder[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) }

export const useReminderStore = defineStore('reminders', () => {
  const items = ref<Reminder[]>(load())
  watch(items, (v) => save(v), { deep: true })

  const today = computed(() => new Date().toISOString().slice(0, 10))
  const todayReminders = computed(() => items.value.filter((r) => r.enabled && !r.notified))

  function createReminder(r: Omit<Reminder, 'id'|'createdAt'>) {
    items.value.push({ ...r, id: 'r'+Date.now().toString(36), createdAt: new Date().toISOString() })
  }

  function updateReminder(id: string, patch: Partial<Reminder>) {
    const idx = items.value.findIndex((r) => r.id === id)
    if (idx !== -1) Object.assign(items.value[idx], patch)
  }

  function deleteReminder(id: string) { items.value = items.value.filter((r) => r.id !== id) }

  function markNotified(id: string) {
    const r = items.value.find((r) => r.id === id)
    if (r) r.notified = true
  }

  /** 每日刷新：生成今日提醒列表 */
  function refreshDailyReminders(taskCount: number, deferredCount: number, goalDeadlines: { id: string; title: string; days: number }[], habitNames: string[]) {
    // 清除旧未通知项
    items.value = items.value.filter((r) => r.notified)

    // 任务提醒
    if (taskCount > 0) {
      createReminder({ type: 'task', targetId: null, message: `今天有 ${taskCount} 项任务待完成`, time: '09:00', enabled: true, notified: false })
    }
    if (deferredCount > 0) {
      createReminder({ type: 'task', targetId: null, message: `${deferredCount} 项任务已延期，请前往复盘处理`, time: '10:00', enabled: true, notified: false })
    }

    // 目标截止提醒
    goalDeadlines.forEach((g) => {
      if (g.days <= 3) {
        createReminder({ type: 'goal', targetId: g.id, message: `目标「${g.title}」还剩 ${g.days} 天截止`, time: '09:00', enabled: true, notified: false })
      }
    })

    // 习惯提醒
    if (habitNames.length > 0) {
      createReminder({ type: 'habit', targetId: null, message: `今日习惯待完成：${habitNames.join('、')}`, time: '08:00', enabled: true, notified: false })
    }
  }

  return { items, todayReminders, createReminder, updateReminder, deleteReminder, markNotified, refreshDailyReminders }
})
