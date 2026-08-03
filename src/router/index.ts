import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // === 一级导航 ===
    { path: '/', name: 'execute', component: () => import('@/views/Execute.vue'), meta: { title: '今天' } },
    { path: '/inbox', name: 'inbox', component: () => import('@/views/Inbox.vue'), meta: { title: '收集' } },
    { path: '/goals/:id', name: 'goal-detail', component: () => import('@/views/GoalDetail.vue'), meta: { title: '目标详情' } },    { path: '/goals', name: 'goals', component: () => import('@/views/Goals.vue'), meta: { title: '目标' } },
    { path: '/resources', name: 'resources', component: () => import('@/views/Resources.vue'), meta: { title: '资源' } },
    { path: '/review', name: 'review', component: () => import('@/views/Review.vue'), meta: { title: '复盘' } },
    { path: '/interview', name: 'interview', component: () => import('@/views/InterviewLibrary.vue'), meta: { title: '面试题库' } },
    { path: '/calendar', name: 'calendar', component: () => import('@/views/Calendar.vue'), meta: { title: '日历' } },
    // === 降级页面（可通过 URL / Resources 入口访问）===
    { path: '/tasks', name: 'tasks', component: () => import('@/views/Tasks.vue'), meta: { title: '任务池' } },
    { path: '/habits', name: 'habits', component: () => import('@/views/Habits.vue'), meta: { title: '习惯' } },
    { path: '/journal', name: 'journal', component: () => import('@/views/Journal.vue'), meta: { title: '日志' } },
    { path: '/projects', name: 'projects', component: () => import('@/views/Projects.vue'), meta: { title: '项目' } },
    { path: '/notes', name: 'notes', component: () => import('@/views/Notes.vue'), meta: { title: '笔记' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: '设置' } },
  ],
})

export default router
