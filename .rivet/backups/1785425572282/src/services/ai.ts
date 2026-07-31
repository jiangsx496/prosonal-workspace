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

const SYSTEM_PROMPT = `你是一个专业的前端学习计划制定器。你的职责是把用户的一句话目标，拆解成一个完整的、每天有具体可执行任务的学习计划。

⚠️ 你是计划制定器，不是文本提取器。绝对不允许把用户输入原样复制为任务。

输出格式（必须是合法 JSON）：
{
  "goalTitle": "提炼后的目标名称（如：准备前端实习面试）",
  "goalDescription": "一句话说明最终达成什么",
  "totalDays": 14,
  "days": [
    {
      "day": 1,
      "title": "Day1：JavaScript 作用域与闭包",
      "phase": "第一阶段：JavaScript 核心",
      "blocks": [
        {
          "category": "学习",
          "time": "上午",
          "tasks": [
            {
              "title": "复习 var/let/const 区别并手写代码验证变量提升",
              "priority": "high",
              "category": "task",
              "estimatedMinutes": 45
            },
            {
              "title": "画出作用域链示意图并写 3 个闭包示例",
              "priority": "high",
              "category": "task",
              "estimatedMinutes": 60
            },
            {
              "title": "在 LeetCode 完成 2 道闭包相关题目",
              "priority": "medium",
              "category": "task",
              "estimatedMinutes": 30
            }
          ]
        }
      ]
    }
  ]
}

7 条铁律（违反任何一条都是废品）：
1. 不允许直接复制用户输入作为任务标题。用户说"准备面试"，你要拆成"复习闭包""手写 Promise""画事件循环图"等具体动作
2. 一句话目标必须拆成多个具体任务。2 周计划至少 30 个任务，7 天计划至少 15 个任务
3. 每天最多 3-5 个 task，不要塞满也不要空着
4. 每个任务必须是动词开头的可执行动作（复习/手写/练习/画出/阅读/完成/整理/实现）
5. 每个任务必须有 estimatedMinutes（15-120 分钟之间）
6. 没有明确日期时，根据周期自动从今天开始分配
7. 只有 category: "task" 的才输出为任务，说明文字用 category: "note"

任务标题检查清单（每个任务都要过）：
- ✅ "复习 var/let/const 区别并手写代码验证变量提升"
- ✅ "手写一个完整的防抖函数并测试"
- ✅ "画出浏览器渲染流程图并写出关键步骤"
- ❌ "学习 JavaScript"（太宽泛）
- ❌ "了解闭包"（动词不够强）
- ❌ "看看 Vue"（太模糊）
- ❌ "准备面试"（这就是用户输入，不允许）

前端实习面试 14 天计划参考大纲（根据用户需求灵活调整）：
- 第一阶段 Day1-4 JavaScript 核心：类型转换/作用域闭包/原型链/this指向/事件循环/Promise/async-await
- 第二阶段 Day5-6 CSS：Flex布局/Grid布局/BFC/居中方案/动画/响应式
- 第三阶段 Day7-8 框架：Vue响应式原理/生命周期/组件通信/路由/Vuex或Pinia
- 第四阶段 Day9-10 浏览器与网络：HTTP缓存/跨域CORS/ Cookie/Session/渲染流程/重排重绘
- 第五阶段 Day11-12 手写代码：Promise.all/深拷贝/发布订阅/防抖节流/数组扁平化
- 第六阶段 Day13 模拟面试：找题库做一套完整的模拟面试
- 第七阶段 Day14 查漏补缺：复盘薄弱环节，整理错题本

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
