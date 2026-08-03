<script setup lang="ts">
import { ref, computed } from 'vue'
import { todayLocal } from '@/utils/date'
import { useGoalStore } from '@/stores/goals'
import { useTaskStore } from '@/stores/tasks'
import type { Goal } from '@/mock/goals'
import type { Task } from '@/mock/tasks'

const goalStore = useGoalStore()
const taskStore = useTaskStore()

const showModal = ref(false)
const editingGoal = ref<Goal | null>(null)

// 两步创建流程：'form' = 填写目标信息, 'tasks' = 添加关联任务
const step = ref<'form' | 'tasks'>('form')
const createdGoalId = ref<string | null>(null)
const taskInput = ref('')
const pendingTasks = ref<{ title: string; priority: Task['priority'] }[]>([])

const form = ref({ title:'', description:'', category:'开发', deadline:'', priority:'medium' as Goal['priority'] })

function openCreate() {
  editingGoal.value = null
  step.value = 'form'
  createdGoalId.value = null
  taskInput.value = ''
  pendingTasks.value = []
  form.value = { title:'', description:'', category:'开发', deadline:'', priority:'medium' as Goal['priority'] }
  showModal.value = true
}
function openEdit(g: Goal) {
  editingGoal.value = g
  step.value = 'form'
  form.value = { title:g.title, description:g.description, category:g.category, deadline:g.deadline, priority:g.priority || 'medium' }
  showModal.value = true
}
function closeModal() {
  showModal.value = false
  step.value = 'form'
  createdGoalId.value = null
  pendingTasks.value = []
  taskInput.value = ''
}

function submit() {
  if (!form.value.title.trim()) return
  if (editingGoal.value) {
    goalStore.updateGoal(editingGoal.value.id, form.value as any)
    closeModal()
  } else {
    const id = goalStore.generateId()
    goalStore.addGoal({
      id, title: form.value.title.trim(), description: form.value.description.trim(),
      category: form.value.category, startDate: todayLocal(),
      deadline: form.value.deadline || todayLocal(),
      progress: 0, priority: form.value.priority, status: 'active', autoSchedule: false,
    } as Goal)
    createdGoalId.value = id
    step.value = 'tasks'  // 进入第二步：添加关联任务
  }
}

function addTaskItem() {
  const title = taskInput.value.trim()
  if (!title) return
  pendingTasks.value.push({ title, priority: 'medium' })
  taskInput.value = ''
}

function removeTaskItem(idx: number) {
  pendingTasks.value.splice(idx, 1)
}

function finishCreate() {
  if (createdGoalId.value && pendingTasks.value.length > 0) {
    const today = todayLocal()
    pendingTasks.value.forEach((t) => {
      taskStore.addTask({
        id: taskStore.generateId(), title: t.title,
        project: '', goalId: createdGoalId.value,
        category: 'work', priority: t.priority,
        status: 'backlog', source: 'goal',
        dueDate: today, scheduledDate: '', deferCount: 0,
        createdAt: today,
      } as Task)
    })
  }
  closeModal()
}

const statusLabel: Record<string,string> = { planned:'计划中', active:'进行中', completed:'已完成', expired:'已过期' }
const statusBadge: Record<string,string> = { planned:'bg-slate-100 text-slate-600', active:'bg-blue-50 text-blue-700', completed:'bg-green-50 text-green-700', expired:'bg-red-50 text-red-700' }

// ---- 删除弹窗 ----
const deleteModal = ref(false)
const deleteTarget = ref<Goal | null>(null)
type DeleteStrategy = 'cascade' | 'detach'
const deleteStrategy = ref<DeleteStrategy>('cascade')

function openDelete(goal: Goal) {
  deleteTarget.value = goal
  // 有关联任务默认级联删除，无关联任务直接删
  deleteStrategy.value = taskStore.tasks.some((t) => t.goalId === goal.id) ? 'cascade' : 'cascade'
  deleteModal.value = true
}

function confirmDelete() {
  if (!deleteTarget.value) return
  // 级联逻辑由 store 层处理：cascade 会 removeTask（内建 daily plan 清理），detach 只解除 goalId
  goalStore.deleteGoal(deleteTarget.value.id, deleteStrategy.value)
  deleteModal.value = false
  deleteTarget.value = null
}

