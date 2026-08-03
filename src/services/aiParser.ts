import type { PlanDraft, DraftDay, DraftBlock, ContentCategory } from '@/types/planDraft'
import { generateDraftId, computeDate } from '@/types/planDraft'
import { todayLocal } from '@/utils/date'
import { isTaskLine, cleanTaskTitle, matchDay, resolveDate } from './parserShared'

/**
 * 本地启发式解析器 — 无 AI API 依赖
 *
 * 输出统一层级结构 PlanDraft（Goal → Days → Blocks → Tasks）
 * 解析策略：行级识别 + Day/Block 分组 + category 分类过滤
 * 任务行识别等原语见 parserShared.ts（与 planParser 共享）
 */

const MAX_TASKS = 30
const MAX_TASKS_PER_DAY = 8

/** 内容分类：识别任务/说明/复盘模板 */
function classifyContent(line: string): ContentCategory {
  const lower = line.toLowerCase()
  // 复盘模板类
  if (/复盘|总结|模板|review|template|今日收获|学到了/.test(lower)) return 'review'
  // 纯说明文字（不是列表、没有动作词）
  if (!isTaskLine(line) && !/(完成|查看|学习|练习|复习|编写|实现|搭建|配置|测试|部署|阅读|整理|创建)/.test(line)) {
    return 'note'
  }
  return 'task'
}

/** 识别 Day 标记行（见 parserShared.matchDay） */

