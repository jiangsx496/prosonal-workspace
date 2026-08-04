<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore, type TaskFilter } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import type { Task } from '@/mock/tasks'
import TaskModal from '@/components/TaskModal.vue'

const store = useTaskStore()
const dailyStore = useDailyStore()

const selectedIds = ref<Set<string>>(new Set())
const selectAll = ref(false)

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = new Set(sortedTasks.value.map((t) => t.id))
  } else {
    selectedIds.value.clear()
  }
}

function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function batchDelete() {
  selectedIds.value.forEach((id) => store.removeTask(id))
  selectedIds.value.clear()
  selectAll.value = false
}

function batchComplete() {
  selectedIds.value.forEach((id) => store.completeTask(id))
  selectedIds.value.clear()
  selectAll.value = false
}

function batchScheduleToday() {
  selectedIds.value.forEach((id) => dailyStore.addTaskToToday(id))
  selectedIds.value.clear()
  selectAll.value = false
}

const filters: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'deferred', label: '延期' },
]

const statusLabel: Record<string, string> = {
  'backlog': '任务池', 'doing': '进行中',
  'done': '已完成', 'deferred': '已延期',
}
const statusBadge: Record<string, string> = {
  'backlog': 'bg-slate-100 text-slate-600',
  'doing': 'bg-blue-50 text-blue-700',
  'done': 'bg-green-50 text-green-700',
  'deferred': 'bg-amber-50 text-amber-700',
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
const selectedCount = computed(() => selectedIds.value.size)

const statusSummary = computed(() => {
  const summary = { backlog: 0, doing: 0, done: 0, deferred: 0 }
  for (const task of store.filteredTasks) summary[task.status]++
  return summary
})

const prioritySummary = computed(() => {
  const summary = { high: 0, medium: 0, low: 0 }
  for (const task of store.filteredTasks) summary[task.priority]++
  return summary
})

const overdueCount = computed(() =>
  store.filteredTasks.filter((task) => formatDue(task.dueDate).urgent).length
)

// ---- 排序 ----
type SortMode = 'due' | 'created' | 'default'
const sortMode = ref<SortMode>('due')

const sortedTasks = computed(() => {
  const tasks = [...store.filteredTasks]
  if (sortMode.value === 'due') {
    return tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }
  if (sortMode.value === 'created') {
    return tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }
  return tasks
})
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <section class="rounded-3xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 md:p-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-text-muted">Tasks</p>
          <h1 class="mt-2 text-2xl font-semibold text-text-primary">任务池</h1>
          <p class="mt-1 text-sm text-text-muted">{{ taskCount }} 个任务</p>
        </div>
        <button class="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover" @click="openCreate">+ 新建任务</button>
      </div>
    </section>

    <div class="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,340px)]">
      <main class="space-y-4">
        <section class="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-900/3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="f in filters"
                :key="f.key"
                class="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                :class="store.filter===f.key ? 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/20' : 'text-text-muted hover:bg-card-hover hover:text-text-secondary'"
                @click="store.setFilter(f.key)"
              >{{ f.label }}</button>
            </div>
            <span class="mx-1 text-border">|</span>
            <span class="text-[10px] text-text-muted">排序</span>
            <button
              v-for="m in [{k:'due'as SortMode,l:'截止日'},{k:'created'as SortMode,l:'创建日'},{k:'default'as SortMode,l:'默认'}]"
              :key="m.k"
              class="rounded px-2 py-1 text-[10px] transition-colors"
              :class="sortMode===m.k ? 'bg-accent/10 text-accent font-medium' : 'text-text-muted hover:text-text-secondary'"
              @click="sortMode=m.k"
            >{{ m.l }}</button>
          </div>
        </section>

        <section v-if="sortedTasks.length > 0" class="space-y-2">
          <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm shadow-slate-900/3">
            <label class="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="rounded" />
              <span>全选</span>
            </label>
            <template v-if="selectedCount > 0">
              <span class="text-xs text-text-muted">已选 {{ selectedCount }} 项</span>
              <button class="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100" @click="batchComplete">✓ 批量完成</button>
              <button class="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20" @click="batchScheduleToday">安排今天</button>
              <button class="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100" @click="batchDelete">批量删除</button>
            </template>
          </div>

          <div class="space-y-2">
            <div v-for="task in sortedTasks" :key="task.id" class="group rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-900/3 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(task.id)"
                  @change="toggleSelect(task.id)"
                  class="mt-1 rounded shrink-0"
                />
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer"
                  :class="task.status==='done' ? 'bg-accent border-accent text-white' : 'border-border group-hover:border-accent/50'"
                  @click="store.toggleTask(task.id)"
                ><span v-if="task.status==='done'" class="text-xs">✓</span></span>
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex flex-wrap items-center gap-2">
                    <span class="h-2 w-2 shrink-0 rounded-full" :class="priorityDot[task.priority]"></span>
                    <span class="text-sm font-medium" :class="task.status==='done'?'text-text-muted line-through':'text-text-primary'">{{ task.title }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="text-text-muted">{{ task.project }}</span><span class="text-border">·</span>
                    <span class="rounded border px-1.5 py-0.5 text-xs" :class="priorityBadge[task.priority]">{{ priorityLabel[task.priority] }}</span>
                    <span class="rounded border px-1.5 py-0.5 text-xs" :class="statusBadge[task.status]">{{ statusLabel[task.status] }}</span>
                    <span class="text-border">·</span>
                    <span :class="formatDue(task.dueDate).urgent?'font-medium text-red-500':'text-text-muted'">{{ formatDue(task.dueDate).text }}</span>
                  </div>
                </div>
                <button class="shrink-0 flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-accent/10 hover:text-accent" @click.stop="openEdit(task)" title="编辑">✎</button>
                <button class="shrink-0 flex h-6 w-6 items-center justify-center rounded text-text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500" @click.stop="store.removeTask(task.id)" title="删除">✕</button>
              </div>
            </div>
          </div>
        </section>

        <div v-else class="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-text-muted shadow-sm shadow-slate-900/3">
          <p class="text-sm">暂无任务</p>
          <p class="mt-1 text-xs opacity-60">点击右上角按钮创建第一个任务</p>
        </div>
      </main>

      <aside class="space-y-4">
        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <span class="text-sm font-medium text-text-primary">任务结构</span>
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-secondary">进行中</span>
              <span class="font-medium text-text-primary">{{ statusSummary.doing }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-secondary">任务池</span>
              <span class="font-medium text-text-primary">{{ statusSummary.backlog }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-secondary">已完成</span>
              <span class="font-medium text-text-primary">{{ statusSummary.done }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-secondary">已延期</span>
              <span class="font-medium text-text-primary">{{ statusSummary.deferred }}</span>
            </div>
            <div class="pt-2">
              <div class="mb-2 flex items-center justify-between text-xs">
                <span class="text-text-secondary">逾期</span>
                <span class="font-medium text-red-500">{{ overdueCount }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-card-hover">
                <div class="h-full rounded-full bg-accent transition-all" :style="{ width: `${Math.min(100, overdueCount / Math.max(1, taskCount) * 100)}%` }"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="mb-4 flex items-center gap-2 border-b border-border pb-3">
            <span class="text-sm font-medium text-text-primary">优先级分布</span>
          </div>
          <div class="space-y-3">
            <div v-for="item in [
              { label: '高', value: prioritySummary.high, cls: 'bg-rose-400' },
              { label: '中', value: prioritySummary.medium, cls: 'bg-amber-400' },
              { label: '低', value: prioritySummary.low, cls: 'bg-slate-300' },
            ]" :key="item.label">
              <div class="mb-1 flex items-center justify-between text-xs">
                <span class="text-text-secondary">{{ item.label }}</span>
                <span class="font-medium text-text-primary">{{ item.value }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-card-hover">
                <div class="h-full rounded-full transition-all" :class="item.cls" :style="{ width: `${Math.max(item.value, 1) / Math.max(taskCount, 1) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">当前筛选</span>
            <span class="text-xs text-text-muted">{{ taskCount }} 条</span>
          </div>
          <p class="mt-2 text-sm text-text-secondary">筛选与排序已经分开，方便你更快切换任务视角。</p>
        </section>
      </aside>
    </div>

    <TaskModal :visible="showModal" :task="editingTask" @close="closeModal" />
  </div>
</template>
