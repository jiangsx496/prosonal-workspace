import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { mockJournals, type Journal } from '@/mock/journal'

const STORAGE_KEY = 'pw-journal'

function load(): Journal[] { try { const r=localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r) } catch {} return structuredClone(mockJournals) }
function save(v:Journal[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) }

export const useJournalStore = defineStore('journal', () => {
  const journals = ref<Journal[]>(load())
  watch(journals, (v)=>save(v), {deep:true})

  const today = computed(()=>todayLocal())
  const todayJournal = computed(()=>journals.value.find((j)=>j.date===today.value)||null)
  const history = computed(()=>journals.value.filter((j)=>j.date!==today.value).sort((a,b)=>b.date.localeCompare(a.date)))

  function createOrUpdate(data:{content:string,mood:Journal['mood'],completedTaskIds:string[],completedHabitIds:string[]}) {
    const existing = journals.value.find((j)=>j.date===today.value)
    if (existing) {
      Object.assign(existing, data)
    } else {
      journals.value.unshift({id:'j'+Date.now().toString(36),date:today.value,...data,createdAt:new Date().toISOString()})
    }
  }

  return { journals, todayJournal, history, createOrUpdate, today }
})
