import type { PlanDraft, DraftDay, DraftBlock, DraftTask, ContentCategory } from '@/types/planDraft'
import { generateDraftId, computeDate } from '@/types/planDraft'

/**
 * AI 计划解析器 — 调用 OpenAI 兼容 API（支持豆包/DeepSeek/OpenAI）
 *
 * API 配置从 localStorage 读取（用户在设置页输入）：
 * - pw-ai-endpoint: API 地址（如 https://ark.cn-beijing.volces.com/api/v3）
 * - pw-ai-key: API key
 * - pw-ai-model: 模型名（如 doubao-pro-32k）
 */

interface AIConfig {
  endpoint: string
  apiKey: string
  model: string
}

export function getAIConfig(): AIConfig {
  return {
    endpoint: localStorage.getItem('pw-ai-endpoint') || 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: localStorage.getItem('pw-ai-key') || '',
    model: localStorage.getItem('pw-ai-model') || 'doubao-pro-32k',
  }
}

export function setAIConfig(config: Partial<AIConfig>) {
  if (config.endpoint) localStorage.setItem('pw-ai-endpoint', config.endpoint)
  if (config.apiKey) localStorage.setItem('pw-ai-key', config.apiKey)
  if (config.model) localStorage.setItem('pw-ai-model', config.model)
}

export function hasAIConfig(): boolean {
  return !!localStorage.getItem('pw-ai-key')
}

const SYSTEM_PROMPT = `你是一个专业的前端学习规划师。用户会给你一个学习目标，你必须生成一个完整的、有深度的、每天有具体可执行任务的学习计划。

⚠️ 绝对禁止生成空计划或喊口号式计划！每一天必须有 3-5 个具体任务。

输出格式（必须是合法 JSON）：
{
  "goalTitle": "目标名称",
  "goalDescription": "一句话描述最终达成什么",
  "totalDays": 14,
  "days": [
    {
      "day": 1,
      "title": "Day1：JavaScript 核心基础",
      "blocks": [
        {
          "category": "学习",
          "time": "上午",
          "tasks": [
            { "title": "复习 var/let/const 区别并手写代码验证", "priority": "high", "category": "task" },
            { "title": "画出事件循环流程图并写示例验证", "priority": "high", "category": "task" },
            { "title": "手写一个完整的防抖函数", "priority": "medium", "category": "task" }
          ]
        },
        {
          "category": "练习",
          "time": "下午",
          "tasks": [
            { "title": "在 LeetCode 做 3 道闭包相关题目", "priority": "medium", "category": "task" },
            { "title": "整理今天的学习笔记到博客", "priority": "low", "category": "task" }
          ]
        }
      ]
    }
  ]
}

硬性要求（不满足将被拒绝）：
1. totalDays 至少 3 天，面试准备类至少 7 天
2. 每一天的 blocks 里至少有 3 个 category: "task" 的任务
3. 任务必须是动词开头的具体动作：复习/手写/练习/阅读/完成/整理/画出/实现
4. 不允许出现空泛任务（如"学习JS"、"了解闭包"、"看看Vue"）
5. 每天的主题要有递进关系（基础→进阶→实战→复习）
6. 任务标题 10-20 字，要具体到知识点或操作

前端实习面试准备的参考大纲（根据用户需求调整）：
- Day1-3：JavaScript 核心（类型/作用域/闭包/原型链/异步/事件循环）
- Day4-5：CSS 布局与原理（Flex/Grid/BFC/居中/动画）
- Day6-7：框架原理（Vue 响应式/生命周期/组件通信/路由）
- Day8-9：浏览器与网络（HTTP/缓存/跨域/安全/渲染流程）
- Day10-11：工程化与性能（Webpack/Vite/Tree-shaking/性能优化）
- Day12-13：手写代码与算法（Promise/深拷贝/发布订阅/常见算法）
- Day14：模拟面试与复盘

不要输出 JSON 以外的任何内容。每个任务必须是真正可执行的动作，不是口号。`

/**
 * 调用 AI 解析文档内容为层级 PlanDraft
 */
