// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'

const stored = vi.hoisted(() => ({ attempts: [] as Array<Record<string, unknown>> }))
const getAllAttemptsMock = vi.hoisted(() => vi.fn(async () => stored.attempts.map(attempt => ({ ...attempt }))))
const recordAttemptMock = vi.hoisted(() => vi.fn(async (itemId: string, attempt: Record<string, unknown>) => {
  stored.attempts.push({ itemId, ...attempt })
}))
const rewriteAttemptsForItemMock = vi.hoisted(() => vi.fn(async (
  itemId: string,
  rewrite: (attempt: Record<string, unknown>, index: number, history: readonly Record<string, unknown>[]) => Record<string, unknown> | void,
) => {
  const rows = stored.attempts
    .filter(attempt => attempt.itemId === itemId)
    .sort((left, right) => Number(left.at) - Number(right.at))
  const history = rows.map(({ itemId: _itemId, ...attempt }) => attempt)
  rows.forEach((row, index) => {
    const update = rewrite(history[index]!, index, history)
    if (update) Object.assign(row, update)
  })
}))

vi.mock('@/core/learning', () => ({
  getAllAttemptsOrThrow: getAllAttemptsMock,
  recordAttempt: recordAttemptMock,
  rewriteAttemptsForItem: rewriteAttemptsForItemMock,
}))

vi.mock('./subregionLearningStore', () => ({
  getAllSubregionLearningStates: (activeCountries: readonly unknown[]) => activeCountries.length > 0
    ? JSON.parse(localStorage.getItem('world-countries-subregion-learning') ?? '[]')
    : [],
}))

import { migrateWorldCountriesAttemptTypes } from './attemptTypeMigration'
import { recallTargetIdFor } from './recallTargets'

const norway = countries.find(country => country.id === 'NO')!
const milestoneAt = Date.parse('2026-08-10T12:00:00Z')
const milestoneDate = '2026-08-10'

function setLearningState(fields: Record<string, number>): void {
  localStorage.setItem('world-countries-subregion-learning', JSON.stringify([
    { subregionId: norway.subregionId, ...fields },
  ]))
}

beforeEach(() => {
  stored.attempts = []
  localStorage.clear()
  vi.clearAllMocks()
})

describe('World Countries attempt provenance migration', () => {
  it('types every untyped World Countries row while leaving other namespaces untouched', async () => {
    const itemId = recallTargetIdFor('NO', 'location-to-country')
    const other = { itemId: 'enc:42', at: 3, ok: true, ms: 10, custom: 'keep' }
    stored.attempts.push(
      { itemId, at: milestoneAt - 86_400_000, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-09' },
      { itemId, at: milestoneAt - 60 * 60 * 1000, ok: true, ms: 100, evidenceKind: 'recall', localDate: milestoneDate },
      { itemId, at: milestoneAt + 86_400_000, ok: false, ms: 100, localDate: '2026-08-11' },
      other,
    )
    setLearningState({ countriesLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptTypes({ activeCountries: [norway] })
    const targetRows = stored.attempts.filter(attempt => attempt.itemId === itemId)

    expect(result.rewritten).toBe(3)
    expect(targetRows.map(attempt => attempt.attemptType)).toEqual(['legacy', 'learning', 'legacy'])
    expect(stored.attempts.find(attempt => attempt.itemId === 'enc:42')).toEqual(other)
  })

  it('does not rewrite already typed rows or select recognition as Learning evidence', async () => {
    const itemId = recallTargetIdFor('NO', 'location-to-country')
    stored.attempts.push(
      { itemId, at: milestoneAt, ok: true, ms: 100, evidenceKind: 'recognition', localDate: milestoneDate },
      { itemId, at: milestoneAt + 1, ok: true, ms: 100, attemptType: 'review', evidenceKind: 'recall', localDate: milestoneDate },
    )
    setLearningState({ countriesLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptTypes({ activeCountries: [norway] })

    expect(result.alreadyTyped).toBe(1)
    expect(stored.attempts.filter(attempt => attempt.itemId === itemId).map(attempt => attempt.attemptType)).toEqual(['legacy', 'review', 'learning'])
    expect(stored.attempts.filter(attempt => attempt.itemId === itemId).some(attempt => attempt.attemptType === 'learning')).toBe(true)
  })

  it('writes one synthetic Learning row for each applicable core milestone', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt, capitalsLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptTypes({ activeCountries: [norway] })
    const rows = stored.attempts

    expect(result.synthetic).toBe(2)
    expect(rows).toHaveLength(2)
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: recallTargetIdFor('NO', 'location-to-country'), ok: true, ms: Number.NaN, evidenceKind: 'recall', localDate: milestoneDate, attemptType: 'learning' }),
      expect.objectContaining({ itemId: recallTargetIdFor('NO', 'country-to-capital'), ok: true, ms: Number.NaN, evidenceKind: 'recall', localDate: milestoneDate, attemptType: 'learning' }),
    ]))
  })

  it('is idempotent and reconciles a restored active membership', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt })

    await migrateWorldCountriesAttemptTypes({ activeCountries: [] })
    expect(stored.attempts).toHaveLength(0)

    const restored = await migrateWorldCountriesAttemptTypes({ activeCountries: [norway] })
    const repeated = await migrateWorldCountriesAttemptTypes({ activeCountries: [norway] })

    expect(restored.synthetic).toBe(1)
    expect(repeated.synthetic).toBe(0)
    expect(stored.attempts).toHaveLength(1)
  })

  it('serializes overlapping runs so synthetic reconciliation stays idempotent', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt })

    const [first, second] = await Promise.all([
      migrateWorldCountriesAttemptTypes({ activeCountries: [norway] }),
      migrateWorldCountriesAttemptTypes({ activeCountries: [norway] }),
    ])

    expect([first.synthetic, second.synthetic].sort()).toEqual([0, 1])
    expect(stored.attempts).toHaveLength(1)
  })
})
