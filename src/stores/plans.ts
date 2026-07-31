import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

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
function save(v: Plan[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) }

export const usePlanStore = defineStore('plans', () => {
  const plans = ref<Plan[]>(load())
  watch(plans, (v) => save(v), { deep: true })

  const draftPlans = computed(() => plans.value.filter((p) => p.status === 'draft'))
  const confirmedPlans = computed(() => plans.value.filter((p) => p.status === 'confirmed'))

  function generateId(): string {
    return 'plan' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  }

  function createPlan(data: Partial<Plan>): string {
    const id = generateId()
    plans.value.unshift({
      id,
      title: data.title || '未命名计划',
      sourceFile: data.sourceFile || '',
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
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
