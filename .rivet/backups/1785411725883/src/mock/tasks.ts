export interface Task {
  id: string
  title: string
  description?: string
  project: string
  goalId: string | null
  category: 'work' | 'study' | 'exercise' | 'life'
  priority: 'high' | 'medium' | 'low'
  status: 'backlog' | 'doing' | 'done' | 'deferred'
  source: 'manual' | 'goal' | 'import' | 'ai'
  dueDate: string
  scheduledDate: string
  deferCount: number
  estimatedMinutes: number
  createdAt: string
}

export const mockTasks: Task[] = [
  { id: '1', title: '支付验证流程测试', project: 'Payment', goalId: 'g3', category: 'work', priority: 'high', status: 'backlog', source: 'manual', dueDate: '2025-07-27', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-22' },
  { id: '2', title: 'Tianshu 设备授权接入', project: 'Tianshu', goalId: 'g3', category: 'work', priority: 'high', status: 'backlog', source: 'goal', dueDate: '2025-07-28', scheduledDate: '', deferCount: 0, createdAt: '2025-07-23' },
  { id: '3', title: '完善工作台 Dashboard', project: 'Personal Workspace', goalId: 'g1', category: 'work', priority: 'medium', status: 'backlog', source: 'manual', dueDate: '2025-07-26', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-21' },
  { id: '4', title: '编写 API 文档', project: 'Tianshu', goalId: 'g3', category: 'work', priority: 'medium', status: 'backlog', source: 'goal', dueDate: '2025-07-30', scheduledDate: '', deferCount: 0, createdAt: '2025-07-24' },
  { id: '5', title: '修复登录页样式问题', project: 'Payment', goalId: null, category: 'work', priority: 'low', status: 'done', source: 'manual', dueDate: '2025-07-24', scheduledDate: '2025-07-24', deferCount: 0, createdAt: '2025-07-20' },
  { id: '6', title: '复习系统设计面试题', project: '', goalId: 'g2', category: 'study', priority: 'high', status: 'backlog', source: 'goal', dueDate: '2025-08-01', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-24' },
  { id: '7', title: '跑步 5 公里', project: '', goalId: 'g4', category: 'exercise', priority: 'medium', status: 'backlog', source: 'manual', dueDate: '2025-07-25', scheduledDate: '2025-07-25', deferCount: 0, createdAt: '2025-07-24' },
  { id: '8', title: '整理本周笔记', project: '', goalId: null, category: 'life', priority: 'low', status: 'backlog', source: 'manual', dueDate: '2025-07-31', scheduledDate: '', deferCount: 0, createdAt: '2025-07-20' },
]

export const projects = ['Personal Workspace', 'Tianshu', 'Payment']
export const categories = ['work', 'study', 'exercise', 'life'] as const
