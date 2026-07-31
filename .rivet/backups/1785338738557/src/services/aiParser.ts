import type { PlanDraft, PlanDraftTask } from '@/mock/planDraft'

/**
 * AI Parser — 统一的计划解析接口
 *
 * 当前实现：本地启发式解析（无 AI API 依赖）
 * 未来替换：将 parsePlan 内部改为调用 ai.ts 的真实 AI API
 * 业务代码（Inbox.vue）不受影响，只调 parsePlan
 */

const MAX_TASKS = 20

/**
 * 从文本/文件内容生成 PlanDraft
 */
export function parsePlan(input: string, source: 'file' | 'text' | 'image', filename?: string): PlanDraft {
  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean)

  let goalTitle = ''
  let goalDesc = ''
  const tasks: PlanDraftTask[] = []
  const today = new Date().toISOString().slice(0, 10)

  // 尝试从内容中提取目标
  for (const line of lines) {
    const goalMatch = line.match(/^#{1,3}\s+(.+)/) || line.match(/^目标[：:]\s*(.+)/) || line.match(/^我要(.+)/)
    if (goalMatch && !goalTitle) {
      goalTitle = goalMatch[1].trim()
      break
    }
  }

  // 如果没有明确目标，从内容推断
  if (!goalTitle) {
    if (source === 'text' && input.length < 100) {
      goalTitle = input.trim()
    } else {
      goalTitle = filename ? filename.replace(/\.[^.]+$/, '') : '新计划'
    }
  }

  goalDesc = `从${source === 'file' ? '文件' : source === 'image' ? '图片' : '文本'}生成的计划`

  // 提取任务：只认列表行或标记行
  let taskIdx = 0
  for (const line of lines) {
    if (tasks.length >= MAX_TASKS) break

    // 跳过标题行（已提取为目标）
    if (/^#{1,3}\s/.test(line) && goalTitle && line.includes(goalTitle)) continue
    // 跳过非任务行
    if (!isTaskLine(line)) continue

    let title = cleanTaskTitle(line)
    if (!title || title.length < 2) continue

    // 优先级
    let priority: 'high' | 'medium' | 'low' = 'medium'
    if (/!(high|高)\b/i.test(line)) priority = 'high'
    else if (/!(low|低)\b/i.test(line)) priority = 'low'

    tasks.push({
      id: `dt${Date.now().toString(36)}${taskIdx++}`,
      title,
      priority,
      selected: true,
      dueDate: today,
    })
  }

  // 如果是纯文本且没有识别到任务行，把整段按句号/逗号分割
  if (tasks.length === 0 && source === 'text') {
    const sentences = input.split(/[。.!！\n]+/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 50)
    for (const s of sentences.slice(0, MAX_TASKS)) {
      tasks.push({
        id: `dt${Date.now().toString(36)}${taskIdx++}`,
        title: s,
        priority: 'medium',
        selected: true,
        dueDate: today,
      })
    }
  }

  // 构建 schedule（所有任务默认在今天）
  const schedule = tasks.length > 0
    ? [{ date: today, taskIds: tasks.map((t) => t.id) }]
    : []

  return {
    id: 'draft' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    source,
    title: goalTitle,
    goal: { title: goalTitle, description: goalDesc },
    tasks,
    schedule,
    summary: `目标：${goalTitle} · ${tasks.length} 个任务`,
    createdAt: new Date().toISOString(),
  }
}

function isTaskLine(line: string): boolean {
  if (/^[-*•]\s+/.test(line)) return true
  if (/^\d+[.)]\s+/.test(line)) return true
  if (/!\S+/.test(line) && /!(high|medium|low|h|m|l|高|中|低)\b/i.test(line)) return true
  if (/@\d{1,2}:\d{2}/.test(line)) return true
  return false
}

function cleanTaskTitle(line: string): string {
  return line
    .replace(/^#{1,3}\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s*@\d{1,2}:\d{2}/g, '')
    .replace(/\s*!\S+/g, '')
    .replace(/\s*#\S+/g, '')
    .trim()
}
