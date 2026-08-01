<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInboxStore } from '@/stores/inbox'
import { useTaskStore } from '@/stores/tasks'
import { useDailyStore } from '@/stores/daily'
import { usePlanDraftStore } from '@/stores/planDraft'
import { parsePlan } from '@/services/aiParser'
import { extractFile } from '@/services/importer'
import { hasAIConfig, aiParseToPlanDraft } from '@/services/ai'
import { flattenTasks } from '@/types/planDraft'

const inbox = useInboxStore()
const taskStore = useTaskStore()
const dailyStore = useDailyStore()
const draftStore = usePlanDraftStore()

const tab = ref<'pending' | 'processed'>('pending')

// ---- AI 智能规划 ----
const userInput = ref('')
const uploadedFilename = ref('')
const analyzing = ref(false)
const errorMsg = ref('')

const MAX_TASKS = 35
const allTasks = computed(() => draftStore.currentDraft ? flattenTasks(draftStore.currentDraft) : [])
const taskWarning = computed(() => {
  const total = allTasks.value.length
  if (total > MAX_TASKS) {
    return `任务数量较多（${total} 个），建议精简后再创建`
  }
  return null
})

async function startAIPlanning() {
  const input = userInput.value.trim() || uploadedFilename.value
  if (!input) return

  errorMsg.value = ''
  analyzing.value = true

  try {
    if (hasAIConfig() && userInput.value.trim()) {
      const aiDraft = await aiParseToPlanDraft(userInput.value, uploadedFilename.value || 'text', draftStore.generateId())
      draftStore.setDraft(aiDraft)
    } else {
      const draft = parsePlan(userInput.value || '', uploadedFilename.value ? 'file' : 'text', uploadedFilename.value)
      draftStore.setDraft(draft)
    }
  } catch (e: any) {
    errorMsg.value = e.message || '解析失败'
    // AI 失败时不显示 fallback draft（避免矛盾状态），只显示错误
  } finally {
    analyzing.value = false
  }
}

// ---- 已处理条目转为任务 ----
function convertToTask(content: string, itemId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const taskId = taskStore.generateId()
  taskStore.addTask({
    id: taskId,
    title: content.slice(0, 60),
    description: content,
    project: '',
    goalId: null,
    category: 'work',
    priority: 'medium',
    status: 'backlog',
    source: 'manual',
    dueDate: today,
    scheduledDate: today,
    deferCount: 0,
    estimatedMinutes: 30,
    createdAt: today,
  })
  dailyStore.addTaskToToday(taskId)
  inbox.removeItem(itemId)
}

// ---- 文件上传 ----
const fileInput = ref<HTMLInputElement | null>(null)

