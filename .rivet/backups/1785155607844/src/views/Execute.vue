<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useHabitStore } from '@/stores/habits'
import { useGoalStore } from '@/stores/goals'
import { useDailyStore } from '@/stores/daily'
import { useReminderStore } from '@/stores/reminders'
import { useJournalStore } from '@/stores/journal'
import TaskModal from '@/components/TaskModal.vue'
import { generateDailyPlan } from '@/services/scheduler'

const taskStore = useTaskStore()
const habitStore = useHabitStore()
const goalStore = useGoalStore()
const dailyStore = useDailyStore()
const reminderStore = useReminderStore()
const journalStore = useJournalStore()

const showCreate = ref(false)
const generating = ref(false)
const showEndDay = ref(false)

// ---- 结束今天：生成总结草稿 ----
const endDayDraft = computed(() => {
  const done = todayTasks.value.filter((t) => t.status === 'done')
  const undone = todayTasks.value.filter((t) => t.status !== 'done')
  const habitsDone = habitStore.activeHabits.filter((h) => habitStore.isDone(h))
  const lines: string[] = []
  lines.push(`完成任务（${done.length}）：`)
  done.forEach((t) => lines.push(`  ✅ ${t.title}`))
  if (done.length === 0) lines.push('  （无）')
  lines.push('')
  lines.push(`完成习惯（${habitsDone.length}/${habitStore.activeHabits.length}）：`)
  habitsDone.forEach((h) => lines.push(`  🔥 ${h.name}`))
  if (habitsDone.length === 0) lines.push('  （无）')
  lines.push('')
  if (undone.length > 0) {
    lines.push(`未完成任务（${undone.length}，已标记延期）：`)
    undone.forEach((t) => lines.push(`  📥 ${t.title}`))
  }
  return lines.join('\n')
})

function openEndDay() { showEndDay.value = true }
function saveEndDay() {
  journalStore.createOrUpdate({
    content: endDayDraft.value,
    mood: journalStore.todayJournal?.mood || '😊',
    completedTaskIds: todayTasks.value.filter((t) => t.status === 'done').map((t) => t.id),
    completedHabitIds: habitStore.activeHabits.filter((h) => habitStore.isDone(h)).map((h) => h.id),
  })
  // 自动延期未完成任务
  todayTasks.value.filter((t) => t.status !== 'done').forEach((t) => taskStore.deferTask(t.id))
  showEndDay.value = false
}

onMounted(() => {
  const today = new Date().toISOString().slice(0,10)
  const stored = localStorage.getItem('pw-reminders-refreshed')
  if (stored !== today) {
    localStorage.setItem('pw-reminders-refreshed', today)
    reminderStore.refreshDailyReminders(
      taskStore.pendingCount,
      taskStore.deferredTasks.length,
      goalStore.activeGoals.map((g) => {
        const d = new Date(g.deadline); const t = new Date(); t.setHours(0,0,0,0)
        return { id: g.id, title: g.title, days: Math.ceil((d.getTime()-t.getTime())/86400000) }
      }),
      habitStore.activeHabits.filter((h) => !habitStore.isDone(h)).map((h) => h.name),
    )
  }
})

async function runScheduler() {
  generating.value = true
  await new Promise((r) => setTimeout(r, 300))
  const count = generateDailyPlan()
  generating.value = false
  alert(count > 0 ? `已生成 ${count} 个今日任务` : '没有新的任务需要安排')
}

// ---- 日期 & 问候 ----
const now = computed(() => {
  const d = new Date()
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  return { month: d.getMonth()+1, day: d.getDate(), weekday: weekdays[d.getDay()], hour: d.getHours(), minute: d.getMinutes() }
})
const greeting = computed(() => {
  const h = now.value.hour
  if (h<6) return { emoji:'🌙', text:'夜深了' }
  if (h<9) return { emoji:'☀️', text:'早上好' }
  if (h<12) return { emoji:'☀️', text:'上午好' }
  if (h<14) return { emoji:'🌤️', text:'中午好' }
  if (h<18) return { emoji:'🌤️', text:'下午好' }
  return { emoji:'🌙', text:'晚上好' }
})
const timeDisplay = computed(() => `${now.value.hour.toString().padStart(2,'0')}:${now.value.minute.toString().padStart(2,'0')}`)

