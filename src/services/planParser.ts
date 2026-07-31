import type { PlanDraft, DraftDay, DraftBlock } from '@/types/planDraft'
import { generateDraftId, computeDate } from '@/types/planDraft'

/**
 * PlanDraft 解析器 v2 — 层级输出（Goal → Days → Blocks → Tasks）
 *
 * 解析规则：
 * 1. 一级标题/周目标 → Goal
 * 2. Day1-Day7 → DailyPlan
 * 3. 学习/项目/复盘 → 时间块（Block）
 * 4. 列表内容 → Task
 *
 * 任务行识别（必须满足至少一条）：
 * - Markdown 列表前缀：- / * / • / 1. / 1)
 * - 包含优先级标记：!high / !medium / !low
 * - 包含时间标记：@HH:MM
 * - 包含日期标记：@YYYY-MM-DD 或 @明天/@后天
 *
 * 非任务行（忽略或分类为 note/review）：
 * - Markdown 标题（# 开头但不是列表）→ goal
 * - 纯文本段落 → note（不进入 Task）
 * - 复盘/总结标记 → review（不进入 Task）
 */

const PRIORITY_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  high: 'high', medium: 'medium', low: 'low',
  h: 'high', m: 'medium', l: 'low',
  高: 'high', 中: 'medium', 低: 'low',
}

const REVIEW_KEYWORDS = /^(复盘|总结|模板|review|心得|反思)/i

/** 判断是否为任务行（列表前缀 或 包含标记） */
function isTaskLine(line: string): boolean {
  if (/^[-*•]\s+/.test(line)) return true
  if (/^\d+[.)]\s+/.test(line)) return true
  if (/!\S+/.test(line) && /!(high|medium|low|h|m|l|高|中|低)\b/i.test(line)) return true
  if (/@\d{1,2}:\d{2}/.test(line)) return true
  return false
}

/** 判断是否为复盘/说明类行 */
function isReviewLine(line: string): boolean {
  return REVIEW_KEYWORDS.test(line)
}

export function parseToPlanDraft(content: string, _sourceFile: string, planId: string): PlanDraft {
  const lines = content.split('\n').map((l) => l.trim())
  const today = new Date().toISOString().slice(0, 10)

  let goalTitle: string | null = null
  let goalDescription = ''
  let startDate = today
  let currentDay = 0
  let currentBlockCategory = '学习'
  const dayDates: Record<number, string> = {}
  // 按 day 分组的结构化数据
  const dayMap = new Map<number, { date: string; blocks: Map<string, DraftBlock> }>()

  function ensureDay(dayNum: number): { date: string; blocks: Map<string, DraftBlock> } {
    if (!dayMap.has(dayNum)) {
      const date = dayDates[dayNum] || (dayNum === 1 ? startDate : computeDate(startDate, dayNum - 1))
      dayMap.set(dayNum, { date, blocks: new Map() })
    }
    return dayMap.get(dayNum)!
  }

  function ensureBlock(blocks: Map<string, DraftBlock>, category: string, time?: string): DraftBlock {
    const key = category + (time || '')
    if (!blocks.has(key)) {
      blocks.set(key, { id: generateDraftId('blk'), category, time, tasks: [] })
    }
    return blocks.get(key)!
  }

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
    const dayMatch = line.match(/^第(\d+)\s*天/) || line.match(/^[Dd]ay\s*(\d+)/) || line.match(/^#{1,3}\s*[Dd]ay\s*(\d+)/)
    if (dayMatch) {
      currentDay = parseInt(dayMatch[1])
      dayDates[currentDay] = currentDay === 1 ? startDate : computeDate(startDate, currentDay - 1)
      continue
    }

    // 子标题作为 block category（学习/项目/复盘等）
    const blockMatch = line.match(/^#{2,4}\s+(.+)/)
    if (blockMatch && currentDay > 0) {
      const cat = blockMatch[1].trim()
      currentBlockCategory = cat
      // 如果是复盘类，创建一个 review block（不产生 task）
      if (isReviewLine(cat)) {
        const dayData = ensureDay(currentDay)
        ensureBlock(dayData.blocks, cat)
      }
      continue
    }

    // 独立日期行
    const dateOnly = line.match(/^(\d{4}-\d{2}-\d{2})$/)
    if (dateOnly) { currentDay++; dayDates[currentDay] = dateOnly[1]; continue }

    // 复盘/模板行 → 跳过（不进入 task）
    if (isReviewLine(line)) continue
    if (/^[-=*]{3,}$/.test(line)) continue

    // 非任务行 → 跳过（分类为 note，不进入结构）
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
    const dayData = ensureDay(taskDay)
    const block = ensureBlock(dayData.blocks, currentBlockCategory, time)
    block.tasks.push({
      id: generateDraftId(),
      title,
      priority,
      selected: true,
      category: 'task',
    })
  }

  // 组装 days 数组
  const days: DraftDay[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNum, data]) => ({
      id: generateDraftId('day'),
      day: dayNum,
      date: data.date,
      title: `Day${dayNum}`,
      blocks: Array.from(data.blocks.values()),
    }))

  const totalDays = days.length > 0 ? Math.max(...days.map((d) => d.day)) : 1

  return {
    id: planId,
    source: 'file',
    goal: {
      title: goalTitle || '未命名计划',
      description: goalDescription,
    },
    days: days.length > 0 ? days : [{
      id: generateDraftId('day'),
      day: 1,
      date: startDate,
      title: 'Day1',
      blocks: [],
    }],
    startDate,
    totalDays,
    createdAt: new Date().toISOString(),
  }
}

function resolveDate(s: string): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (s === '今天' || s === 'today') return today.toISOString().slice(0, 10)
  if (s === '明天' || s === 'tomorrow') return new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (md) return `${today.getFullYear()}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`
  return null
}

// ==== 辅助函数（向后兼容）====

export function summarizeDraft(draft: PlanDraft) {
  const allTasks = draft.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks))
  const taskCount = allTasks.length
  const daysWithTasks = draft.days.filter((d) => d.blocks.some((b) => b.tasks.length > 0)).length
  const byDay: Record<number, number> = {}
  draft.days.forEach((d) => {
    const count = d.blocks.flatMap((b) => b.tasks).length
    if (count > 0) byDay[d.day] = count
  })
  return { goals: 1, taskCount, daysWithTasks, byDay }
}

/** 任务数异常检测：超过阈值返回警告 */
export function checkDraftQuality(draft: PlanDraft): string | null {
  const allTasks = draft.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks))
  if (allTasks.length === 0) return '未识别到任何任务，请确认文件包含列表格式（- 或 1.）'
  if (allTasks.length > 30) return `解析出 ${allTasks.length} 个任务，数量异常，请检查文件格式或手动删减`
  const avgPerDay = allTasks.length / Math.max(draft.totalDays, 1)
  if (avgPerDay > 10) return `平均每天 ${avgPerDay.toFixed(1)} 个任务，可能过多`
  return null
}