export async function aiParseToPlanDraft(
  content: string,
  _sourceFile: string,
  planId: string,
): Promise<PlanDraft> {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error('未配置 AI API Key，请在设置页面填写')
  }

  // 60 秒超时（生成完整计划比解析更耗时）
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  let response: Response
  try {
    response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `请为以下需求制定一个完整的学习计划：\n\n${content.slice(0, 8000)}` },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    })
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('AI 规划超时（60秒），请检查网络或稍后重试')
    throw new Error(`网络请求失败：${e.message || '未知错误'}`)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API 错误 ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const aiContent = data.choices?.[0]?.message?.content || ''

  // 提取 JSON（AI 可能包在 ```json 中）
  const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 返回内容无法解析为 JSON')
  }

  const parsed = JSON.parse(jsonMatch[0])

  const today = new Date().toISOString().slice(0, 10)
  const totalDays = parsed.totalDays || 1

  // 构建 days 层级结构
  const days: DraftDay[] = (parsed.days || []).map((d: any) => {
    const dayNum = d.day || 1
    const date = computeDate(today, dayNum - 1)
    const blocks: DraftBlock[] = (d.blocks || []).map((b: any) => {
      const tasks: DraftTask[] = (b.tasks || []).map((t: any) => ({
        id: generateDraftId(),
        title: String(t.title || '').slice(0, 100),
        priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as 'high' | 'medium' | 'low',
        selected: true,
        category: (['task', 'note', 'review'].includes(t.category) ? t.category : 'task') as ContentCategory,
      }))
      return {
        id: generateDraftId('blk'),
        category: String(b.category || '学习'),
        time: b.time || undefined,
        tasks,
      }
    })
    return {
      id: generateDraftId('day'),
      day: dayNum,
      date,
      title: String(d.title || `Day${dayNum}`),
      blocks,
    }
  })

  // 如果 AI 没有返回 days 结构，但有 tasks，降级处理
  if (days.length === 0 && parsed.tasks) {
    return fallbackFromFlatTasks(parsed, today, planId, content)
  }

  // 质量校验：拒绝空壳计划
  const allTaskCount = days.reduce((sum, d) =>
    sum + d.blocks.reduce((s, b) => s + b.tasks.filter((t) => t.category === 'task').length, 0), 0)
  if (days.length < 2 || allTaskCount < 5) {
    throw new Error(`AI 生成的计划质量不足（${days.length} 天，${allTaskCount} 个任务）。请尝试更详细地描述你的需求，例如"我要准备前端实习面试，重点复习 JavaScript 和 Vue，2 周时间"`)
  }

  return {
    id: planId,
    source: 'text',
    goal: {
      title: parsed.goalTitle || '新计划',
      description: parsed.goalDescription || '',
    },
    days,
    startDate: today,
    totalDays,
    createdAt: new Date().toISOString(),
  }
}

/** 降级：AI 返回扁平 tasks 数组时，重组为 days 结构 */
function fallbackFromFlatTasks(parsed: any, today: string, planId: string, _content: string): PlanDraft {
  const tasksByDay: Record<number, DraftTask[]> = {}
  for (const t of parsed.tasks || []) {
    const day = t.day || 1
    if (!tasksByDay[day]) tasksByDay[day] = []
    tasksByDay[day].push({
      id: generateDraftId(),
      title: String(t.title || '').slice(0, 100),
      priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as 'high' | 'medium' | 'low',
      selected: true,
      category: 'task' as ContentCategory,
    })
  }

  const days: DraftDay[] = Object.keys(tasksByDay)
    .map(Number)
    .sort((a, b) => a - b)
    .map((dayNum) => ({
      id: generateDraftId('day'),
      day: dayNum,
      date: computeDate(today, dayNum - 1),
      title: `Day${dayNum}`,
      blocks: [{
        id: generateDraftId('blk'),
        category: '学习',
        tasks: tasksByDay[dayNum],
      }],
    }))

  const totalDays = days.length > 0 ? Math.max(...days.map((d) => d.day)) : 1

  return {
    id: planId,
    source: 'text',
    goal: {
      title: parsed.goalTitle || '新计划',
      description: parsed.goalDescription || '',
    },
    days,
    startDate: today,
    totalDays,
    createdAt: new Date().toISOString(),
  }
}
