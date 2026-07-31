<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore, type TaskFilter } from '@/stores/tasks'
import type { Task } from '@/mock/tasks'
import TaskModal from '@/components/TaskModal.vue'

const store = useTaskStore()

const filters: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'deferred', label: '延期' },
]

const statusLabel: Record<string, string> = {
  'backlog': '任务池', 'today': '今日',
  'doing': '进行中', 'done': '已完成',
  'deferred': '延期', 'deferred': '已延期',
}
const statusBadge: Record<string, string> = {
  'backlog': 'bg-slate-100 text-slate-600', 'today': 'bg-indigo-50 text-indigo-700',
  'doing': 'bg-blue-50 text-blue-700',
  'done': 'bg-green-50 text-green-700',
  'deferred': 'bg-amber-50 text-amber-700', 'deferred': 'bg-amber-50 text-amber-700',
}
const priorityLabel: Record<Task['priority'], string> = { high: '高', medium: '中', low: '低' }
const priorityDot: Record<Task['priority'], string> = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-slate-300' }
const priorityBadge: Record<Task['priority'], string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

const showModal = ref(false)
const editingTask = ref<Task | null>(null)

function openCreate() { editingTask.value = null; showModal.value = true }
function openEdit(task: Task) { editingTask.value = task; showModal.value = true }
function closeModal() { showModal.value = false }

function formatDue(dateStr: string): { text: string; urgent: boolean } {
  const due = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { text: `已逾期 ${Math.abs(days)} 天`, urgent: true }
  if (days === 0) return { text: '今天截止', urgent: true }
  if (days === 1) return { text: '明天截止', urgent: false }
  if (days <= 3) return { text: `${days} 天后`, urgent: false }
  return { text: dateStr, urgent: false }
}

const taskCount = computed(() => store.filteredTasks.length)
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <div><h1 class="text-2xl font-bold text-text-primary">任务池</h1><p class="text-xs text-text-muted mt-1">{{ taskCount }} 个任务</p></div>
      <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="openCreate">+ 新建任务</button>
    </div>

    <div class="flex gap-2 flex-wrap">
      <button v-for="f in filters" :key="f.key" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        :class="store.filter===f.key ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-card-hover'"
        @click="store.setFilter(f.key)">{{ f.label }}</button>
    </div>

    <div v-if="store.filteredTasks.length > 0" class="space-y-2">
      <div v-for="task in store.filteredTasks" :key="task.id" class="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow group">
        <div class="flex items-start gap-3">
          <span class="w-5 h-5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            :class="task.status==='done' ? 'bg-accent border-accent text-white' : 'border-border group-hover:border-accent/50'"
            @click="store.toggleTask(task.id)"><span v-if="task.status==='done'" class="text-xs">✓</span></span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span class="w-2 h-2 rounded-full shrink-0" :class="priorityDot[task.priority]"></span>
              <span class="text-sm font-medium" :class="task.status==='done'?'text-text-muted line-through':'text-text-primary'">{{ task.title }}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap text-xs">
              <span class="text-text-muted">{{ task.project }}</span><span class="text-border">·</span>
              <span class="px-1.5 py-0.5 rounded border text-xs" :class="priorityBadge[task.priority]">{{ priorityLabel[task.priority] }}</span>
              <span class="px-1.5 py-0.5 rounded border text-xs" :class="statusBadge[task.status]">{{ statusLabel[task.status] }}</span>
              <span class="text-border">·</span>
              <span :class="formatDue(task.dueDate).urgent?'text-red-500 font-medium':'text-text-muted'">{{ formatDue(task.dueDate).text }}</span>
            </div>
          </div>
          <button class="shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-accent/10 hover:text-accent transition-all" @click.stop="openEdit(task)" title="编辑">✎</button>
          <button class="shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all" @click.stop="store.removeTask(task.id)" title="删除">✕</button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <span class="text-4xl mb-4">📋</span><p class="text-sm">暂无任务</p><p class="text-xs mt-1 opacity-60">点击右上角按钮创建第一个任务</p>
    </div>

    <TaskModal :visible="showModal" :task="editingTask" @close="closeModal" />
  </div>
</template>
