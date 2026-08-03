<script setup lang="ts">
import { ref, watch } from 'vue'
import { todayLocal } from '@/utils/date'
import { useAppStore, type Theme } from '@/stores/app'
import { getAIConfig, setAIConfig } from '@/services/ai'
import { cleanupOrphanData } from '@/services/dataCleanup'
import { exportAllData, importAllData, downloadJson } from '@/services/dataExport'

const appStore = useAppStore()
const theme = ref<Theme>(appStore.theme)
watch(theme, (val) => { appStore.theme = val })
const language = ref('zh-CN')

// ---- AI 配置 ----
const aiConfig = ref(getAIConfig())
const aiSaveMsg = ref('')

function saveAIConfig() {
  setAIConfig(aiConfig.value)
  aiSaveMsg.value = '已保存'
  setTimeout(() => { aiSaveMsg.value = '' }, 2000)
}

// ---- 数据清理 ----
const cleanupMsg = ref('')
const cleanupRunning = ref(false)

function runCleanup() {
  cleanupRunning.value = true
  try {
    const result = cleanupOrphanData()
    const parts: string[] = []
    if (result.orphanTasksDetached > 0) parts.push(`解除 ${result.orphanTasksDetached} 个孤儿任务关联`)
    if (result.orphanDailyRefsRemoved > 0) parts.push(`清理 ${result.orphanDailyRefsRemoved} 个无效日历引用`)
    cleanupMsg.value = parts.length > 0 ? `✓ ${parts.join('，')}` : '✓ 数据完好，无需清理'
  } catch {
    cleanupMsg.value = '清理失败，请重试'
  } finally {
    cleanupRunning.value = false
    setTimeout(() => { cleanupMsg.value = '' }, 3000)
  }
}

// ---- 数据导出/导入 ----
const exportMsg = ref('')
const importMsg = ref('')

function handleExport() {
  try {
    const result = exportAllData()
    if (result.keyCount === 0) {
      exportMsg.value = '暂无数据可导出'
      setTimeout(() => { exportMsg.value = '' }, 2000)
      return
    }
    downloadJson(`personal-workspace-backup-${todayLocal()}.json`, result.json)
    exportMsg.value = `✓ 已导出 ${result.keyCount} 项数据`
  } catch {
    exportMsg.value = '导出失败'
  }
  setTimeout(() => { exportMsg.value = '' }, 2000)
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const { success, errors } = importAllData(text)
      if (errors.length > 0) {
        importMsg.value = `⚠ 导入完成：${success} 项成功，${errors.length} 项失败（${errors[0]}）`
      } else {
        importMsg.value = `✓ 已导入 ${success} 项数据，刷新页面生效`
      }
    } catch {
      importMsg.value = '导入失败，请检查文件格式'
    }
    setTimeout(() => { importMsg.value = '' }, 4000)
  }
  input.click()
}

const presetEndpoints = [
  { label: '豆包（火山引擎）', endpoint: 'https://ark.cn-beijing.volces.com/api/v3' },
  { label: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1' },
  { label: 'OpenAI', endpoint: 'https://api.openai.com/v1' },
]

function applyPreset(endpoint: string) {
  aiConfig.value.endpoint = endpoint
}
</script>

<template>
  <div class="space-y-6 pb-20 md:pb-0 max-w-lg">
    <h1 class="text-2xl font-bold text-text-primary">设置</h1>

    <div class="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 class="text-sm font-semibold text-text-primary">外观</h3>

      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary">主题</span>
        <select
          v-model="theme"
          class="bg-card-hover text-text-primary text-sm px-3 py-1.5 rounded-lg border border-border outline-none focus:border-accent"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm text-text-secondary">语言</span>
        <select
          v-model="language"
          class="bg-card-hover text-text-primary text-sm px-3 py-1.5 rounded-lg border border-border outline-none focus:border-accent"
        >
          <option value="zh-CN">简体中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <!-- AI 配置 -->
    <div class="bg-card border border-border rounded-xl p-5 space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-base">🤖</span>
        <h3 class="text-sm font-semibold text-text-primary">AI 计划解析</h3>
      </div>
      <p class="text-xs text-text-muted">配置 AI API 用于智能解析导入的计划文档。Key 存在浏览器本地，不会上传。</p>

      <!-- 快速预设 -->
      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1.5">快速选择平台</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="p in presetEndpoints" :key="p.endpoint"
            class="px-2.5 py-1 rounded-lg text-xs border transition-colors"
            :class="aiConfig.endpoint === p.endpoint ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted hover:bg-card-hover'"
            @click="applyPreset(p.endpoint)"
          >{{ p.label }}</button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1.5">API 地址</label>
        <input
          v-model="aiConfig.endpoint"
          type="text"
          class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1.5">API Key</label>
        <input
          v-model="aiConfig.apiKey"
          type="password"
          placeholder="输入你的 API Key..."
          class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1.5">模型名称</label>
        <input
          v-model="aiConfig.model"
          type="text"
          placeholder="如 doubao-pro-32k"
          class="w-full px-3 py-2 rounded-lg border border-border bg-gray-50 text-text-primary text-sm outline-none focus:border-accent"
        />
      </div>

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          @click="saveAIConfig"
        >保存</button>
        <span v-if="aiSaveMsg" class="text-xs text-green-600">{{ aiSaveMsg }}</span>
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="bg-card border border-border rounded-xl p-5 space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-base">🧹</span>
        <h3 class="text-sm font-semibold text-text-primary">数据管理</h3>
      </div>
      <p class="text-xs text-text-muted">导出备份到本地文件，或从备份恢复数据。清理功能用于修复数据不一致。</p>

      <!-- 导出/导入 -->
      <div class="flex items-center gap-3 flex-wrap">
        <button
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
          @click="handleExport"
        >📥 导出数据</button>
        <button
          class="px-4 py-2 rounded-lg border border-accent text-accent text-sm font-medium hover:bg-accent/5 transition-colors"
          @click="handleImport"
        >📤 导入数据</button>
        <span v-if="exportMsg" class="text-xs text-green-600">{{ exportMsg }}</span>
        <span v-if="importMsg" class="text-xs text-amber-600">{{ importMsg }}</span>
      </div>

      <!-- 清理 -->
      <div class="pt-3 border-t border-border">
        <p class="text-xs text-text-muted mb-3">清理孤儿任务关联和无效日历引用，保持数据一致性。</p>
        <div class="flex items-center gap-3">
          <button
            class="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            :disabled="cleanupRunning"
            @click="runCleanup"
          >{{ cleanupRunning ? '清理中...' : '清理无效数据' }}</button>
          <span v-if="cleanupMsg" class="text-xs text-text-secondary">{{ cleanupMsg }}</span>
        </div>
      </div>
    </div>

    <div class="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 class="text-sm font-semibold text-text-primary">关于</h3>
      <p class="text-xs text-text-muted leading-relaxed">
        Personal Workspace v0.1.0<br />
        一个简洁的个人工作台，帮助你管理任务、项目和笔记。
      </p>
    </div>
  </div>
</template>
