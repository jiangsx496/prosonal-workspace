<script setup lang="ts">
import { ref } from 'vue'
import { getAIConfig, setAIConfig } from '@/services/ai'

const theme = ref('light')
const language = ref('zh-CN')

// ---- AI 配置 ----
const aiConfig = ref(getAIConfig())
const aiSaveMsg = ref('')

function saveAIConfig() {
  setAIConfig(aiConfig.value)
  aiSaveMsg.value = '已保存'
  setTimeout(() => { aiSaveMsg.value = '' }, 2000)
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

    <div class="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 class="text-sm font-semibold text-text-primary">关于</h3>
      <p class="text-xs text-text-muted leading-relaxed">
        Personal Workspace v0.1.0<br />
        一个简洁的个人工作台，帮助你管理任务、项目和笔记。
      </p>
    </div>
  </div>
</template>
