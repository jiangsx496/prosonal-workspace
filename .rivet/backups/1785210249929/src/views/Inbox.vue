<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInboxStore } from '@/stores/inbox'
import { useTaskStore } from '@/stores/tasks'
import { useGoalStore } from '@/stores/goals'
import { useHabitStore } from '@/stores/habits'
import { useImportStore } from '@/stores/imports'
import { useDailyStore } from '@/stores/daily'
import { usePlanStore } from '@/stores/plans'
import { parsePlan } from '@/services/parser'
import { extractFile } from '@/services/importer'
import { parseToPlanDraft, summarizeDraft, checkDraftQuality } from '@/services/planParser'
import { aiParseToPlanDraft, hasAIConfig } from '@/services/ai'
import type { PlanDraft } from '@/stores/plans'
import type { Task } from '@/mock/tasks'
import type { Goal } from '@/mock/goals'
import type { Habit } from '@/mock/habits'

const inbox = useInboxStore()
const taskStore = useTaskStore()
const goalStore = useGoalStore()
const habitStore = useHabitStore()
const importStore = useImportStore()
const dailyStore = useDailyStore()
const planStore = usePlanStore()

const input = ref('')
const tab = ref<'pending'|'processed'>('pending')

// ---- 智能输入 ----
const smartInput = ref('')
const showPreview = ref(false)
const parsedPlan = computed(() => parsePlan(smartInput.value))

function generatePreview() {
  if (!smartInput.value.trim()) return
  showPreview.value = true
}

function confirmSmartPlan() {
  const plan = parsedPlan.value
  if (plan.tasks.length === 0) return

  let goalId: string | null = null

  // 创建目标
  if (plan.goalTitle) {
    const existingGoal = goalStore.goals.find((g) => g.title === plan.goalTitle && g.status === 'active')
    if (existingGoal) {
      goalId = existingGoal.id
    } else {
      goalId = goalStore.generateId()
      const today = new Date().toISOString().slice(0, 10)
      goalStore.addGoal({
        id: goalId, title: plan.goalTitle, description: '',
        category: '开发', startDate: today,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        progress: 0, priority: 'medium', status: 'active',
      } as Goal)
    }
  }

  // 创建任务
  const today = new Date().toISOString().slice(0, 10)
  const createdTaskIds: string[] = []
  plan.tasks.forEach((t) => {
    const id = taskStore.generateId()
    taskStore.addTask({
      id, title: t.title, description: '',
      project: '', goalId, category: 'work', priority: t.priority,
      status: 'backlog', source: 'import', dueDate: t.scheduledDate,
      scheduledDate: t.scheduledDate, deferCount: 0, createdAt: today,
    } as Task)
    createdTaskIds.push(id)

    // 今天日期的任务自动加入 DailyPlan
    if (t.scheduledDate === today) {
      dailyStore.addTaskToToday(id)
    }
  })

  smartInput.value = ''
  showPreview.value = false
}

const convertModal = ref(false)
const convertingItem = ref<string | null>(null)
const convertType = ref<'task'|'goal'|'habit'>('task')
const convertForm = ref({ title:'', category:'学习' as any, priority:'medium' as const })

function submitInput() { if (input.value.trim()) { inbox.addItem(input.value); input.value='' } }
function openConvert(id: string) { convertingItem.value=id; convertType.value='task'; convertForm.value={title:inbox.items.find(i=>i.id===id)?.content||'',category:'学习',priority:'medium'}; convertModal.value=true }

function doConvert() {
  if (!convertingItem.value || !convertForm.value.title.trim()) return
  const content = convertForm.value.title.trim()
  if (convertType.value === 'task') {
    taskStore.addTask({id:taskStore.generateId(),title:content,description:'',project:taskStore.projects[0],goalId:null,category:'work',priority:convertForm.value.priority,status:'backlog',source:'import',dueDate:new Date().toISOString().slice(0,10),scheduledDate:new Date().toISOString().slice(0,10),deferCount:0,createdAt:new Date().toISOString().slice(0,10)} as Task)
  } else if (convertType.value === 'goal') {
    goalStore.addGoal({id:goalStore.generateId(),title:content,description:'',category:convertForm.value.category,startDate:new Date().toISOString().slice(0,10),deadline:new Date(Date.now()+30*86400000).toISOString().slice(0,10),progress:0,priority:'medium',status:'active'} as Goal)
  } else {
    habitStore.addHabit({id:habitStore.generateId(),name:content,category:convertForm.value.category,frequency:'daily',target:'',completedDates:[],streak:0,active:true,createdAt:new Date().toISOString().slice(0,10)} as Habit)
  }
  inbox.markProcessed(convertingItem.value)
  convertModal.value = false
}

