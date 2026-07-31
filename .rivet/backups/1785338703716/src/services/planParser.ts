import type { PlanDraft, PlanDraftTask } from '@/stores/plans'

/**
 * PlanDraft 解析器 v2 — 精确识别任务行，拒绝把段落文本当任务
 *
 * 任务行识别规则（必须满足至少一条）：
 * - Markdown 列表前缀：- / * / • / 1. / 1)
 * - 包含优先级标记：!high / !medium / !low
 * - 包含时间标记：@HH:MM
 * - 包含日期标记：@YYYY-MM-DD 或 @明天/@后天
 *
 * 非任务行（忽略）：
 * - Markdown 标题（# 开头但不是列表）
 * - 纯文本段落
 * - 分隔线 --- ===
 * - 复盘/总结标记
 * - 空行
 */

const PRIORITY_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  high: 'high', medium: 'medium', low: 'low',
  h: 'high', m: 'medium', l: 'low',
  高: 'high', 中: 'medium', 低: 'low',
}

/** 判断是否为任务行（列表前缀 或 包含标记） */
function isTaskLine(line: string): boolean {
  // 列表前缀：- xxx / * xxx / • xxx / 1. xxx / 1) xxx / - [ ] xxx
  if (/^[-*•]\s+/.test(line)) return true
  if (/^\d+[.)]\s+/.test(line)) return true
  // 含 !优先级 或 @时间 标记
  if (/!\S+/.test(line) && /!(high|medium|low|h|m|l|高|中|低)\b/i.test(line)) return true
  if (/@\d{1,2}:\d{2}/.test(line)) return true
  return false
}

export function parseToPlanDraft(content: string, sourceFile: string, planId: string): PlanDraft {
  const lines = content.split('\n').map((l) => l.trim())
  const today = new Date().toISOString().slice(0, 10)

  let goalTitle: string | null = null
  let goalDescription = ''
  let startDate = today
  let currentDay = 0
  const tasks: PlanDraftTask[] = []
  const dayDates: Record<number, string> = {}

  for (const line of lines) {
    if (!line) continue

    // 目标识别（首个 # 标题 或「目标：」行）
    if (!goalTitle) {
      const m = line.match(/^#{1,3}\s+(.+)/) || line.match(/^目标[：:]\s*(.+)/)
      if (m) { goalTitle = m[1].trim(); continue }
    }

    // 描述
    const descMatch = line.match(/^描述[：:]\s*(.+)/)
    if (descMatch) { goalDescription = descMatch[1].trim(); continue }

    // 开始日期
    const startMatch = line.match(/^(?:开始|起始日期)[：:]\s*(\S+)/)
    if (startMatch) { startDate = resolveDate(startMatch[1]) || startDate; continue }

    // 天数标记
    const dayMatch = line.match(/^第(\d+)\s*天/) || line.match(/^[Dd]ay\s*(\d+)/)
    if (dayMatch) {
      currentDay = parseInt(dayMatch[1])
      dayDates[currentDay] = currentDay === 1 ? startDate : (computeDate(startDate, currentDay - 1))
      continue
    }

    // 独立日期行
    const dateOnly = line.match(/^(\d{4}-\d{2}-\d{2})$/)
    if (dateOnly) { currentDay++; dayDates[currentDay] = dateOnly[1]; continue }

    // 跳过非任务行
    if (/^(复盘|总结|模板|review)/i.test(line)) continue
    if (/^[-=*]{3,}$/.test(line)) continue
    if (!isTaskLine(line)) continue

    // 提取任务标题
    let title = line
      .replace(/^#{1,3}\s*/, '')
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/\s*@\d{1,2}:\d{2}/g, '')
      .replace(/\s*!\S+/g, '')
      .replace(/\s*#\S+/g, '')
      .trim()

    if (!title || title.length < 2) continue

    // 时间
    const timeMatch = line.match(/@(\d{1,2}:\d{2})/)
    const time = timeMatch ? timeMatch[1] : undefined

    // 优先级
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
  const endDate = dayDates[totalDays] || computeDate(startDate, totalDays - 1)

  return { planId, goalTitle, goalDescription, startDate, endDate, totalDays, tasks, rawContent: content }
}

function computeDate(base: string, addDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + addDays)
  return d.toISOString().slice(0, 10)
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

export function summarizeDraft(draft: PlanDraft) {
  const goals = draft.goalTitle ? 1 : 0
  const taskCount = draft.tasks.length
  const daysWithTasks = new Set(draft.tasks.map((t) => t.day)).size
  const byDay: Record<number, number> = {}
  draft.tasks.forEach((t) => { byDay[t.day] = (byDay[t.day] || 0) + 1 })
  return { goals, taskCount, daysWithTasks, byDay }
}

/** 任务数异常检测：超过阈值返回警告 */
export function checkDraftQuality(draft: PlanDraft): string | null {
  if (draft.tasks.length === 0) return '未识别到任何任务，请确认文件包含列表格式（- 或 1.）'
  if (draft.tasks.length > 30) return `解析出 ${draft.tasks.length} 个任务，数量异常，请检查文件格式或手动删减`
  const avgPerDay = draft.tasks.length / Math.max(draft.totalDays, 1)
  if (avgPerDay > 10) return `平均每天 ${avgPerDay.toFixed(1)} 个任务，可能过多`
  return null
}
