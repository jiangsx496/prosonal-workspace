import type { PlanDraft, PlanDraftTask } from '@/stores/plans'

/**
 * PlanDraft 解析器 — 从文本内容提取结构化计划
 *
 * 识别规则（本地正则，不依赖 AI）：
 * - 目标：# 开头 或 「目标：」开头
 * - 周期：「第1天」~「第N天」或 Day 1~N 或 「日期：YYYY-MM-DD」
 * - 任务：每行一个，支持 !high/medium/low 和 @HH:MM
 * - 描述：「描述：」开头
 * - 复盘：「复盘」/「总结」行标记为模板
 */

const PRIORITY_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  high: 'high', medium: 'medium', low: 'low',
  h: 'high', m: 'medium', l: 'low',
  高: 'high', 中: 'medium', 低: 'low',
}

export function parseToPlanDraft(content: string, sourceFile: string, planId: string): PlanDraft {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  const today = new Date().toISOString().slice(0, 10)

  let goalTitle: string | null = null
  let goalDescription = ''
  let startDate = today
  let currentDay = 0
  const tasks: PlanDraftTask[] = []
  const dayDates: Record<number, string> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 目标识别
    const goalMatch = line.match(/^#\s*(.+)/) || line.match(/^目标[：:]\s*(.+)/)
    if (goalMatch && !goalTitle) {
      goalTitle = goalMatch[1].trim()
      continue
    }

    // 描述
    const descMatch = line.match(/^描述[：:]\s*(.+)/)
    if (descMatch) {
      goalDescription = descMatch[1].trim()
      continue
    }

    // 周期开始日期
    const startMatch = line.match(/^开始[：:]\s*(\S+)/) || line.match(/^起始日期[：:]\s*(\S+)/)
    if (startMatch) {
      startDate = resolveDate(startMatch[1]) || startDate
      continue
    }

    // 天数标记：第N天 / Day N
    const dayMatch = line.match(/^第(\d+)\s*天/) || line.match(/^[Dd]ay\s*(\d+)/)
    if (dayMatch) {
      currentDay = parseInt(dayMatch[1])
      if (currentDay === 1) {
        dayDates[1] = startDate
      } else if (currentDay > 1 && dayDates[1]) {
        const d = new Date(dayDates[1])
        d.setDate(d.getDate() + currentDay - 1)
        dayDates[currentDay] = d.toISOString().slice(0, 10)
      } else {
        dayDates[currentDay] = startDate
      }
      continue
    }

    // 日期标记：YYYY-MM-DD 单独成行
    const dateOnly = line.match(/^(\d{4}-\d{2}-\d{2})$/)
    if (dateOnly) {
      currentDay++
      dayDates[currentDay] = dateOnly[1]
      continue
    }

    // 跳过复盘/总结标记行
    if (/^(复盘|总结|模板|review)/.test(line.toLowerCase())) {
      continue
    }

    // 跳过 Markdown 标题装饰行（---, ===）
    if (/^[-=*]{3,}$/.test(line)) continue

    // 任务行：去掉 Markdown 前缀和特殊标记后提取
    let title = line
      .replace(/^#+\s*/, '')
      .replace(/^[-*•\d+.、)]+\s*/, '')
      .replace(/@\d{1,2}:\d{2}/, '')
      .replace(/!\S+/g, '')
      .replace(/#\S+/g, '')
      .trim()

    if (!title || title.length < 2) continue

    // 提取时间 @HH:MM
    const timeMatch = line.match(/@(\d{1,2}:\d{2})/)
    const time = timeMatch ? timeMatch[1] : undefined

    // 提取优先级 !high
    let priority: 'high' | 'medium' | 'low' = 'medium'
    const prioMatch = line.match(/!(\S+)/)
    if (prioMatch) {
      const key = prioMatch[1].toLowerCase()
      if (PRIORITY_MAP[key]) priority = PRIORITY_MAP[key]
    }

    const taskDay = currentDay > 0 ? currentDay : 1
    const date = dayDates[taskDay] || (taskDay === 1 ? startDate : '')

    tasks.push({ title, day: taskDay, date, time, priority })
  }

  const totalDays = Math.max(...tasks.map((t) => t.day), 1)
  let endDate = startDate
  if (dayDates[totalDays]) {
    endDate = dayDates[totalDays]
  } else {
    const d = new Date(startDate)
    d.setDate(d.getDate() + totalDays - 1)
    endDate = d.toISOString().slice(0, 10)
  }

  return { planId, goalTitle, goalDescription, startDate, endDate, totalDays, tasks, rawContent: content }
}

function resolveDate(s: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (s === '今天' || s === 'today') return today.toISOString().slice(0, 10)
  if (s === '明天' || s === 'tomorrow') return new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (md) return `${today.getFullYear()}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`
  return null
}

/**
 * 计划预览统计
 */
export function summarizeDraft(draft: PlanDraft) {
  const goals = draft.goalTitle ? 1 : 0
  const taskCount = draft.tasks.length
  const daysWithTasks = new Set(draft.tasks.map((t) => t.day)).size
  const byDay: Record<number, number> = {}
  draft.tasks.forEach((t) => { byDay[t.day] = (byDay[t.day] || 0) + 1 })
  return { goals, taskCount, daysWithTasks, byDay }
}