const linkedTaskCount = computed(() =>
  deleteTarget.value ? taskStore.tasks.filter((t) => t.goalId === deleteTarget.value!.id).length : 0
)
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <div><h1 class="text-2xl font-bold text-text-primary">目标</h1><p class="text-xs text-text-muted mt-1">{{ goalStore.activeGoals.length }} 个进行中</p></div>
      <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="openCreate">+ 新建目标</button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <router-link v-for="goal in goalStore.goals" :key="goal.id" :to="`/goals/${goal.id}`" class="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow group">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">{{ goalStore.goalIcon(goal.category) }}</span>
              <h3 class="font-semibold text-text-primary truncate">{{ goal.title }}</h3>
            </div>
            <p class="text-xs text-text-muted line-clamp-2">{{ goal.description }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0 ml-2">
            <span class="text-xs px-2 py-0.5 rounded border" :class="statusBadge[goal.status]">{{ statusLabel[goal.status] }}</span>
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-accent/10 hover:text-accent transition-all" @click.prevent.stop="openEdit(goal)" title="编辑">✎</button>
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all" @click.prevent.stop="openDelete(goal)" title="删除">✕</button>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-text-muted">进度 ({{ goalStore.goalDoneCount(goal.id) }}/{{ goalStore.goalTaskCount(goal.id) }})</span>
              <span class="text-xs font-medium" :class="goalStore.goalProgress(goal.id)>=100?'text-green-600':'text-accent'">{{ goalStore.goalProgress(goal.id) }}%</span>
            </div>
            <div class="h-2 bg-card-hover rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :style="{width:goalStore.goalProgress(goal.id)+'%',backgroundColor:goalStore.progressColor(goalStore.goalProgress(goal.id))}"></div>
            </div>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-text-muted">关联 {{ goalStore.goalTaskCount(goal.id) }} 个任务</span>
            <span :class="goalStore.daysLeft(goal.deadline).urgent?'text-red-500 font-medium':'text-text-muted'">{{ goalStore.daysLeft(goal.deadline).text }}</span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Modal: 两步创建流程 -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" @click.self="closeModal">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-white border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
          <!-- Step 1: 目标信息 -->
          <template v-if="step === 'form'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 class="text-sm font-semibold text-text-primary">{{ editingGoal ? '编辑目标' : '新建目标' }}</h2>
              <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="closeModal">✕</button>
            </div>
            <div class="p-5 space-y-4">
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">目标名称 *</label><input v-model="form.title" type="text" placeholder="例如：准备实习" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" @keyup.enter="submit" /></div>
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">描述</label><textarea v-model="form.description" rows="2" placeholder="目标描述（可选）" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent resize-none"></textarea></div>
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-text-secondary mb-1.5">分类</label><select v-model="form.category" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option v-for="c in goalStore.goalCategories" :key="c" :value="c">{{ goalStore.goalIcon(c) }} {{ c }}</option></select></div>
                <div><label class="block text-xs font-medium text-text-secondary mb-1.5">截止日期</label><input v-model="form.deadline" type="date" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" /></div>
              </div>
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">优先级</label><div class="flex gap-2">
                <button v-for="p in [{v:'high',l:'🔴 高'},{v:'medium',l:'🟡 中'},{v:'low',l:'⚪ 低'}]" :key="p.v" type="button" class="flex-1 px-3 py-2 rounded-lg border text-sm transition-colors" :class="form.priority===p.v?'border-accent bg-accent/10 text-accent font-medium':'border-border bg-gray-50 text-text-secondary hover:bg-gray-100'" @click="form.priority=p.v as Goal['priority']">{{ p.l }}</button>
              </div></div>
            </div>
            <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
              <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="closeModal">取消</button>
              <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!form.title.trim()" @click="submit">{{ editingGoal ? '保存' : '下一步：添加任务 →' }}</button>
            </div>
          </template>

          <!-- Step 2: 添加关联任务 -->
          <template v-if="step === 'tasks'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 class="text-sm font-semibold text-text-primary">添加关联任务</h2>
                <p class="text-xs text-text-muted mt-0.5">为目标「{{ form.title }}」拆解子任务</p>
              </div>
              <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="finishCreate">✕</button>
            </div>
            <div class="p-5 space-y-3">
              <!-- 输入区 -->
              <div class="flex gap-2">
                <input v-model="taskInput" type="text" placeholder="例如：完善简历，按回车添加" class="flex-1 px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent focus:bg-white transition-colors" @keyup.enter="addTaskItem" />
                <button class="px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!taskInput.trim()" @click="addTaskItem">+ 添加</button>
              </div>
              <!-- 已添加的任务列表 -->
              <div v-if="pendingTasks.length > 0" class="space-y-1.5 pt-2">
                <div v-for="(t, idx) in pendingTasks" :key="idx" class="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                  <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span class="flex-1 min-w-0 text-sm text-text-primary">{{ t.title }}</span>
                  <button class="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors text-xs" @click="removeTaskItem(idx)">✕</button>
                </div>
              </div>
              <div v-else class="flex flex-col items-center justify-center py-6 text-text-muted text-sm">
                <span>还没有添加任务</span>
                <span class="text-xs mt-1 opacity-60">输入任务名称并按回车快速添加</span>
              </div>
            </div>
            <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
              <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="finishCreate">{{ pendingTasks.length > 0 ? `完成（${pendingTasks.length} 个任务）` : '跳过，稍后添加' }}</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
    <!-- 删除弹窗 -->
    <Teleport to="body">
      <div v-if="deleteModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" @click.self="deleteModal=false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-white border border-border rounded-2xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-border">
            <h2 class="text-sm font-semibold text-text-primary">删除目标</h2>
          </div>
          <div class="p-5 space-y-3">
            <p class="text-sm text-text-secondary">确定删除「{{ deleteTarget?.title }}」？</p>
            <div v-if="linkedTaskCount > 0" class="space-y-3">
              <p class="text-xs text-text-muted">该目标关联了 {{ linkedTaskCount }} 个任务，请选择处理方式：</p>
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="radio" v-model="deleteStrategy" value="cascade" class="mt-0.5" />
                <div>
                  <span class="text-sm text-text-primary">删除目标及关联任务</span>
                  <p class="text-xs text-text-muted">任务和日计划中的引用将一并清除</p>
                </div>
              </label>
              <label class="flex items-start gap-2 cursor-pointer">
                <input type="radio" v-model="deleteStrategy" value="detach" class="mt-0.5" />
                <div>
                  <span class="text-sm text-text-primary">只删目标，保留任务</span>
                  <p class="text-xs text-text-muted">任务保留，仅解除 goalId 关联</p>
                </div>
              </label>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
            <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="deleteModal=false">取消</button>
            <button class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
