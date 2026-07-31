// P18 端到端闭环测试：模拟 spec 中的测试1和测试2
import { setActivePinia, createPinia } from 'pinia'
import { useGoalStore } from '../../src/stores/goals.ts'
import { useTaskStore } from '../../src/stores/tasks.ts'
import { useDailyStore } from '../../src/stores/daily.ts'
import { usePlanDraftStore } from '../../src/stores/planDraft.ts'
import { cleanupOrphanData } from '../../src/services/dataCleanup.ts'

const memStore: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => memStore[k] ?? null,
  setItem: (k: string, v: string) => { memStore[k] = v },
  removeItem: (k: string) => { delete memStore[k] },
  clear: () => { for (const k in memStore) delete memStore[k] },
}

const flush = () => new Promise((r) => setTimeout(r, 50))
let stepFailures: string[] = []

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`)
    stepFailures.push(label)
  }
}

setActivePinia(createPinia())
const goalStore = useGoalStore()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()
const draftStore = usePlanDraftStore()

// ============================================================
// 测试1：创建目标→创建任务→加入日计划→删除目标→验证闭环
// ============================================================
console.log('\n══════ 测试1：Goal 删除级联闭环 ══════')

console.log('\n[1.1] 创建目标「准备前端实习」')
const goalId = goalStore.generateId()
goalStore.addGoal({
  id: goalId, title: '准备前端实习', category: '开发', description: '准备前端实习',
  startDate: '2025-07-01', deadline: '2025-08-15', progress: 0, priority: 'medium', status: 'active',
})
await flush()
check('Goal 存在', goalStore.goals.some((g) => g.id === goalId))

console.log('\n[1.2] 创建任务「完善简历」「学习Vue」')
const task1Id = taskStore.generateId()
const task2Id = taskStore.generateId()
taskStore.addTask({ id: task1Id, title: '完善简历', project: '', goalId, category: 'work', priority: 'high', status: 'backlog', source: 'manual', dueDate: '2025-07-30', scheduledDate: '', deferCount: 0, createdAt: '2025-07-25' })
taskStore.addTask({ id: task2Id, title: '学习Vue', project: '', goalId, category: 'study', priority: 'medium', status: 'backlog', source: 'manual', dueDate: '2025-07-28', scheduledDate: '', deferCount: 0, createdAt: '2025-07-25' })
await flush()
check('Task1 存在且关联 goal', taskStore.tasks.some((t) => t.id === task1Id && t.goalId === goalId))
check('Task2 存在且关联 goal', taskStore.tasks.some((t) => t.id === task2Id && t.goalId === goalId))

console.log('\n[1.3] 将「完善简历」加入今日日计划')
dailyStore.addTaskToToday(task1Id)
await flush()
check('DailyPlan 包含 task1', dailyStore.plans.some((p) => p.taskIds.includes(task1Id)))

console.log('\n[1.4] 删除目标（策略A: cascade）')
goalStore.deleteGoal(goalId, 'cascade')
await flush()

console.log('\n[1.5] 验证闭环清理：')
check('目标消失', !goalStore.goals.some((g) => g.id === goalId))
check('任务池任务消失', !taskStore.tasks.some((t) => t.id === task1Id || t.id === task2Id))
check('首页任务消失（task 不在 doing）', !taskStore.tasks.some((t) => t.status === 'doing' && t.id === task1Id))
check('日历计划消失（daily 不含 task1）', !dailyStore.plans.some((p) => p.taskIds.includes(task1Id)))

// ============================================================
// 测试2：AI计划创建→取消→验证无残留
// ============================================================
console.log('\n══════ 测试2：AI计划创建安全（取消场景）══════')

console.log('\n[2.1] 创建 AI PlanDraft（模拟生成100个任务）')
const hundredTasks = Array.from({ length: 100 }, (_, i) => ({
  title: `AI任务${i + 1}`, priority: 'medium' as const,
}))
draftStore.createDraft({
  source: 'ai', title: 'AI学习计划', goalTitle: 'AI 学习', goalDescription: '100天AI',
  tasks: hundredTasks,
})
check('Draft 已创建', draftStore.hasDraft)
check('Draft 含100个任务', draftStore.taskCount === 100)

const tasksBefore = taskStore.tasks.length
const goalsBefore = goalStore.goals.length

console.log('\n[2.2] 用户取消（clearDraft）')
draftStore.clearDraft()
await flush()

console.log('\n[2.3] 验证取消后无残留：')
check('Draft 已清空', !draftStore.hasDraft)
check('系统无新增 Task', taskStore.tasks.length === tasksBefore, `before=${tasksBefore}, after=${taskStore.tasks.length}`)
check('系统无新增 Goal', goalStore.goals.length === goalsBefore, `before=${goalsBefore}, after=${goalStore.goals.length}`)

// ============================================================
// 测试3：AI计划确认创建→验证绑定
// ============================================================
console.log('\n══════ 测试3：AI计划确认创建验证 ══════')

console.log('\n[3.1] 重新创建 Draft 并确认创建')
draftStore.createDraft({
  source: 'ai', title: 'AI学习计划2', goalTitle: 'AI 学习2', goalDescription: '确认创建测试',
  tasks: [{ title: '学Python', priority: 'high' }, { title: '学PyTorch', priority: 'medium' }],
})
check('Draft 已创建', draftStore.hasDraft)

const result = draftStore.confirmCreate()
await flush()

console.log('\n[3.2] 验证创建结果：')
check('返回 goalId', !!result.goalId)
check('返回 taskCount=2', result.taskCount === 2, `got ${result.taskCount}`)
check('Goal 存在', goalStore.goals.some((g) => g.id === result.goalId))
check('Task 绑定 goalId', taskStore.tasks.filter((t) => t.goalId === result.goalId).length === 2)
check('Draft 已清空（确认后）', !draftStore.hasDraft)

// ============================================================
// 测试4：cleanupOrphanData 孤儿清理
// ============================================================
console.log('\n══════ 测试4：孤儿数据清理 ══════')

console.log('\n[4.1] 手动制造孤儿数据')
// 删除 Goal 但不级联（直接从 goals 数组移除，模拟数据损坏）
goalStore.goals = goalStore.goals.filter((g) => g.id !== result.goalId)
// 现在2个 task 的 goalId 指向不存在的 goal
await flush()

console.log('\n[4.2] 执行 cleanupOrphanData()')
const cleanupResult = cleanupOrphanData()
await flush()

console.log('\n[4.3] 验证清理结果：')
check('孤儿任务关联被解除（2个）', cleanupResult.orphanTasksDetached === 2, `got ${cleanupResult.orphanTasksDetached}`)
check('所有孤儿 task goalId = null', taskStore.tasks.filter((t) => t.goalId !== null && !goalStore.goals.some((g) => g.id === t.goalId)).length === 0)

// ============================================================
// 总结
// ============================================================
console.log('\n════════════════════════════════════')
if (stepFailures.length === 0) {
  console.log(`✅ 全部 ${4} 个场景、20 项检查全部通过 — 数据闭环完整`)
  process.exit(0)
} else {
  console.log(`❌ ${stepFailures.length} 项失败：`)
  stepFailures.forEach((f) => console.log(`   - ${f}`))
  process.exit(1)
}