// ---- 文件导入 ----
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadMsg = ref('')

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  uploading.value = true
  uploadMsg.value = ''

  for (const file of Array.from(files)) {
    const result = await extractFile(file)
    const fileHash = await hashFile(file)

    if (importStore.isDuplicate(fileHash)) {
      uploadMsg.value = `${file.name} 已导入过，跳过`
      setTimeout(() => { uploadMsg.value = '' }, 4000)
      continue
    }

    importStore.addRecord({
      id: importStore.generateId(),
      filename: file.name,
      fileType: result.fileType,
      mimeType: file.type,
      size: file.size,
      content: result.content,
      fileHash,
      source: file.name,
      createdTaskIds: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    if (result.content && !result.content.startsWith('data:')) {
      generatePlanPreview(result.content, file.name)
    }
    if (result.warning) {
      uploadMsg.value = result.warning
      setTimeout(() => { uploadMsg.value = '' }, 4000)
    }
  }

  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function useImportContent(id: string) {
  const content = importStore.getContent(id)
  if (content && !content.startsWith('data:')) {
    smartInput.value = content
    showPreview.value = false
    importStore.updateStatus(id, 'parsed')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const priorityBadge: Record<string,string> = { high:'bg-red-50 text-red-700', medium:'bg-amber-50 text-amber-700', low:'bg-slate-100 text-slate-600' }
const priorityLabel: Record<string,string> = { high: '🔴 高', medium: '🟡 中', low: '⚪ 低' }
const fileTypeIcon: Record<string, string> = { text: '📄', markdown: '📝', docx: '📃', pdf: '📕', image: '🖼️', unknown: '📎' }

// ---- PlanDraft 预览 ----
const planDraft = ref<PlanDraft | null>(null)
const draftSummary = computed(() => planDraft.value ? summarizeDraft(planDraft.value) : null)
const draftWarning = computed(() => planDraft.value ? checkDraftQuality(planDraft.value) : null)

// ---- 预览编辑：勾选/删除/修改 ----
const selectedDraftTasks = ref<Set<number>>(new Set())  // 用 tasks 数组 index

function toggleDraftTask(idx: number) {
  if (selectedDraftTasks.value.has(idx)) selectedDraftTasks.value.delete(idx)
  else selectedDraftTasks.value.add(idx)
}

function removeDraftTask(idx: number) {
  if (!planDraft.value) return
  planDraft.value.tasks.splice(idx, 1)
  // 重建选中集合
  const newSet = new Set<number>()
  selectedDraftTasks.value.forEach((i) => { if (i < idx) newSet.add(i); else if (i > idx) newSet.add(i - 1) })
  selectedDraftTasks.value = newSet
}

function removeSelectedDraftTasks() {
  if (!planDraft.value || selectedDraftTasks.value.size === 0) return
  const indices = Array.from(selectedDraftTasks.value).sort((a, b) => b - a)
  indices.forEach((idx) => planDraft.value!.tasks.splice(idx, 1))
  selectedDraftTasks.value.clear()
}

async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function generatePlanPreview(content: string, sourceFile: string) {
  const planId = planStore.generateId()
  const draft = parseToPlanDraft(content, sourceFile, planId)
  if (draft.tasks.length === 0) {
    // 无法解析结构，回退到智能输入
    smartInput.value = content
    return
  }
  planStore.createPlan({ id: planId, title: draft.goalTitle || sourceFile, sourceFile, startDate: draft.startDate, endDate: draft.endDate })
  planDraft.value = draft
}

function confirmPlanDraft() {
  if (!planDraft.value) return
  const draft = planDraft.value
  const today = new Date().toISOString().slice(0, 10)

  // 创建目标
  let goalId: string | null = null
  if (draft.goalTitle) {
    const existing = goalStore.goals.find((g) => g.title === draft.goalTitle && g.status === 'active')
    if (existing) {
      goalId = existing.id
    } else {
      goalId = goalStore.generateId()
      goalStore.addGoal({
        id: goalId, title: draft.goalTitle, description: draft.goalDescription,
        category: '开发', startDate: draft.startDate, deadline: draft.endDate,
        progress: 0, priority: 'medium', status: 'active',
      } as any)
    }
  }

  // 创建任务 + DailyPlan（planDraft.tasks 已经是用户编辑/删减后的结果）
  draft.tasks.forEach((t) => {
    const id = taskStore.generateId()
    taskStore.addTask({
      id, title: t.title, description: '',
      project: '', goalId, category: 'work', priority: t.priority,
      status: 'backlog', source: 'import', dueDate: t.date,
      scheduledDate: t.date, deferCount: 0, createdAt: today,
    } as Task)
    // 今天的任务自动加入 DailyPlan
    if (t.date === today) {
      dailyStore.addTaskToToday(id)
    }
  })

  // 更新 Plan 状态
  planStore.confirmPlan(draft.planId, goalId || '')
  planDraft.value = null
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0 max-w-2xl">
    <div><h1 class="text-2xl font-bold text-text-primary">收件箱</h1><p class="text-xs text-text-muted mt-1">快速捕获想法和计划，稍后整理</p></div>

    <div class="flex gap-2">
      <input v-model="input" type="text" placeholder="输入任何想法、计划、待办..." class="flex-1 px-4 py-2.5 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent transition-colors" @keyup.enter="submitInput" />
      <button class="px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors shrink-0" @click="submitInput">收集</button>
    </div>

    <!-- 文件导入区 -->
    <div class="bg-card border border-border rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">📎</span>
        <div>
          <p class="text-sm font-semibold text-text-primary">文件导入</p>
          <p class="text-xs text-text-muted">上传文件提取文本，自动进入解析预览</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <input ref="fileInput" type="file" multiple accept=".md,.txt,.docx,.pdf,.png,.jpg,.jpeg" class="hidden" @change="handleFileUpload" />
        <button
          class="px-4 py-2 rounded-lg border-2 border-dashed border-border text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors"
          :disabled="uploading"
          @click="fileInput?.click()"
        >{{ uploading ? '读取中...' : '📁 选择文件' }}</button>
        <span class="text-xs text-text-muted">支持 .md .txt .docx .pdf .png .jpg</span>
      </div>
      <p v-if="uploadMsg" class="text-xs text-amber-600 mt-2">{{ uploadMsg }}</p>
      <div v-if="importStore.records.length > 0" class="mt-4 space-y-1.5">
        <div v-for="rec in importStore.records.slice(0, 5)" :key="rec.id" class="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
          <span class="text-base shrink-0">{{ fileTypeIcon[rec.fileType] }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-text-primary truncate">{{ rec.filename }}</p>
            <p class="text-xs text-text-muted">{{ (rec.size / 1024).toFixed(1) }}KB · {{ rec.status }}</p>
          </div>
          <button
            v-if="rec.content && !rec.content.startsWith('data:') && rec.status === 'pending'"
            class="text-xs text-accent hover:underline shrink-0"
            @click="useImportContent(rec.id)"
          >解析 →</button>
          <button
            class="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-red-500 transition-colors text-xs shrink-0"
            @click="importStore.removeRecord(rec.id)"
          >✕</button>
        </div>
      </div>
    </div>

    <!-- PlanDraft 预览（导入后结构化计划） -->
    <div v-if="planDraft && draftSummary" class="bg-gradient-to-r from-accent/5 to-blue-50/30 border border-accent/15 rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-lg">📋</span>
        <div>
          <p class="text-sm font-semibold text-text-primary">计划预览</p>
          <p class="text-xs text-text-muted">{{ planDraft.goalTitle || '未识别目标' }} · {{ draftSummary.taskCount }} 个任务 · {{ draftSummary.daysWithTasks }} 天</p>
        </div>
      </div>
      <!-- 异常提示 -->
      <div v-if="draftWarning" class="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
        ⚠ {{ draftWarning }}
      </div>
      <!-- 统计 -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="text-center bg-white rounded-lg py-2">
          <p class="text-xl font-bold text-text-primary">{{ draftSummary.goals }}</p>
          <p class="text-xs text-text-muted">🎯 目标</p>
        </div>
        <div class="text-center bg-white rounded-lg py-2">
          <p class="text-xl font-bold text-text-primary">{{ draftSummary.taskCount }}</p>
          <p class="text-xs text-text-muted">📋 任务</p>
        </div>
        <div class="text-center bg-white rounded-lg py-2">
          <p class="text-xl font-bold text-text-primary">{{ draftSummary.daysWithTasks }}</p>
          <p class="text-xs text-text-muted">📅 天数</p>
        </div>
      </div>
      <!-- 批量操作 -->
      <div v-if="selectedDraftTasks.size > 0" class="flex items-center gap-2 mb-3">
        <span class="text-xs text-text-muted">已选 {{ selectedDraftTasks.size }} 项</span>
        <button class="px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors" @click="removeSelectedDraftTasks">🗑 删除选中</button>
        <button class="px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary" @click="selectedDraftTasks.clear()">取消选择</button>
      </div>
      <!-- 按天分组的任务 -->
      <div class="space-y-3 max-h-60 overflow-y-auto">
        <div v-for="([day, count]) in Object.entries(draftSummary.byDay).sort((a,b) => +a[0] - +b[0])" :key="day">
          <p class="text-xs text-text-muted mb-1">第 {{ day }} 天 · {{ planDraft.tasks.find(t => t.day === +day)?.date || '' }}</p>
          <template v-for="(t, idx) in planDraft.tasks" :key="idx">
            <div v-if="t.day === +day" class="flex items-center gap-2 text-xs py-1 px-2 bg-white rounded">
              <input type="checkbox" :checked="selectedDraftTasks.has(idx)" @change="toggleDraftTask(idx)" class="rounded shrink-0" />
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="t.priority==='high'?'bg-red-400':t.priority==='medium'?'bg-amber-400':'bg-slate-300'"></span>
              <input v-model="t.title" class="flex-1 bg-transparent text-text-primary text-xs outline-none border-b border-transparent focus:border-accent transition-colors" />
              <span v-if="t.time" class="text-text-muted">{{ t.time }}</span>
              <button class="w-4 h-4 rounded flex items-center justify-center text-text-muted hover:text-red-500 transition-colors text-xs shrink-0" @click="removeDraftTask(idx)" title="删除">✕</button>
            </div>
          </template>
        </div>
      </div>
      <!-- 操作按钮 -->
      <div class="flex gap-2 mt-4">
        <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" @click="confirmPlanDraft">✓ 确认创建</button>
        <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="planDraft = null">取消</button>
      </div>
    </div>

    <!-- 智能计划输入 -->
    <div class="bg-gradient-to-r from-accent/5 to-blue-50/30 border border-accent/15 rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-lg">🧠</span>
        <div>
          <p class="text-sm font-semibold text-text-primary">智能计划输入</p>
          <p class="text-xs text-text-muted">用自然语言一次性生成目标+任务+日期安排</p>
        </div>
      </div>
      <textarea
        v-model="smartInput"
        rows="4"
        placeholder="示例：
#准备实习 @明天 !high
完善简历
整理项目介绍 @后天
刷算法 !high"
        class="w-full px-3 py-2 rounded-lg border border-border bg-white text-text-primary text-sm outline-none focus:border-accent resize-none placeholder-text-muted/50 transition-colors font-mono"
      ></textarea>
      <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
        <span>语法：</span>
        <code class="px-1.5 py-0.5 rounded bg-gray-100">#目标</code>
        <code class="px-1.5 py-0.5 rounded bg-gray-100">@日期</code>
        <code class="px-1.5 py-0.5 rounded bg-gray-100">!high</code>
      </div>
      <div class="flex gap-2 mt-3">
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="!smartInput.trim()"
          @click="generatePreview"
        >解析预览</button>
        <button
          v-if="showPreview"
          class="px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors"
          @click="confirmSmartPlan"
        >✓ 确认创建（{{ parsedPlan.tasks.length }} 个任务）</button>
      </div>

      <!-- 预览 -->
      <div v-if="showPreview && parsedPlan.tasks.length > 0" class="mt-4 bg-white rounded-xl border border-border p-4 space-y-3">
        <div v-if="parsedPlan.goalTitle" class="flex items-center gap-2">
          <span class="text-base">🎯</span>
          <span class="text-sm font-semibold text-text-primary">{{ parsedPlan.goalTitle }}</span>
          <span class="text-xs text-text-muted">→ 新建目标</span>
        </div>
        <div class="space-y-1.5">
          <div v-for="(t, idx) in parsedPlan.tasks" :key="idx" class="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-lg">
            <span class="text-xs text-text-muted w-4">{{ idx + 1 }}</span>
            <span class="flex-1 text-sm text-text-primary">{{ t.title }}</span>
            <span class="text-xs px-1.5 py-0.5 rounded" :class="priorityBadge[t.priority]">{{ priorityLabel[t.priority] }}</span>
            <span class="text-xs text-text-muted">{{ t.scheduledDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <button class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="tab==='pending'?'bg-accent/10 text-accent':'text-text-muted hover:text-text-secondary'" @click="tab='pending'">待处理 ({{ inbox.pending.length }})</button>
      <button class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" :class="tab==='processed'?'bg-accent/10 text-accent':'text-text-muted hover:text-text-secondary'" @click="tab='processed'">已处理 ({{ inbox.processed.length }})</button>
    </div>

    <div v-if="(tab==='pending'?inbox.pending:inbox.processed).length>0" class="space-y-2">
      <div v-for="item in tab==='pending'?inbox.pending:inbox.processed" :key="item.id" class="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4 group">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-text-primary" :class="item.processed?'line-through text-text-muted':''">{{ item.content }}</p>
          <p class="text-xs text-text-muted mt-1">{{ item.source }} · {{ item.createdAt }}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button v-if="!item.processed" class="px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors" @click="openConvert(item.id)">转换</button>
          <button v-if="!item.processed" class="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-green-500 transition-colors" @click="inbox.markProcessed(item.id)" title="标记已处理">✓</button>
          <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" @click="inbox.removeItem(item.id)" title="删除">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="flex flex-col items-center justify-center py-20 text-text-muted">
      <span class="text-4xl mb-4">📥</span><p class="text-sm">{{ tab==='pending'?'收件箱为空':'没有已处理的条目' }}</p>
    </div>

    <Teleport to="body">
      <div v-if="convertModal" class="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" @click.self="convertModal=false">
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="relative bg-white border border-border rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 class="text-sm font-semibold text-text-primary">转换收件项</h2>
            <button class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-gray-100 transition-colors" @click="convertModal=false">✕</button>
          </div>
          <div class="p-5 space-y-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1.5">转换为</label>
              <div class="flex gap-2">
                <button v-for="t in (['task','goal','habit'] as const)" :key="t" class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors" :class="convertType===t?'bg-accent/10 text-accent border border-accent/30':'border border-border text-text-muted hover:bg-gray-50'" @click="convertType=t">{{ t==='task'?'✅ 任务':t==='goal'?'🎯 目标':'🔥 习惯' }}</button>
              </div>
            </div>
            <div><label class="block text-xs font-medium text-text-secondary mb-1.5">名称</label><input v-model="convertForm.title" type="text" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-sm outline-none focus:border-accent" @keyup.enter="doConvert" /></div>
            <div v-if="convertType==='task'" class="grid grid-cols-2 gap-4">
              <div><label class="block text-xs font-medium text-text-secondary mb-1.5">优先级</label><select v-model="convertForm.priority" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-sm outline-none focus:border-accent"><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">⚪ 低</option></select></div>
            </div>
            <div v-if="convertType!=='task'">
              <label class="block text-xs font-medium text-text-secondary mb-1.5">分类</label>
              <select v-model="convertForm.category" class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-sm outline-none focus:border-accent">
                <option v-if="convertType==='goal'" v-for="c in goalStore.goalCategories" :key="c" :value="c">{{ c }}</option>
                <option v-else v-for="(v,k) in habitStore.habitCategoryMeta" :key="k" :value="k">{{ v.icon }} {{ v.label }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-2 px-5 py-4 border-t border-border bg-gray-50/50">
            <button class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors" @click="convertModal=false">取消</button>
            <button class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50" :disabled="!convertForm.title.trim()" @click="doConvert">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
