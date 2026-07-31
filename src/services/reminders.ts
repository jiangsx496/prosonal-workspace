import { useReminderStore } from '@/stores/reminders'

let intervalId: ReturnType<typeof setInterval> | null = null

export function startReminderService() {
  if (intervalId) return
  checkAndNotify()
  intervalId = setInterval(checkAndNotify, 60000) // 每分钟检查一次
}

export function stopReminderService() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}

async function checkAndNotify() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'denied') return

  const store = useReminderStore()
  const now = new Date()
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0')

  for (const r of store.todayReminders) {
    if (r.time !== timeStr) continue
    if (Notification.permission === 'granted') {
      new Notification('📌 Personal Workspace', { body: r.message, icon: '/favicon.svg' })
    } else if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        new Notification('📌 Personal Workspace', { body: r.message, icon: '/favicon.svg' })
      }
    }
    store.markNotified(r.id)
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}
