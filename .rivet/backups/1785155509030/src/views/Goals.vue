<script setup lang="ts">
import { ref } from 'vue'
import { useGoalStore } from '@/stores/goals'
import type { Goal } from '@/mock/goals'

const goalStore = useGoalStore()

const showModal = ref(false)
const editingGoal = ref<Goal | null>(null)
const form = ref({ title:'', description:'', category:'开发', deadline:'' })

function openCreate() { editingGoal.value=null; form.value={title:'',description:'',category:'开发',deadline:''}; showModal.value=true }
function openEdit(g:Goal) { editingGoal.value=g; form.value={title:g.title,description:g.description,category:g.category,deadline:g.deadline}; showModal.value=true }
function closeModal() { showModal.value=false }

function submit() {
  if(!form.value.title.trim()) return
  if(editingGoal.value) {
    goalStore.updateGoal(editingGoal.value.id, form.value as any)
  } else {
    goalStore.addGoal({
      id:goalStore.generateId(), title:form.value.title.trim(), description:form.value.description.trim(),
      category:form.value.category, startDate:new Date().toISOString().slice(0,10),
      deadline:form.value.deadline||new Date().toISOString().slice(0,10),
      progress:0, status:'active', autoSchedule:false,
    } as Goal)
  }
  closeModal()
}

const statusLabel: Record<string,string> = { planned:'计划中', active:'进行中', completed:'已完成', expired:'已过期' }
const statusBadge: Record<string,string> = { planned:'bg-slate-100 text-slate-600', active:'bg-blue-50 text-blue-700', completed:'bg-green-50 text-green-700', expired:'bg-red-50 text-red-700' }
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
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-accent/10 hover:text-accent transition-all" @click.stop="openEdit(goal)" title="编辑">✎</button>
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all" @click.stop="goalStore.deleteGoal(goal.id)" title="删除">✕</button>
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

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" @click.self="closeModal">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-white border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-sm font-semibold text-text-primary">{{ editingGoal?'编辑目标':'新建目标' }}</h2>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="closeModal">✕</button>
          </div>
          <div class="p-5 space-y-4">
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">目标名称 *</label><input v-model="form.title" type="text" placeholder="输入目标名称..." class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" @keyup.enter="submit" /></div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">描述</label><textarea v-model="form.description" rows="2" placeholder="目标描述（可选）" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent resize-none"></textarea></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">分类</label><select v-model="form.category" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"><option v-for="c in goalStore.goalCategories" :key="c" :value="c">{{ goalStore.goalIcon(c) }} {{ c }}</option></select></div>
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">截止日期</label><input v-model="form.deadline" type="date" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent" /></div>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
            <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="closeModal">取消</button>
            <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!form.title.trim()" @click="submit">{{ editingGoal?'保存':'创建目标' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
