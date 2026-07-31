import type { PlanDraft, PlanDraftTask } from '@/stores/plans'

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

const SYSTEM_PROMPT = `你是一个学习计划解析助手。用户会给你一段文档内容，你需要将其解析为结构化的 JSON 计划。

输出格式必须是合法 JSON，结构如下：
{
  "goalTitle": "目标名称",
  "goalDescription": "目标描述（一句话）",
  "totalDays": 数字,
  "tasks": [
    {
      "title": "任务标题（简洁明确）",
      "day": 第几天（数字，从1开始）,
      "time": "HH:MM（可选，没有则省略）",
      "priority": "high" | "medium" | "low"
    }
  ]
}

重要规则：
1. 只提取真正的「可执行任务」，不要把标题、描述、说明、模板、分隔线当任务
2. 如果文档没有明确的日期/天数，默认所有任务 day=1
3. 任务标题要简洁（15字以内），去掉多余的修饰词
4. 如果无法识别目标，goalTitle 设为 null
5. 任务总数控制在 3-20 个之间，太多就合并或精简
6. 不要输出 JSON 以外的任何内容`

/**
 * 调用 AI 解析文档内容为 PlanDraft
 */
export async function aiParseToPlanDraft(
  content: string,
  sourceFile: string,
  planId: string,
): Promise<PlanDraft> {
  const config = getAIConfig()

  if (!config.apiKey) {
    throw new Error('未配置 AI API Key，请在设置页面填写')
  }

  const response = await fetch(`${config.endpoint}/chat/completions`, {
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
  })

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

  const tasks: PlanDraftTask[] = (parsed.tasks || []).map((t: any) => {
    const day = t.day || 1
    const date = computeDate(today, day - 1)
    return {
      title: String(t.title || '').slice(0, 100),
      day,
      date,
      time: t.time || undefined,
      priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as 'high' | 'medium' | 'low',
    }
  })

  return {
    planId,
    goalTitle: parsed.goalTitle || null,
    goalDescription: parsed.goalDescription || '',
    startDate: today,
    endDate: computeDate(today, totalDays - 1),
    totalDays,
    tasks,
    rawContent: content,
  }
}

function computeDate(base: string, addDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + addDays)
  return d.toISOString().slice(0, 10)
}
