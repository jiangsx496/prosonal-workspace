import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { generateId as genId } from '@/utils/id'
import { watchPersist } from '@/utils/persist'

export interface Plan {
  id: string
  title: string
  sourceFile: string
  startDate: string
  endDate: string
  goalId: string | null
  status: 'draft' | 'confirmed' | 'archived'
  createdAt: string
}

const STORAGE_KEY = 'pw-plans'

function load(): Plan[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
  return []
}


export const usePlanStore = defineStore('plans', () => {
  const plans = ref<Plan[]>(load())
  watchPersist(plans, STORAGE_KEY)

  const draftPlans = computed(() => plans.value.filter((p) => p.status === 'draft'))
  const confirmedPlans = computed(() => plans.value.filter((p) => p.status === 'confirmed'))

  function generateId(): string {
    return genId('plan')
  }

  function createPlan(data: Partial<Plan>): string {
    const id = generateId()
    plans.value.unshift({
      id,
      title: data.title || '未命名计划',
      sourceFile: data.sourceFile || '',
      startDate: data.startDate || todayLocal(),
      endDate: data.endDate || '',
      goalId: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
    })
    return id
  }

  function updatePlan(id: string, patch: Partial<Plan>) {
    const p = plans.value.find((p) => p.id === id)
    if (p) Object.assign(p, patch)
  }

  function confirmPlan(id: string, goalId: string) {
    updatePlan(id, { goalId, status: 'confirmed' })
  }

  function removePlan(id: string) {
    plans.value = plans.value.filter((p) => p.id !== id)
  }

  return { plans, draftPlans, confirmedPlans, generateId, createPlan, updatePlan, confirmPlan, removePlan }
})