// ---- 今日任务 ----
const todayTaskIds = computed(() => dailyStore.todayPlan.taskIds)
// 双源：DailyPlan 中的 + status=today/doing 的任务，取并集
const todayTasks = computed(() => {
  const planIds = new Set(todayTaskIds.value)
  const statusIds = new Set(taskStore.todayTasks.map((t) => t.id))
  const allIds = new Set([...planIds, ...statusIds])
  return taskStore.tasks.filter((t) => allIds.has(t.id))
})
const todayDone = computed(() => todayTasks.value.filter((t) => t.status === 'done').length)
const todayTotal = computed(() => todayTasks.value.length)
const progressPct = computed(() => todayTotal.value === 0 ? 0 : Math.round((todayDone.value / todayTotal.value) * 100))

// ---- 优先级排序 ----
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
const sortedTodayTasks = computed(() => [...todayTasks.value].sort((a, b) => {
  const p = priorityOrder[a.priority] - priorityOrder[b.priority]
  if (p !== 0) return p
  return (a.dueDate || '').localeCompare(b.dueDate || '')
}))
const top3Tasks = computed(() => sortedTodayTasks.value.filter((t) => t.status !== 'done').slice(0, 3))
const otherTasks = computed(() => sortedTodayTasks.value.filter((t) => !top3Tasks.value.includes(t)))

// ---- 下一件要做的事 ----
const nextAction = computed(() => {
  // 1. 优先：今日未完成的 high priority
  const urgent = todayTasks.value.find((t) => t.priority === 'high' && t.status !== 'done')
  if (urgent) return { icon: '🔴', text: urgent.title, label: '紧急任务' }
  // 2. 今日未完成的第一个
  const undone = todayTasks.value.find((t) => t.status !== 'done')
  if (undone) return { icon: '📌', text: undone.title, label: '下一任务' }
  // 3. 未完成的习惯
  const habit = habitStore.activeHabits.find((h) => !habitStore.isDone(h))
  if (habit) return { icon: '🔥', text: habit.name, label: '待打卡习惯' }
  // 4. 全部完成
  return { icon: '🎉', text: '今天的任务都完成了！', label: '完成' }
})

const priorityDot: Record<string,string> = { high:'bg-red-400', medium:'bg-amber-400', low:'bg-slate-300' }

function toggleAndTrack(taskId: string) { taskStore.toggleTask(taskId) }
function deferUnfinished() {
  todayTasks.value.filter((t) => t.status !== 'done').forEach((t) => taskStore.deferTask(t.id))
}
function goalName(goalId: string | null): string {
  if (!goalId) return ''
  const g = goalStore.goals.find((g) => g.id === goalId)
  return g ? goalStore.goalIcon(g.category) + ' ' + g.title : ''
}
</script>

