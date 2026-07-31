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

const SYSTEM_PROMPT = `你是一个学习计划解析助手。用户会给你一段文档内容，你需要将其解析为层级结构的 JSON 计划。

输出格式必须是合法 JSON，结构如下：
{
  "goalTitle": "目标名称",
  "goalDescription": "目标描述（一句话）",
  "totalDays": 7,
  "days": [
    {
      "day": 1,
      "title": "Day1：认识项目结构",
      "blocks": [
        {
          "category": "学习",
          "time": "09:00",
          "tasks": [
            { "title": "查看src目录", "priority": "medium", "category": "task" }
          ]
        }
      ]
    }
  ]
}

内容分类规则（关键）：
- [任务] 可执行的具体动作 → category: "task"
- [说明] 解释性文字、背景介绍 → category: "note"（不作为任务）
- [复盘模板] 复盘/总结模板 → category: "review"（不作为任务）
只有 category: "task" 的内容才作为任务输出。

重要规则：
1. 只提取真正的「可执行任务」，不要把标题、描述、说明、模板、分隔线当任务
2. 如果文档没有明确的日期/天数，默认所有任务 day=1
3. 任务标题要简洁（15字以内），去掉多余的修饰词
4. 如果无法识别目标，goalTitle 设为 null
5. 任务总数控制在 3-30 个之间，太多就合并或精简
6. 每天的任务不超过 8 个
7. 不要输出 JSON 以外的任何内容`

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
