export interface Goal {
  id: string
  title: string
  category: string
  description: string
  startDate: string
  deadline: string
  progress: number
  status: 'planned' | 'active' | 'completed' | 'expired'
}

export const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: '完成 Personal Workspace 第一版',
    category: '开发',
    description: '搭建个人工作台，包含 Dashboard、Tasks、Goals、Notes 等核心模块',
    startDate: '2025-07-01',
    deadline: '2025-08-15',
    progress: 55,
    status: 'active',
  },
  {
    id: 'g2',
    title: '准备实习面试',
    category: '学习',
    description: '复习系统设计、算法、前端基础，准备 3 轮模拟面试',
    startDate: '2025-07-10',
    deadline: '2025-09-01',
    progress: 20,
    status: 'active',
  },
  {
    id: 'g3',
    title: '完成 Tianshu 设备授权',
    category: '工作',
    description: '对接 Tianshu 平台设备授权 API，完成集成测试',
    startDate: '2025-07-15',
    deadline: '2025-07-31',
    progress: 10,
    status: 'active',
  },
  {
    id: 'g4',
    title: '建立运动习惯',
    category: '生活',
    description: '每周至少运动 3 次，每次 30 分钟以上',
    startDate: '2025-07-01',
    deadline: '2025-12-31',
    progress: 30,
    status: 'active',
  },
]

export const goalCategories = ['开发', '工作', '学习', '生活']
