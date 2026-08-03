import type { PlanDraft, DraftDay, DraftBlock } from '@/types/planDraft'
import { generateDraftId, computeDate } from '@/types/planDraft'
import { todayLocal } from '@/utils/date'
import { isTaskLine, cleanTaskTitle, isReviewLine, matchDay, resolveDate, PRIORITY_MAP } from './parserShared'

/**
 * PlanDraft 解析器 v2 — 层级输出（Goal → Days → Blocks → Tasks）
 *
 * 解析规则：
 * 1. 一级标题/周目标 → Goal
 * 2. Day1-Day7 → DailyPlan
 * 3. 学习/项目/复盘 → 时间块（Block）
 * 4. 列表内容 → Task
 *
 * 任务行识别与标题清理等原语见 parserShared.ts（与 aiParser 共享）
 */

export function parseToPlanDraft(content: string, _sourceFile: string, planId: string): PlanDraft {
  const lines = content.split('\n').map((l) => l.trim())
  const today = todayLocal()

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
    const dayNum = matchDay(line)
    if (dayNum !== null) {
      currentDay = dayNum
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
    const title = cleanTaskTitle(line)

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
