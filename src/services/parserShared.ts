/**
 * 共享的 Markdown 计划解析原语（planParser / aiParser 共用）
 *
 * 背景：两个 parser 曾各自实现 isTaskLine / cleanTaskTitle / resolveDate / matchDay，
 * 且已出现行为漂移（planParser 缺「后天」、aiParser 的 matchDay 缺 `# Day N` 变体）。
 * 此处收敛为并集语义：统一后两者都支持「后天」与 `# Day N` 标题变体。
 */

import { computeDate } from '@/types/planDraft'

export const PRIORITY_MAP: Record<string, 'high' | 'medium' | 'low'> = {
  high: 'high', medium: 'medium', low: 'low',
  h: 'high', m: 'medium', l: 'low',
  高: 'high', 中: 'medium', 低: 'low',
}

export const REVIEW_KEYWORDS = /^(复盘|总结|模板|review|心得|反思)/i

/** 判断是否为任务行（列表前缀 或 包含标记） */
export function isTaskLine(line: string): boolean {
  if (/^[-*•]\s+/.test(line)) return true
  if (/^\d+[.)]\s+/.test(line)) return true
  // 中文优先级标记（!高/!低）在行尾时 \b 边界断言失效，改用负向前瞻
  if (/!\S+/.test(line) && /!(high|medium|low|h|m|l|高|中|低)(?![a-z0-9])/i.test(line)) return true
  if (/@\d{1,2}:\d{2}/.test(line)) return true
  return false
}

/** 清理任务标题：去掉标记前缀 */
export function cleanTaskTitle(line: string): string {
  return line
    .replace(/^#{1,3}\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\s*@\d{1,2}:\d{2}/g, '')
    .replace(/\s*!\S+/g, '')
    .replace(/\s*#\S+/g, '')
    .trim()
}

/** 本地时区 YYYY-MM-DD（用于相对日期解析的基准） */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 解析相对日期（今天/明天/后天/MM/DD/绝对日期），非法返回 null */
export function resolveDate(s: string, today?: Date): string | null {
  const base = today ? new Date(today) : new Date()
  base.setHours(0, 0, 0, 0)
  const baseStr = localDateStr(base)
  if (s === '今天' || s === 'today') return baseStr
  if (s === '明天' || s === 'tomorrow') return computeDate(baseStr, 1)
  if (s === '后天') return computeDate(baseStr, 2)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (md) return `${base.getFullYear()}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`
  return null
}

/** 识别 Day 标记行（第 N 天 / Day N / # Day N），非标记行返回 null */
export function matchDay(line: string): number | null {
  const m = line.match(/^第(\d+)\s*天/) || line.match(/^[Dd]ay\s*(\d+)/) || line.match(/^#{1,3}\s*[Dd]ay\s*(\d+)/)
  if (m) return parseInt(m[1])
  return null
}

/** 判断是否为复盘/说明类行 */
export function isReviewLine(line: string): boolean {
  return REVIEW_KEYWORDS.test(line)
}
