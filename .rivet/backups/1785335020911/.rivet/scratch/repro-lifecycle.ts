// RED 复现探针：删除任务后 daily plan 残留 taskId
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '../../src/stores/tasks.ts'

// 模拟 localStorage
const memStore: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (k: string) => memStore[k] ?? null,
  setItem: (k: string, v: string) => { memStore[k] = v },
  removeItem: (k: string) => { delete memStore[k] },
  clear: () => { for (const k in memStore) delete memStore[k] },
}

setActivePinia(createPinia())

// 设置初始数据
memStore['pw-tasks'] = JSON.stringify([
  { id: 't1', title: 'test', project: '', goalId: 'g1', category: 'work', priority: 'medium', status: 'backlog', source: 'manual', dueDate: '2025-07-30', scheduledDate: '', deferCount: 0, createdAt: '2025-07-20' },
])
memStore['pw-daily'] = JSON.stringify([
  { date: '2025-07-25', taskIds: ['t1'], habitIds: [], summary: '', createdAt: '2025-07-25' },
])

const taskStore = useTaskStore()
console.log('删除前 daily taskIds:', JSON.parse(memStore['pw-daily'])[0].taskIds)
console.log('删除前 task count:', taskStore.tasks.length)

taskStore.removeTask('t1')

console.log('---删除 t1 后---')
console.log('task count:', taskStore.tasks.length)
const daily = JSON.parse(memStore['pw-daily'])[0]
console.log('daily taskIds:', daily.taskIds)

if (daily.taskIds.includes('t1')) {
  console.log('❌ RED: 任务已删除但 daily plan 仍残留 t1')
  process.exit(1)
} else {
  console.log('✅ GREEN: daily plan 已清理')
  process.exit(0)
}
