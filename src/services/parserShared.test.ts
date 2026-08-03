import { describe, it, expect } from 'vitest'
import { isTaskLine, cleanTaskTitle, resolveDate, matchDay, isReviewLine, PRIORITY_MAP } from './parserShared'

describe('isTaskLine', () => {
  it('识别 Markdown 列表前缀', () => {
    expect(isTaskLine('- 学习 Vue3')).toBe(true)
    expect(isTaskLine('* 复习闭包')).toBe(true)
    expect(isTaskLine('• 写博客')).toBe(true)
    expect(isTaskLine('1. 完成项目')).toBe(true)
    expect(isTaskLine('2) 整理笔记')).toBe(true)
  })

  it('识别优先级标记', () => {
    expect(isTaskLine('!high 攻坚难点')).toBe(true)
    expect(isTaskLine('背单词 !低')).toBe(true)
    expect(isTaskLine('复习 !m 中等优先')).toBe(true)
  })

  it('识别时间标记', () => {
    expect(isTaskLine('跑步 @07:00')).toBe(true)
    expect(isTaskLine('开会 @14:30 评审')).toBe(true)
  })

  it('负例：纯文本/标题/非任务行', () => {
    expect(isTaskLine('这是一个纯文本段落')).toBe(false)
    expect(isTaskLine('# 目标标题')).toBe(false)
    expect(isTaskLine('## 学习')).toBe(false)
    expect(isTaskLine('---')).toBe(false)
    expect(isTaskLine('随便写点什么内容')).toBe(false)
  })
})

describe('cleanTaskTitle', () => {
  it('清理列表前缀与标记', () => {
    expect(cleanTaskTitle('- 学习 Vue3')).toBe('学习 Vue3')
    expect(cleanTaskTitle('1. 完成项目')).toBe('完成项目')
    expect(cleanTaskTitle('跑步 @07:00')).toBe('跑步')
    expect(cleanTaskTitle('背单词 !high')).toBe('背单词')
    expect(cleanTaskTitle('# 标题行')).toBe('标题行')
    expect(cleanTaskTitle('复习作用域 @09:00 !high #js')).toBe('复习作用域')
  })

  it('保留普通文本', () => {
    expect(cleanTaskTitle('普通任务标题')).toBe('普通任务标题')
  })
})

describe('resolveDate', () => {
  const fixed = new Date(2026, 7, 3, 12, 0, 0) // 本地 2026-08-03 12:00

  it('今天/明天/后天', () => {
    expect(resolveDate('今天', fixed)).toBe('2026-08-03')
    expect(resolveDate('today', fixed)).toBe('2026-08-03')
    expect(resolveDate('明天', fixed)).toBe('2026-08-04')
    expect(resolveDate('tomorrow', fixed)).toBe('2026-08-04')
    expect(resolveDate('后天', fixed)).toBe('2026-08-05')
  })

  it('跨月/跨年偏移', () => {
    expect(resolveDate('明天', new Date(2026, 7, 31, 12, 0, 0))).toBe('2026-09-01')
    expect(resolveDate('明天', new Date(2026, 11, 31, 12, 0, 0))).toBe('2027-01-01')
  })

  it('绝对日期与 MM/DD', () => {
    expect(resolveDate('2026-09-01', fixed)).toBe('2026-09-01')
    expect(resolveDate('9/1', fixed)).toBe('2026-09-01')
    expect(resolveDate('12/31', fixed)).toBe('2026-12-31')
  })

  it('非法输入返回 null', () => {
    expect(resolveDate('下周', fixed)).toBeNull()
    expect(resolveDate('随便', fixed)).toBeNull()
    expect(resolveDate('', fixed)).toBeNull()
  })
})

describe('matchDay', () => {
  it('识别各种 Day 标记', () => {
    expect(matchDay('第1天')).toBe(1)
    expect(matchDay('第12天')).toBe(12)
    expect(matchDay('Day3')).toBe(3)
    expect(matchDay('day5')).toBe(5)
    expect(matchDay('# Day 7')).toBe(7)
    expect(matchDay('## Day10：作用域')).toBe(10)
  })

  it('负例', () => {
    expect(matchDay('学习')).toBeNull()
    expect(matchDay('Day')).toBeNull()
    expect(matchDay('第0天')).toBe(0)
  })
})

describe('isReviewLine', () => {
  it('识别复盘类行', () => {
    expect(isReviewLine('复盘：今天的收获')).toBe(true)
    expect(isReviewLine('总结')).toBe(true)
    expect(isReviewLine('心得体会')).toBe(true)
    expect(isReviewLine('Review')).toBe(true)
    expect(isReviewLine('模板')).toBe(true)
  })

  it('负例', () => {
    expect(isReviewLine('学习 Vue')).toBe(false)
    expect(isReviewLine('完成项目')).toBe(false)
  })
})

describe('PRIORITY_MAP', () => {
  it('中英文与缩写映射', () => {
    expect(PRIORITY_MAP['high']).toBe('high')
    expect(PRIORITY_MAP['h']).toBe('high')
    expect(PRIORITY_MAP['高']).toBe('high')
    expect(PRIORITY_MAP['medium']).toBe('medium')
    expect(PRIORITY_MAP['低']).toBe('low')
  })
})
