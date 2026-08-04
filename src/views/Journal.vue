<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJournalStore } from '@/stores/journal'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { moodOptions } from '@/mock/journal'

const journal = useJournalStore()
const taskStore = useTaskStore()
const habitStore = useHabitStore()

const tab = ref<'today'|'history'>('today')
const content = ref('')
const mood = ref<'😊'|'😐'|'😤'|'🎉'|'😴'>('😊')

onMounted(()=>{
  if (journal.todayJournal) {
    content.value = journal.todayJournal.content
    mood.value = journal.todayJournal.mood
  }
})

function saveJournal() {
  journal.createOrUpdate({
    content: content.value,
    mood: mood.value,
    completedTaskIds: taskStore.tasks.filter((t)=>t.status==='done').map((t)=>t.id),
    completedHabitIds: habitStore.habits.filter((h)=>habitStore.isDone(h)).map((h)=>h.id),
  })
  alert('日志已保存 ✅')
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0">
    <div class="rounded-3xl border border-border bg-card px-5 py-5 shadow-sm shadow-slate-900/3 md:px-6">
      <p class="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">Journal</p>
      <div class="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-text-primary">日志</h1>
          <p class="mt-1 text-sm text-text-muted">{{ tab==='today'?'记录今天的收获':'回顾过去的日子' }}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card-hover/60 px-4 py-3 text-sm text-text-secondary">
          历史记录 <span class="font-semibold tabular-nums text-text-primary">{{ journal.history.length }}</span>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <button class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="tab==='today'?'bg-accent/10 text-accent':'text-text-muted hover:text-text-secondary'" @click="tab='today'">今日记录</button>
      <button class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="tab==='history'?'bg-accent/10 text-accent':'text-text-muted hover:text-text-secondary'" @click="tab='history'">历史 ({{ journal.history.length }})</button>
    </div>

    <!-- Today -->
      <div v-if="tab==='today'" class="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
      <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-text-primary">心情</h3>
          <div class="flex gap-1">
            <button v-for="m in moodOptions" :key="m" class="text-xl px-2 py-1 rounded-lg transition-colors" :class="mood===m?'bg-accent/10 ring-1 ring-accent/30':'hover:bg-card-hover'" @click="mood=m">{{ m }}</button>
          </div>
        </div>
        <textarea v-model="content" placeholder="今天完成了什么？有什么收获和感悟？" class="w-full h-40 px-4 py-3 rounded-lg border border-border bg-card-hover/50 text-text-primary text-sm outline-none focus:border-accent resize-none"></textarea>
        <button class="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover" @click="saveJournal">保存日志</button>
      </div>

      <div class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
        <h3 class="text-sm font-medium text-text-primary mb-3">今日统计</h3>
        <div class="grid gap-3 text-center sm:grid-cols-3 xl:grid-cols-1">
          <div class="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 py-4"><p class="text-2xl font-semibold text-emerald-600">{{ taskStore.tasks.filter((t)=>t.status==='done').length }}</p><p class="text-xs text-emerald-600/80 mt-1">完成任务</p></div>
          <div class="rounded-2xl border border-sky-200/70 bg-sky-50/80 py-4"><p class="text-2xl font-semibold text-sky-600">{{ habitStore.doneCount }}</p><p class="text-xs text-sky-600/80 mt-1">完成习惯</p></div>
          <div class="rounded-2xl border border-amber-200/70 bg-amber-50/80 py-4"><p class="text-2xl font-semibold text-amber-600">{{ taskStore.deferredTasks.length }}</p><p class="text-xs text-amber-600/80 mt-1">延期任务</p></div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div v-else class="space-y-3">
      <div v-if="journal.history.length>0">
        <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div v-for="j in journal.history" :key="j.id" class="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-slate-900/3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-text-primary">{{ j.date }}</span>
            <span class="text-lg">{{ j.mood }}</span>
          </div>
          <p class="text-sm text-text-secondary whitespace-pre-wrap">{{ j.content }}</p>
          <div class="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-text-muted">
            <span>{{ j.completedTaskIds.length }} 任务</span>
            <span>{{ j.completedHabitIds.length }} 习惯</span>
          </div>
        </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
        <p class="text-sm">还没有历史记录</p>
      </div>
    </div>
  </div>
</template>
