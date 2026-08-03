import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId } from '@/utils/id'
import { watchPersist } from '@/utils/persist'

export interface Note {
  id: string
  title: string
  content: string
  updatedAt: string
}

const STORAGE_KEY = 'pw-notes'

function load(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Note[]
  } catch { /* ignore */ }
  return []
}



export const useNoteStore = defineStore('notes', () => {
  const notes = ref<Note[]>(load())
  const activeId = ref<string | null>(null)

  watchPersist(notes, STORAGE_KEY)

  const activeNote = computed(() => {
    if (!activeId.value) return notes.value[0] || null
    return notes.value.find((n) => n.id === activeId.value) || null
  })

  const sortedNotes = computed(() =>
    [...notes.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  )

  function createNote() {
    const id = generateId('n')
    const note: Note = {
      id,
      title: '',
      content: '',
      updatedAt: new Date().toISOString(),
    }
    notes.value.unshift(note)
    activeId.value = id
    return note
  }

  function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) {
    const idx = notes.value.findIndex((n) => n.id === id)
    if (idx !== -1) {
      Object.assign(notes.value[idx], patch, { updatedAt: new Date().toISOString() })
    }
  }

  function removeNote(id: string) {
    notes.value = notes.value.filter((n) => n.id !== id)
    if (activeId.value === id) {
      activeId.value = notes.value[0]?.id || null
    }
  }

  function selectNote(id: string) {
    activeId.value = id
  }

  return { notes, activeId, activeNote, sortedNotes, createNote, updateNote, removeNote, selectNote }
})
