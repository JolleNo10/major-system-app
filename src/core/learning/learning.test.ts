import { describe, expect, it } from 'vitest'
import {
  createMasteryPolicy,
  deriveItemProgress,
  deriveScopeProgress,
  selectNextItem,
  type Attempt,
  type ItemProgress,
  type LearningScope,
} from './index'

const attempt = (at: number, ok: boolean, ms = 500): Attempt => ({ at, ok, ms })

function progress(itemId: string, overrides: Partial<ItemProgress> = {}): ItemProgress {
  return {
    itemId,
    attempts: 0,
    correct: 0,
    wrong: 0,
    recentCorrect: 0,
    consecutiveCorrect: 0,
    lastAttemptAt: null,
    medianMs: null,
    mastered: false,
    ...overrides,
  }
}

describe('shared learning progress', () => {
  it('derives directional item evidence and mastery from attempts', () => {
    const item = deriveItemProgress('geo:capital:NO:country-to-capital', [
      attempt(1, true, 400),
      attempt(2, false, 900),
      attempt(3, true, 500),
      attempt(4, true, 700),
    ])

    expect(item).toMatchObject({
      attempts: 4,
      correct: 3,
      wrong: 1,
      recentCorrect: 2,
      consecutiveCorrect: 2,
      lastAttemptAt: 4,
      medianMs: 600,
      mastered: true,
    })
  })

  it('allows mastery rules to be configured without changing item calculation', () => {
    const item = deriveItemProgress('item', [attempt(1, true), attempt(2, true)], createMasteryPolicy({
      minimumConsecutiveCorrect: 3,
    }))
    expect(item.consecutiveCorrect).toBe(2)
    expect(item.mastered).toBe(false)
  })

  it('derives scope progress from item progress and does not duplicate ids', () => {
    const scope: LearningScope = { id: 'geo:world', itemIds: ['a', 'b', 'b'] }
    const result = deriveScopeProgress(scope, new Map([
      ['a', progress('a', { attempts: 1, mastered: true })],
      ['b', progress('b', { attempts: 2, mastered: false })],
    ]))

    expect(result).toEqual({
      scopeId: 'geo:world',
      totalItems: 2,
      seenItems: 2,
      masteredItems: 1,
      masteryRatio: 0.5,
      mastered: false,
    })
  })
})

describe('shared scheduler', () => {
  it('keeps an immediate repeat out when another item is available', () => {
    expect(selectNextItem({
      candidates: ['pi:pair:1', 'geo:capital:NO:country-to-capital'],
      recentHistory: ['pi:pair:1'],
    })).toBe('geo:capital:NO:country-to-capital')
  })

  it('prioritizes an unfinished item over mastered items', () => {
    const result = selectNextItem({
      candidates: ['mastered', 'straggler'],
      progress: new Map([
        ['mastered', progress('mastered', { attempts: 4, mastered: true })],
        ['straggler', progress('straggler', { attempts: 4, mastered: false })],
      ]),
    })
    expect(result).toBe('straggler')
  })

  it('balances equally performing items by recent exposure', () => {
    const selected = selectNextItem({
      candidates: ['a', 'b', 'c'],
      recentHistory: ['a', 'a', 'b'],
    })
    expect(selected).toBe('c')
  })
})
