import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { mockInboxItems, type InboxItem } from '@/mock/inbox'

const STORAGE_KEY = 'pw-inbox'

function load(): InboxItem[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return structuredClone(mockInboxItems)
}
function save(v: InboxItem[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) }

export const useInboxStore = defineStore('inbox', () => {
  const items = ref<InboxItem[]>(load())
  watch(items, (v) => save(v), { deep: true })

  const pending = computed(() => items.value.filter((i) => !i.processed))
  const processed = computed(() => items.value.filter((i) => i.processed))

  function addItem(content: string) {
    items.value.unshift({
      id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      content: content.trim(), source: 'text', processed: false,
      createdAt: todayLocal(),
    })
  }

  function markProcessed(id: string) {
    const item = items.value.find((i) => i.id === id)
    if (item) item.processed = true
  }

  function removeItem(id: string) { items.value = items.value.filter((i) => i.id !== id) }

  return { items, pending, processed, addItem, markProcessed, removeItem }
})
