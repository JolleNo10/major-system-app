import { describe, it, expect } from 'vitest'
import { eligible, noteServed, type RefreshState } from '@/core/scoring/sessionRefresh'
import { REFRESH_BASE_GAP, REFRESH_MAX } from '@/core/scoring/scoring'

const NUMS = ['01', '02', '03', '04', '05']

describe('sessionRefresh scheduler', () => {
  it('schedules the first refresher one base gap after mastery', () => {
    const state = noteServed({}, '01', 3, false, true)
    expect(state['01']).toEqual({ stage: 0, dueAt: 3 + REFRESH_BASE_GAP })
  })

  it('leaves state untouched when the serve did not master the item', () => {
    const state: RefreshState = {}
    expect(noteServed(state, '01', 3, false, false)).toBe(state)
    expect(noteServed(state, '01', 3, true, false)).toBe(state)
  })

  it('expands the gap by ×2 per stage on each refresh', () => {
    let state = noteServed({}, '01', 0, false, true) // stage 0, dueAt 4
    expect(state['01']).toEqual({ stage: 0, dueAt: REFRESH_BASE_GAP })
    state = noteServed(state, '01', 4, true, true) // refresh #1 → stage 1
    expect(state['01']).toEqual({ stage: 1, dueAt: 4 + REFRESH_BASE_GAP * 2 })
    state = noteServed(state, '01', 12, true, true) // refresh #2 → stage 2
    expect(state['01']).toEqual({ stage: 2, dueAt: 12 + REFRESH_BASE_GAP * 4 })
  })

  it('retires an item once it reaches REFRESH_MAX refreshers', () => {
    // Master, then refresh REFRESH_MAX times.
    let state = noteServed({}, '01', 0, false, true)
    let index = state['01'].dueAt
    for (let r = 0; r < REFRESH_MAX; r++) {
      state = noteServed(state, '01', index, true, true)
      index = state['01'].dueAt
    }
    expect(state['01'].stage).toBe(REFRESH_MAX)
    // Retired → filtered out of eligible even when due.
    const mastered = new Set(['01'])
    expect(eligible(NUMS, mastered, state, index)).not.toContain('01')
  })

  it('filters a mastered item that is not yet due out of eligible', () => {
    const state = noteServed({}, '01', 0, false, true) // dueAt = REFRESH_BASE_GAP
    const mastered = new Set(['01'])
    // Before due: dropped.
    expect(eligible(NUMS, mastered, state, REFRESH_BASE_GAP - 1)).not.toContain('01')
    // At/after due: present.
    expect(eligible(NUMS, mastered, state, REFRESH_BASE_GAP)).toContain('01')
  })

  it('keeps unmastered items and unscheduled mastered items eligible', () => {
    const mastered = new Set(['01']) // mastered but never noteServed → no entry
    const out = eligible(NUMS, mastered, {}, 0)
    expect(out).toEqual(NUMS) // nothing dropped
  })
})
