// 全链路探针：Goal→Task→DailyPlan 级联删除
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '../../src/stores/tasks.ts'
import { useDailyStore } from '../../src/stores/daily.ts'
import { useGoalStore } from '../../src/stores/goals.ts'

const memStore: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => memStore[k] ?? null,
  setItem: (k: string, v: string) => { memStore[k] = v },
  removeItem: (k: string) => { delete memStore[k] },
  clear: () => { for (const k in memStore) delete memStore[k] },
}

setActivePinia(createPinia())

// 初始数据：1 goal, 2 tasks, 1 task in daily plan
memStore['pw-goals'] = JSON.stringify([
  { id: 'g1', title: '前端实习', category: '开发', description: '准备前端实习', startDate: '2025-07-01', deadline: '2025-08-15', progress: 0, priority: 'medium', status: 'active' },
])
memStore['pw-tasks'] = JSON.stringify([
  { id: 't1', title: '完善简历', project: '', goalId: 'g1', category: 'work', priority: 'high', status: 'backlog', source: 'manual', dueDate: '2025-07-30', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-20' },
  { id: 't2', title: '学习Vue', project: '', goalId: 'g1', category: 'study', priority: 'medium', status: 'backlog', source: 'manual', dueDate: '2025-07-28', scheduledDate: '', deferCount: 0, createdAt: '2025-07-21' },
])
memStore['pw-daily'] = JSON.stringify([
  { date: '2025-07-25', taskIds: ['t1'], habitIds: [], summary: '', createdAt: '2025-07-25' },
])

const goalStore = useGoalStore()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()

console.log('=== 删除前 ===')
console.log('goals:', goalStore.goals.length)
console.log('tasks:', taskStore.tasks.length, '(goalId=g1:', taskStore.tasks.filter(t => t.goalId === 'g1').length, ')')
console.log('daily t1 in plan:', dailyStore.plans[0]?.taskIds.includes('t1'))

// 策略 A: cascade 删除
goalStore.deleteGoal('g1', 'cascade')
await new Promise((r) => setTimeout(r, 50))

console.log('\n=== 策略A cascade 删除后 ===')
console.log('goals:', goalStore.goals.length)
console.log('tasks:', taskStore.tasks.length)
console.log('daily t1 in plan:', dailyStore.plans[0]?.taskIds.includes('t1') ?? false)

let failed = false
if (goalStore.goals.length !== 0) { console.log('❌ goal 未删除'); failed = true }
if (taskStore.tasks.length !== 0) { console.log('❌ 关联 task 未删除'); failed = true }
if (dailyStore.plans[0]?.taskIds.includes('t1')) { console.log('❌ daily plan 残留 t1'); failed = true }

// 重置数据，测试策略 B: detach
memStore['pw-goals'] = JSON.stringify([
  { id: 'g1', title: '前端实习', category: '开发', description: '', startDate: '2025-07-01', deadline: '2025-08-15', progress: 0, priority: 'medium', status: 'active' },
])
memStore['pw-tasks'] = JSON.stringify([
  { id: 't1', title: '完善简历', project: '', goalId: 'g1', category: 'work', priority: 'high', status: 'backlog', source: 'manual', dueDate: '2025-07-30', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-20' },
])

// 重新实例化
const taskStore2 = useTaskStore()
const goalStore2 = useGoalStore()
const dailyStore2 = useDailyStore()

goalStore2.deleteGoal('g1', 'detach')
await new Promise((r) => setTimeout(r, 50))

console.log('\n=== 策略B detach 删除后 ===')
console.log('goals:', goalStore2.goals.length)
console.log('tasks:', taskStore2.tasks.length)
console.log('task goalId:', taskStore2.tasks[0]?.goalId)

if (goalStore2.goals.length !== 0) { console.log('❌ goal 未删除'); failed = true }
if (taskStore2.tasks.length !== 1) { console.log('❌ task 不应被删除'); failed = true }
if (taskStore2.tasks[0]?.goalId !== null) { console.log('❌ goalId 未解除'); failed = true }

if (failed) { console.log('\n❌ FAILED'); process.exit(1) }
console.log('\n✅ ALL PASSED')
process.exit(0)
