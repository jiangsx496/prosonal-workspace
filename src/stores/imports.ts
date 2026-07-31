import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface ImportRecord {
  id: string
  filename: string
  fileType: 'text' | 'markdown' | 'docx' | 'pdf' | 'image' | 'unknown'
  mimeType: string
  size: number
  content: string
  fileHash: string               // 内容哈希，防重复导入
  source: string                 // 来源标识（filename）
  createdTaskIds: string[]       // 本次导入创建的任务 ID
  status: 'pending' | 'parsed' | 'imported'
  createdAt: string
}

const STORAGE_KEY = 'pw-imports'

function load(): ImportRecord[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return []
}
function save(v: ImportRecord[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) }

function detectType(filename: string, mimeType: string): ImportRecord['fileType'] {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (mimeType === 'text/markdown' || ext === 'md') return 'markdown'
  if (mimeType.startsWith('text/') || ext === 'txt') return 'text'
  if (ext === 'docx' || mimeType.includes('word')) return 'docx'
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  return 'unknown'
}

export const useImportStore = defineStore('imports', () => {
  const records = ref<ImportRecord[]>(load())
  watch(records, (v) => save(v), { deep: true })

  const pending = computed(() => records.value.filter((r) => r.status === 'pending'))
  const parsed = computed(() => records.value.filter((r) => r.status === 'parsed'))
  const imported = computed(() => records.value.filter((r) => r.status === 'imported'))

  function generateId(): string {
    return 'imp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  function addRecord(record: ImportRecord) {
    records.value.unshift(record)
  }

  function updateStatus(id: string, status: ImportRecord['status']) {
    const r = records.value.find((r) => r.id === id)
    if (r) r.status = status
  }

  function removeRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id)
  }

  function getContent(id: string): string {
    return records.value.find((r) => r.id === id)?.content || ''
  }

  function isDuplicate(hash: string): boolean {
    return records.value.some((r) => r.fileHash === hash && r.fileHash !== '')
  }

  function setCreatedTaskIds(id: string, taskIds: string[]) {
    const r = records.value.find((r) => r.id === id)
    if (r) { r.createdTaskIds = taskIds; r.status = 'imported' }
  }

  return { records, pending, parsed, imported, generateId, addRecord, updateStatus, removeRecord, getContent, isDuplicate, setCreatedTaskIds, detectType }
})