async function handleFile(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  analyzing.value = true
  errorMsg.value = ''

  for (const file of Array.from(files)) {
    const result = await extractFile(file)
    uploadedFilename.value = file.name

    if (result.content && !result.content.startsWith('data:')) {
      userInput.value = result.content
    } else if (result.warning) {
      errorMsg.value = result.warning
    }
  }
  analyzing.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function clearDraft() {
  draftStore.clearDraft()
  userInput.value = ''
  uploadedFilename.value = ''
  errorMsg.value = ''
}

</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0 max-w-2xl">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">收件箱</h1>
      <p class="text-xs text-text-muted mt-1">快速捕获想法和计划，稍后整理</p>
    </div>

    <!-- 统一入口：AI 智能规划 -->
    <div class="bg-gradient-to-br from-accent/5 to-blue-50/30 border border-accent/15 rounded-2xl p-6">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xl">🧠</span>
        <div>
          <p class="text-base font-semibold text-text-primary">AI 智能规划</p>
          <p class="text-xs text-text-muted">告诉我你的目标或需求，AI 帮你自动制定完整学习计划（目标 + 每日安排 + 具体任务）</p>
        </div>
      </div>

      <textarea
        v-model="userInput"
        rows="3"
        placeholder="输入你的目标或需求... 例如：&#10;• 我要准备前端实习面试，2周时间&#10;• 学习 Vue3，7天掌握核心用法&#10;• 准备字节跳动一面，重点复习JS和算法"
        class="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm outline-none focus:border-accent resize-none placeholder-text-muted/50 transition-colors"
      ></textarea>

      <div class="flex items-center gap-3 mt-3">
        <input ref="fileInput" type="file" multiple accept=".md,.txt,.docx,.pdf,.png,.jpg" class="hidden" @change="handleFile" />
        <button
          class="px-3 py-2 rounded-lg border-2 border-dashed border-border text-xs text-text-secondary hover:border-accent hover:text-accent transition-colors"
          @click="fileInput?.click()"
        >📎 上传文件</button>
        <span v-if="uploadedFilename" class="text-xs text-text-muted truncate">{{ uploadedFilename }}</span>
        <div class="flex-1"></div>
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="!userInput.trim() || analyzing"
          @click="startAIPlanning"
        >{{ analyzing ? '⏳ AI 分析中，请稍候...' : '开始 AI 整理' }}</button>
      </div>
      <p v-if="errorMsg" class="text-xs text-amber-600 mt-2">{{ errorMsg }}</p>
    </div>

    <!-- PlanDraft 层级预览 -->
    <div v-if="draftStore.currentDraft" class="bg-card border border-border rounded-2xl p-5 space-y-4">
      <!-- 目标 -->
      <div class="flex items-center gap-2 pb-3 border-b border-border">
        <span class="text-lg">🎯</span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-text-primary">{{ draftStore.currentDraft.goal.title }}</p>
          <p class="text-xs text-text-muted">{{ draftStore.currentDraft.goal.description }}</p>
        </div>
      </div>

      <!-- 任务数量警告 -->
      <div v-if="taskWarning" class="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
        ⚠ {{ taskWarning }}
      </div>

      <!-- 按天分组展示 -->
      <div class="space-y-3">
        <div
          v-for="day in draftStore.currentDraft.days"
          :key="day.id"
          class="border border-border rounded-xl overflow-hidden"
        >
          <!-- Day 头部 -->
          <div class="flex items-center gap-2 px-3 py-2 bg-gray-50">
            <span class="text-xs font-bold text-accent">📅 Day{{ day.day }}</span>
            <span class="text-xs text-text-muted">{{ day.date }}</span>
            <span class="text-xs text-text-secondary ml-1">{{ day.title.replace(/^Day\d+[：:]?\s*/, '') }}</span>
            <span class="text-xs text-text-muted ml-auto">
              {{ day.blocks.reduce((sum, b) => sum + b.tasks.length, 0) }} 个任务
            </span>
          </div>

          <!-- 时间块 -->
          <div
            v-for="block in day.blocks"
            :key="block.id"
            class="px-3 py-2 border-t border-border/50"
          >
            <div class="flex items-center gap-2 mb-1">
              <span v-if="block.time" class="text-xs font-mono text-text-muted">{{ block.time }}</span>
              <span class="text-xs text-text-secondary">{{ block.category }}</span>
            </div>
            <!-- 任务列表 -->
            <div
              v-for="task in block.tasks"
              :key="task.id"
              class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group"
            >
              <input
                type="checkbox"
                v-model="task.selected"
                class="rounded shrink-0"
                :disabled="task.category !== 'task'"
              />
              <input
                v-model="task.title"
                class="flex-1 bg-transparent text-sm text-text-primary outline-none border-b border-transparent focus:border-accent transition-colors"
              />
              <span v-if="task.category !== 'task'" class="text-xs text-text-muted italic">{{ task.category === 'note' ? '说明' : '复盘' }}</span>
              <select
                v-model="task.priority"
                class="text-xs px-1 py-0.5 rounded border border-border bg-white text-text-secondary outline-none"
              >
                <option value="high">🔴</option>
                <option value="medium">🟡</option>
                <option value="low">⚪</option>
              </select>
              <button
                class="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-red-500 transition-colors text-xs opacity-0 group-hover:opacity-100"
                @click="draftStore.removeTask(task.id)"
              >✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作 -->
      <div class="flex gap-2 pt-3 border-t border-border">
        <button
          class="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          :disabled="allTasks.filter(t => t.selected && t.category === 'task').length === 0"
          @click="draftStore.confirmCreate()"
        >✓ 确认创建计划</button>
        <button
          class="px-4 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-gray-100 transition-colors"
          @click="clearDraft"
        >取消</button>
      </div>
    </div>

    <!-- 历史收件项 -->
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
          <button v-if="!item.processed" class="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-green-500 transition-colors" @click="inbox.markProcessed(item.id)" title="标记已处理">✓</button>
          <button v-if="item.processed" class="px-2 py-1 rounded text-xs text-accent hover:bg-accent/10 transition-colors" @click="convertToTask(item.content, item.id)" title="转为今日任务">→ 任务</button>
          <button class="w-6 h-6 rounded flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" @click="inbox.removeItem(item.id)" title="删除">✕</button>
        </div>
      </div>
    </div>
    <div v-else-if="!draftStore.currentDraft" class="flex flex-col items-center justify-center py-12 text-text-muted">
      <span class="text-4xl mb-4">📥</span>
      <p class="text-sm">{{ tab==='pending'?'输入计划开始 AI 整理':'没有已处理的条目' }}</p>
    </div>
  </div>
</template>