<template>
  <div class="space-y-5 pb-20 md:pb-0">
    <!-- ========== 1. 今日状态 ========== -->
    <div class="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div class="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p class="text-4xl md:text-5xl font-light text-text-primary tracking-tight tabular-nums">{{ timeDisplay }}</p>
          <p class="text-2xl md:text-3xl font-semibold text-text-primary mt-2">{{ greeting.emoji }} {{ greeting.text }} Richard</p>
          <p class="text-sm text-text-muted mt-1">今天是 {{ now.month }}月{{ now.day }}日 {{ now.weekday }} · {{ taskStore.pendingCount }} 项待办 · {{ habitStore.doneCount }}/{{ habitStore.activeHabits.length }} 习惯</p>
        </div>
        <div v-if="todayTotal > 0" class="flex flex-col items-end gap-1">
          <span class="text-3xl font-bold" :class="progressPct===100?'text-green-500':'text-accent'">{{ progressPct }}%</span>
          <span class="text-xs text-text-muted">{{ todayDone }}/{{ todayTotal }} 完成</span>
        </div>
      </div>
      <div class="mt-4 h-2 bg-card-hover rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-700" :style="{width:progressPct+'%',backgroundColor:progressPct===100?'#16a34a':'#4f46e5'}"></div>
      </div>
      <div class="mt-3 flex justify-end gap-2">
        <button class="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-50" :disabled="generating" @click="runScheduler">{{ generating ? '生成中...' : '🤖 生成今日计划' }}</button>
        <button class="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors" @click="openEndDay">🌙 结束今天</button>
      </div>
    </div>

    <!-- ========== 2. 下一件要做的事（替代旧提醒区） ========== -->
    <div class="bg-gradient-to-r from-accent/10 to-blue-50 border border-accent/20 rounded-2xl p-5 flex items-center gap-4">
      <span class="text-3xl shrink-0">{{ nextAction.icon }}</span>
      <div class="flex-1 min-w-0">
        <p class="text-xs text-text-muted uppercase tracking-wide">{{ nextAction.label }}</p>
        <p class="text-base font-medium text-text-primary truncate">{{ nextAction.text }}</p>
      </div>
      <span class="text-accent text-xl shrink-0">→</span>
    </div>

    <!-- ========== 3. 完整任务列表 + 目标进度 ========== -->
    <div class="grid gap-5 lg:grid-cols-2">
      <!-- 左栏 -->
      <div class="space-y-5">
        <!-- 完整任务列表 -->
        <div class="bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-text-primary">📋 今日全部任务</h3>
            <span class="text-xs text-text-muted">{{ todayDone }}/{{ todayTotal }}</span>
          </div>
          <div v-if="todayTasks.length > 0" class="space-y-1">
            <div v-for="t in sortedTodayTasks" :key="t.id" class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-card-hover transition-colors cursor-pointer group" @click="toggleAndTrack(t.id)">
              <span class="w-2 h-2 rounded-full shrink-0" :class="priorityDot[t.priority]"></span>
              <div class="flex-1 min-w-0">
                <span class="text-sm" :class="t.status==='done'?'text-text-muted line-through':'text-text-primary'">{{ t.title }}</span>
                <span v-if="t.goalId" class="ml-2 text-xs text-accent/60 truncate">{{ goalName(t.goalId) }}</span>
              </div>
              <span class="text-xs w-5 h-5 rounded border flex items-center justify-center group-hover:border-accent/50" :class="t.status==='done'?'bg-accent border-accent text-white':'border-border'"><span v-if="t.status==='done'">✓</span></span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-6 text-text-muted text-sm space-y-2">
            <span>今天还没有计划任务</span>
            <button class="text-xs text-accent hover:underline" @click="showCreate=true">+ 添加第一个任务</button>
          </div>
          <div v-if="todayTasks.length>0" class="mt-3 pt-3 border-t border-border">
            <button class="text-xs text-text-muted hover:text-amber-500 transition-colors" @click="deferUnfinished">📥 将未完成的标记为延期</button>
          </div>
        </div>

        <!-- 目标进度增强 -->
        <div class="bg-card border border-border rounded-xl p-5">
          <h3 class="text-sm font-semibold text-text-primary mb-4">🎯 当前目标</h3>
          <div class="space-y-4">
            <div v-for="g in goalStore.activeGoals.slice(0,3)" :key="g.id">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-base">{{ goalStore.goalIcon(g.category) }}</span>
                <span class="text-sm font-medium text-text-primary truncate flex-1">{{ g.title }}</span>
                <span class="text-xs shrink-0" :class="goalStore.daysLeft(g.deadline).urgent?'text-red-500 font-medium':'text-text-muted'">{{ goalStore.daysLeft(g.deadline).text }}</span>
              </div>
              <div class="h-1.5 bg-card-hover rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all duration-500" :style="{width:goalStore.goalProgress(g.id)+'%',backgroundColor:goalStore.progressColor(goalStore.goalProgress(g.id))}"></div>
              </div>
              <div class="flex items-center justify-between text-xs text-text-muted">
                <span>{{ goalStore.goalDoneCount(g.id) }}/{{ goalStore.goalTaskCount(g.id) }} 任务 · {{ goalStore.goalProgress(g.id) }}%</span>
                <span class="truncate ml-2">→ {{ goalStore.goalNextTask(g.id) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏 -->
      <div class="space-y-5">
        <!-- 今日习惯 -->
        <div class="bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-text-primary">🔥 今日习惯</h3>
            <span class="text-xs text-text-muted">{{ habitStore.doneCount }}/{{ habitStore.activeHabits.length }}</span>
          </div>
          <div class="space-y-2">
            <div v-for="h in habitStore.activeHabits" :key="h.id" class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-card-hover transition-colors cursor-pointer" @click="habitStore.toggle(h.id)">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ habitStore.habitCategoryMeta[h.category]?.icon || '✅' }}</span>
                <div>
                  <span class="text-sm" :class="habitStore.isDone(h)?'text-text-muted line-through':'text-text-primary'">{{ h.name }}</span>
                  <span class="text-xs text-text-muted ml-1">本周 {{ habitStore.weeklyCount(h.id) }}/{{ h.frequency==='weekly'?1:7 }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-amber-500 font-medium">{{ h.streak }}天</span>
                <span class="text-xs w-5 h-5 rounded border flex items-center justify-center" :class="habitStore.isDone(h)?'bg-accent border-accent text-white':'border-border'"><span v-if="habitStore.isDone(h)">✓</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 今日提醒 -->
        <div v-if="reminderStore.todayReminders.length > 0" class="bg-card border border-border rounded-xl p-5">
          <h3 class="text-sm font-semibold text-text-primary mb-3">🔔 今日提醒</h3>
          <div class="space-y-2">
            <div v-for="r in reminderStore.todayReminders" :key="r.id" class="flex items-center gap-2 text-xs text-text-secondary py-1">
              <span>{{ r.type==='task'?'✅':r.type==='goal'?'🎯':r.type==='habit'?'🔥':'📌' }}</span>
              <span class="flex-1">{{ r.message }}</span>
              <span class="text-text-muted">{{ r.time }}</span>
            </div>
          </div>
        </div>

        <!-- 今日总结 -->
        <div class="bg-card border border-border rounded-xl p-5">
          <h3 class="text-sm font-semibold text-text-primary mb-3">✏️ 今日总结</h3>
          <textarea
            :value="dailyStore.todayPlan.summary"
            @input="dailyStore.updateSummary(($event.target as HTMLTextAreaElement).value)"
            placeholder="今天完成了什么？有什么收获？..."
            class="w-full h-24 px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent resize-none placeholder-text-muted/50 transition-colors"
          ></textarea>
          <router-link to="/journal" class="block mt-2 text-xs text-accent hover:underline text-right">📖 记录完整日志 →</router-link>
        </div>
      </div>
    </div>

    <button class="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-12 h-12 rounded-full bg-accent text-white text-xl shadow-lg hover:bg-accent-hover hover:shadow-xl transition-all z-40 flex items-center justify-center" @click="showCreate=true" title="快速创建任务">+</button>
    <TaskModal :visible="showCreate" @close="showCreate=false" />

    <!-- 结束今天 Modal -->
    <Teleport to="body">
      <div v-if="showEndDay" class="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" @click.self="showEndDay=false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-white border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-sm font-semibold text-text-primary">🌙 结束今天</h2>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="showEndDay=false">✕</button>
          </div>
          <div class="p-5">
            <p class="text-xs text-text-muted mb-3">以下是今日总结草稿，保存后将自动延期未完成任务并记录到日志：</p>
            <pre class="w-full px-4 py-3 rounded-lg border border-border bg-gray-50 text-xs text-text-secondary whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">{{ endDayDraft }}</pre>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
            <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="showEndDay=false">取消</button>
            <router-link to="/journal" class="px-4 py-2 rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors" @click="saveEndDay()">保存并查看日志</router-link>
            <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="saveEndDay()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

