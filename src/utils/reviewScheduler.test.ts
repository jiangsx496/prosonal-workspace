import { describe, it, expect } from 'vitest'
import { nextReviewDate, masteryFromCount, MASTERY_LABELS } from './reviewScheduler'

describe('reviewScheduler', () => {
  describe('nextReviewDate', () => {
    it('0 次复习 → 1 天后', () => {
      expect(nextReviewDate(0, '2025-01-01')).toBe('2025-01-02')
    })

    it('1 次复习 → 1 天后', () => {
      expect(nextReviewDate(1, '2025-01-01')).toBe('2025-01-02')
    })

    it('2 次复习 → 3 天后', () => {
      expect(nextReviewDate(2, '2025-01-01')).toBe('2025-01-04')
    })

    it('3 次复习 → 7 天后', () => {
      expect(nextReviewDate(3, '2025-01-01')).toBe('2025-01-08')
    })

    it('4 次复习 → 14 天后', () => {
      expect(nextReviewDate(4, '2025-01-01')).toBe('2025-01-15')
    })

    it('5+ 次复习 → 不超过 30 天', () => {
      const result = nextReviewDate(10, '2025-01-01')
      expect(result).toBe('2025-01-31') // 30 天
    })
  })

  describe('masteryFromCount', () => {
    it('0 次 → new', () => {
      expect(masteryFromCount(0)).toBe('new')
    })

    it('1-2 次 → learning', () => {
      expect(masteryFromCount(1)).toBe('learning')
      expect(masteryFromCount(2)).toBe('learning')
    })

    it('3-4 次 → familiar', () => {
      expect(masteryFromCount(3)).toBe('familiar')
      expect(masteryFromCount(4)).toBe('familiar')
    })

    it('5+ 次 → mastered', () => {
      expect(masteryFromCount(5)).toBe('mastered')
      expect(masteryFromCount(100)).toBe('mastered')
    })
  })

  describe('MASTERY_LABELS', () => {
    it('所有掌握度都有中文标签', () => {
      expect(MASTERY_LABELS.new).toBeTruthy()
      expect(MASTERY_LABELS.learning).toBeTruthy()
      expect(MASTERY_LABELS.familiar).toBeTruthy()
      expect(MASTERY_LABELS.mastered).toBeTruthy()
    })
  })
})