/** 识别 Block 分类标题（学习/项目/复盘等子标题） */
function matchBlockCategory(line: string): string | null {
  // ## 学习 / ### 项目 / #### 复盘
  const m = line.match(/^#{2,4}\s+(.+)/)
  if (m) {
    const text = m[1].trim()
    if (/(学习|study|learn)/i.test(text)) return '学习'
    if (/(项目|project)/i.test(text)) return '项目'
    if (/(复盘|总结|review)/i.test(text)) return '复盘'
    if (/(运动|exercise|健身)/i.test(text)) return '运动'
    if (/(生活|daily|日常)/i.test(text)) return '生活'
    return text
  }
  // 【学习】/ [项目] 等
  const bracket = line.match(/^[【\[](.+?)[】\]]\s*$/)
  if (bracket) return bracket[1]
  return null
}

/** 解析相对日期（今天/明天/后天/MM/DD/绝对日期）—— 见 parserShared.resolveDate */

/**
 * 从文本/文件内容生成层级 PlanDraft
 */
export function parsePlan(input: string, source: 'file' | 'text' | 'image', filename?: string): PlanDraft {
  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean)
  const today = todayLocal()

  let goalTitle = ''
  let goalDesc = ''
  let startDate = today

  // 尝试提取目标
  for (const line of lines) {
    const goalMatch = line.match(/^#{1}\s+(.+)/) || line.match(/^目标[：:]\s*(.+)/) || line.match(/^我要(.+)/)
    if (goalMatch && !goalTitle) {
      goalTitle = goalMatch[1].trim()
      break
    }
  }
  if (!goalTitle) {
    if (source === 'text' && input.length < 100) {
      goalTitle = input.trim()
    } else {
      goalTitle = filename ? filename.replace(/\.[^.]+$/, '') : '新计划'
    }
  }

  // 提取开始日期
  for (const line of lines) {
    const startMatch = line.match(/^(?:开始|起始日期)[：:]\s*(\S+)/)
    if (startMatch) {
      const resolved = resolveDate(startMatch[1])
      if (resolved) startDate = resolved
      break
    }
  }

  goalDesc = `从${source === 'file' ? '文件' : source === 'image' ? '图片' : '文本'}生成的计划`

  // ==== 按行解析，构建层级结构 ====
  const daysMap = new Map<number, DraftDay>()
  let currentDay = 1
  let currentBlockCategory = '学习'
  let totalTaskCount = 0

  // 初始化 Day 1
  function ensureDay(dayNum: number): DraftDay {
    if (!daysMap.has(dayNum)) {
      daysMap.set(dayNum, {
        id: generateDraftId('day'),
        day: dayNum,
        date: dayNum === 1 ? startDate : computeDate(startDate, dayNum - 1),
        title: `Day${dayNum}`,
        blocks: [],
      })
    }
    return daysMap.get(dayNum)!
  }

  function ensureBlock(day: DraftDay, category: string): DraftBlock {
    let block = day.blocks.find((b) => b.category === category)
    if (!block) {
      block = { id: generateDraftId('blk'), category, tasks: [] }
      day.blocks.push(block)
    }
    return block
  }

  ensureDay(currentDay)

  for (const line of lines) {
    if (totalTaskCount >= MAX_TASKS) break

    // 跳过目标行
    if (goalTitle && line.includes(goalTitle)) continue
    // 跳过日期/描述行
    if (/^(?:开始|起始日期|描述)[：:]/.test(line)) continue
    // 跳过分隔线
    if (/^[-=*]{3,}$/.test(line)) continue

    // Day 标记
    const dayNum = matchDay(line)
    if (dayNum !== null) {
      currentDay = dayNum
      const day = ensureDay(currentDay)
      // Day 标题行可能带描述，如 "Day1：认识项目结构"
      const titleMatch = line.match(/[:：]\s*(.+)/)
      if (titleMatch) day.title = `Day${dayNum}：${titleMatch[1].trim()}`
      // Day 变化后重置 block
      currentBlockCategory = '学习'
      continue
    }

    // Block 分类标题
    const blockCat = matchBlockCategory(line)
    if (blockCat) {
      currentBlockCategory = blockCat
      continue
    }

    // 独立日期行
    const dateOnly = line.match(/^(\d{4}-\d{2}-\d{2})$/)
    if (dateOnly) {
      currentDay++
      const day = ensureDay(currentDay)
      day.date = dateOnly[1]
      continue
    }

    // 内容分类
    const category = classifyContent(line)

    // 任务行
    if (isTaskLine(line)) {
      const title = cleanTaskTitle(line)
      if (!title || title.length < 2) continue

      const day = ensureDay(currentDay)
      const block = ensureBlock(day, currentBlockCategory)

      // 每天上限
      const dayTaskCount = day.blocks.reduce((sum, b) => sum + b.tasks.length, 0)
      if (dayTaskCount >= MAX_TASKS_PER_DAY) continue

      // 优先级
      let priority: 'high' | 'medium' | 'low' = 'medium'
      if (/!(high|高)\b/i.test(line)) priority = 'high'
      else if (/!(low|低)\b/i.test(line)) priority = 'low'

      // 时间
      const timeMatch = line.match(/@(\d{1,2}:\d{2})/)
      if (timeMatch && !block.time) block.time = timeMatch[1]

      block.tasks.push({
        id: generateDraftId(),
        title,
        priority,
        selected: category === 'task', // 只有 task 默认选中
        category,
      })
      totalTaskCount++
    }
  }

  // 如果没有解析到任何任务，纯文本模式按句子分割
  if (totalTaskCount === 0 && source === 'text') {
    const sentences = input.split(/[。.!！\n]+/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 50)
    const day = ensureDay(1)
    const block = ensureBlock(day, '学习')
    for (const s of sentences.slice(0, MAX_TASKS)) {
      block.tasks.push({
        id: generateDraftId(),
        title: s,
        priority: 'medium',
        selected: true,
        category: 'task',
      })
      totalTaskCount++
    }
  }

  const days = Array.from(daysMap.values()).sort((a, b) => a.day - b.day)
  const totalDays = days.length > 0 ? Math.max(...days.map((d) => d.day)) : 1

  return {
    id: generateDraftId('draft'),
    source,
    goal: { title: goalTitle, description: goalDesc },
    days,
    startDate,
    totalDays,
    createdAt: new Date().toISOString(),
  }
}

/** 草稿摘要统计 */
export function summarizeDraft(draft: PlanDraft) {
  const allTasks = draft.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks))
  const taskCount = allTasks.filter((t) => t.category === 'task').length
  const daysWithTasks = new Set(draft.days.filter((d) => d.blocks.some((b) => b.tasks.length > 0)).map((d) => d.day)).size
  const byDay: Record<number, number> = {}
  draft.days.forEach((d) => {
    const count = d.blocks.reduce((sum, b) => sum + b.tasks.filter((t) => t.category === 'task').length, 0)
    if (count > 0) byDay[d.day] = count
  })
  return { goals: draft.goal.title ? 1 : 0, taskCount, daysWithTasks, byDay }
}

/** 任务数异常检测：超过阈值返回警告 */
export function checkDraftQuality(draft: PlanDraft): string | null {
  const allTasks = draft.days.flatMap((d) => d.blocks.flatMap((b) => b.tasks))
  const taskCount = allTasks.filter((t) => t.category === 'task').length

  if (taskCount === 0) return '未识别到任何任务，请确认文件包含列表格式（- 或 1.）'
  if (taskCount > 30) return `解析出 ${taskCount} 个任务，数量异常，请检查文件格式或手动删减`
  const avgPerDay = taskCount / Math.max(draft.totalDays, 1)
  if (avgPerDay > 10) return `平均每天 ${avgPerDay.toFixed(1)} 个任务，可能过多`
  return null
}
