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

const SYSTEM_PROMPT = `你是一个专业的学习规划师。用户会给你一个学习目标或需求（可能是一句话，也可能是一段文档），你需要为其制定一个完整的、可执行的学习计划。

你的职责是「规划」而非「解析」——即使输入只有一句话（如"我要准备前端实习面试"），你也要基于专业知识自动生成完整的每日学习计划。

输出格式必须是合法 JSON，结构如下：
{
  "goalTitle": "目标名称（简洁有力）",
  "goalDescription": "目标描述（一句话说明最终要达成什么）",
  "totalDays": 7,
  "days": [
    {
      "day": 1,
      "title": "Day1：主题（如 Day1：JavaScript 基础）",
      "blocks": [
        {
          "category": "学习",
          "time": "09:00",
          "tasks": [
            { "title": "具体可执行的任务", "priority": "medium", "category": "task" }
          ]
        }
      ]
    }
  ]
}

规划原则：
1. 根据目标自动判断合理的天数（面试准备 7-14 天，技能学习 3-7 天，项目开发 5-10 天）
2. 每天围绕一个主题，主题之间有递进关系（从基础到进阶）
3. 每天的任务要具体可执行（如"手写一个防抖函数"而非"学习防抖"）
4. 每天安排 3-5 个核心任务，不要过多
5. 合理安排难度：前几天打基础，后几天做项目和复习
6. 如果用户给了时间范围或天数限制，严格按此安排
7. 如果用户给的是已有文档/文件内容，提取并整理为结构化计划

任务分类规则：
- category: "task" = 可执行的具体动作（如"复习闭包概念并手写示例"）
- category: "note" = 背景说明（不作为任务）
- category: "review" = 复盘/总结模板（不作为任务）
只有 category: "task" 的内容才作为任务。

任务标题要求：
- 动词开头（学习/复习/手写/阅读/练习/完成/整理）
- 15 字以内
- 具体明确，不含模糊词（如"了解一下""看看"）

不要输出 JSON 以外的任何内容。`

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

  // 30 秒超时，避免用户长时间无响应等待
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

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
          { role: 'user', content: `请解析以下文档内容为结构化计划：\n\n${content.slice(0, 8000)}` },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('AI 请求超时（30秒），请检查网络或稍后重试')
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
