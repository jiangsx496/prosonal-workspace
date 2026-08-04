<script setup lang="ts">
import { ref } from 'vue'
import { todayLocal } from '@/utils/date'
import { useHabitStore } from '@/stores/habits'
import type { Habit } from '@/mock/habits'

const store = useHabitStore()
const showModal = ref(false)
const editing = ref<Habit | null>(null)
const form = ref({ name:'', category:'运动' as Habit['category'], frequency:'daily' as Habit['frequency'], target:'' })

function openCreate() { editing.value=null; form.value={name:'',category:'运动',frequency:'daily',target:''}; showModal.value=true }
function openEdit(h:Habit) { editing.value=h; form.value={name:h.name,category:h.category,frequency:h.frequency,target:h.target}; showModal.value=true }
function submit() {
  if(!form.value.name.trim()) return
  if(editing.value) store.updateHabit(editing.value.id, form.value as any)
  else store.addHabit({id:store.generateId(),name:form.value.name.trim(),category:form.value.category,frequency:form.value.frequency,target:form.value.target,completedDates:[],streak:0,active:true,createdAt:todayLocal()} as Habit)
  showModal.value=false
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="flex items-center justify-between">
      <div><h1 class="text-2xl font-bold text-text-primary">习惯</h1><p class="text-xs text-text-muted mt-1">{{ store.activeHabits.length }} 个活跃习惯</p></div>
      <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="openCreate">+ 新建习惯</button>
    </div>

    <div v-if="store.activeHabits.length > 0" class="grid gap-4 sm:grid-cols-2">
      <div v-for="h in store.activeHabits" :key="h.id" class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3 hover:shadow-sm transition-shadow group">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ store.habitCategoryMeta[h.category]?.icon || '✅' }}</span>
            <div>
              <h3 class="font-semibold text-text-primary">{{ h.name }}</h3>
              <p class="text-xs text-text-muted">{{ store.habitCategoryMeta[h.category]?.label }} · {{ h.frequency==='daily'?'每天':'每周' }} · 目标 {{ h.target }}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-accent/10 hover:text-accent transition-all" @click="openEdit(h)" title="编辑">✎</button>
            <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all" @click="store.removeHabit(h.id)" title="删除">✕</button>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-muted">本周完成</span>
            <span class="text-sm font-medium text-accent">{{ store.weeklyCount(h.id) }} / {{ h.frequency==='weekly'?1:7 }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-muted">连续天数</span>
            <span class="text-sm font-bold text-amber-500">{{ h.streak }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-text-muted">今日</span>
            <button class="px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="store.isDone(h)?'bg-green-100 text-green-700':'bg-accent/10 text-accent hover:bg-accent/20'"
              @click="store.toggle(h.id)">{{ store.isDone(h)?'已完成':'打卡' }}</button>
          </div>

          <!-- 月度打卡热力图 -->
          <div class="mt-3 pt-3 border-t border-border">
            <div class="flex gap-0.5 justify-center">
              <div v-for="(week, wi) in store.getHeatmap(h.id)" :key="wi" class="flex flex-col gap-0.5">
                <div
                  v-for="(day, di) in week" :key="di"
                  class="w-3 h-3 rounded-sm"
                  :class="day.isFuture ? 'bg-transparent' : day.completed ? (day.isToday ? 'bg-green-500 ring-1 ring-green-300' : 'bg-green-400') : 'bg-gray-200'"
                  :title="day.date + (day.completed ? ' ✅' : '')"
                ></div>
              </div>
            </div>
            <div class="flex items-center justify-between mt-1.5 text-[10px] text-text-muted/60">
              <span>{{ store.getHeatmap(h.id)[0]?.[0]?.date?.slice(5) || '' }}</span>
              <span>{{ store.getHeatmap(h.id)[4]?.[6]?.date?.slice(5) || '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <p class="text-sm">还没有习惯</p><p class="text-xs mt-1 opacity-60">创建一个习惯开始追踪吧</p>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]" @click.self="showModal=false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-sm font-medium text-text-primary">{{ editing?'编辑习惯':'新建习惯' }}</h2>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-card-hover transition-colors" @click="showModal=false">✕</button>
          </div>
          <div class="p-5 space-y-4">
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">习惯名称 *</label><input v-model="form.name" type="text" placeholder="如：运动 30 分钟" class="w-full px-3 py-2 rounded-lg border border-border bg-card-hover/50 text-sm outline-none focus:border-accent" @keyup.enter="submit" /></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">分类</label><select v-model="form.category" class="w-full px-3 py-2 rounded-lg border border-border bg-card-hover/50 text-sm outline-none focus:border-accent"><option v-for="(v, k) in store.habitCategoryMeta" :key="k" :value="k">{{ v.icon }} {{ v.label }}</option></select></div>
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">频率</label><select v-model="form.frequency" class="w-full px-3 py-2 rounded-lg border border-border bg-card-hover/50 text-sm outline-none focus:border-accent"><option value="daily">每天</option><option value="weekly">每周</option></select></div>
            </div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">目标量</label><input v-model="form.target" type="text" placeholder="如：30 分钟 / 20 页" class="w-full px-3 py-2 rounded-lg border border-border bg-card-hover/50 text-sm outline-none focus:border-accent" /></div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-card-hover/50">
            <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-card-hover transition-colors" @click="showModal=false">取消</button>
            <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!form.name.trim()" @click="submit">{{ editing?'保存':'创建' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
