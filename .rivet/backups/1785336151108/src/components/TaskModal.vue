<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Task } from '@/mock/tasks'
import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'

const props = defineProps<{ visible: boolean; task?: Task | null; presetDate?: string }>()
const emit = defineEmits<{ close: [] }>()

const store = useTaskStore()
const goalStore = useGoalStore()
const dailyStore = useDailyStore()

const todayStr = () => new Date().toISOString().slice(0, 10)

const form = ref({
  title: '', description: '',
  priority: 'medium' as Task['priority'],
  status: 'backlog' as Task['status'],
  category: 'work' as Task['category'],
  project: store.projects[0],
  goalId: '' as string | null,
  dueDate: todayStr(),
  scheduledDate: todayStr(),
})

watch(() => props.visible, (v) => {
  if (!v) return
  if (props.task) {
    const t = props.task
    form.value = {
      title: t.title, description: t.description || '', priority: t.priority,
      status: t.status, category: t.category, project: t.project,
      goalId: t.goalId || '', dueDate: t.dueDate, scheduledDate: t.scheduledDate || t.dueDate,
    }
  } else {
    const preset = props.presetDate || todayStr()
    form.value = {
      title: '', description: '', priority: 'medium', status: 'backlog',
      category: 'work', project: store.projects[0], goalId: '',
      dueDate: preset, scheduledDate: preset,
    }
  }
})

function submit() {
  if (!form.value.title.trim()) return
  const today = todayStr()
  // 创建模式：按 scheduledDate 决定 status
  const autoStatus = (props.task ? form.value.status : 'backlog') as Task['status']
  const base = {
    title: form.value.title.trim(), description: form.value.description.trim(),
    priority: form.value.priority, status: autoStatus,
    category: form.value.category, project: form.value.project,
    goalId: form.value.goalId || null,
    dueDate: form.value.dueDate, scheduledDate: form.value.scheduledDate,
    source: 'manual' as const, deferCount: 0,
  }
  if (props.task) {
    store.updateTask(props.task.id, base as any)
    // 编辑后：如果 status=today 且不在 DailyPlan，自动加入
    if (autoStatus === 'today') dailyStore.addTaskToToday(props.task.id)
  } else {
    const id = store.generateId()
    store.addTask({ id, ...base, createdAt: today } as Task)
    // 新建：scheduledDate=今天 → 自动入 DailyPlan
    if (autoStatus === 'today') dailyStore.addTaskToToday(id)
  }
  emit('close')
}

const categoryOptions = [
  { value: 'work', label: '💼 工作' },
  { value: 'study', label: '📚 学习' },
  { value: 'exercise', label: '🏃 运动' },
  { value: 'life', label: '🏠 生活' },
]

const statusOptions: { value: Task['status']; label: string }[] = [
  { value: 'backlog', label: '📥 任务池' },
  { value: 'doing', label: '🔄 进行中' },
  { value: 'done', label: '✅ 已完成' },
  { value: 'deferred', label: '⏸️ 延期' },
]
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div class="relative bg-white border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 class="text-sm font-semibold text-text-primary">{{ props.task ? '编辑任务' : '新建任务' }}</h2>
          <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="emit('close')">✕</button>
        </div>
        <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">任务名称 *</label>
            <input v-model="form.title" type="text" placeholder="输入任务名称..." class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent focus:bg-white transition-colors" @keyup.enter="submit" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1.5">描述</label>
            <textarea v-model="form.description" rows="2" placeholder="任务描述（可选）" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent focus:bg-white transition-colors resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">分类</label><select v-model="form.category" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</option></select></div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">优先级</label><select v-model="form.priority" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">⚪ 低</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">项目</label><select v-model="form.project" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option v-for="p in store.projects" :key="p" :value="p">{{ p }}</option></select></div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">关联目标</label><select v-model="form.goalId" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option value="">无</option><option v-for="g in goalStore.activeGoals" :key="g.id" :value="g.id">{{ g.title }}</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">执行日期</label><input v-model="form.scheduledDate" type="date" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" /></div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">截止日期</label><input v-model="form.dueDate" type="date" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" /></div>
          </div>
          <div v-if="props.task">
            <label class="block text-xs font-medium text-text-secondary mb-1.5">状态</label>
            <select v-model="form.status" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option></select>
          </div>
        </div>
        <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
          <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="emit('close')">取消</button>
          <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!form.title.trim()" @click="submit">{{ props.task ? '保存' : '创建任务' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
