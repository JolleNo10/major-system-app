// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'

const stored = vi.hoisted(() => ({ attempts: [] as Array<Record<string, unknown>> }))
const getAllAttemptsMock = vi.hoisted(() => vi.fn(async () => stored.attempts.map(attempt => ({ ...attempt }))))
const strictWriteState = vi.hoisted(() => ({ reject: false }))
const recordAttemptOrThrowMock = vi.hoisted(() => vi.fn(async (itemId: string, attempt: Record<string, unknown>) => {
  if (strictWriteState.reject) throw new Error('synthetic write failed')
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
  recordAttemptOrThrow: recordAttemptOrThrowMock,
  rewriteAttemptsForItem: rewriteAttemptsForItemMock,
}))

import { getAllSubregionLearningStates } from './subregionLearningStore'
import { migrateWorldCountriesAttemptProvenance } from './attemptTypeMigration'
import { recallTargetIdFor } from './recallTargets'

const norway = countries.find(country => country.id === 'NO')!
const iceland = countries.find(country => country.id === 'IS')!
const sweden = countries.find(country => country.id === 'SE')!
const finland = countries.find(country => country.id === 'FI')!
const milestoneAt = Date.parse('2026-08-10T12:00:00Z')
const milestoneDate = '2026-08-10'

function setLearningState(
  fields: Record<string, number>,
  currentCountryIds = ['NO'],
  history: Record<string, Record<string, number>> = {},
): void {
  const countryFingerprint = currentCountryIds.slice().sort().join('|')
  localStorage.setItem('world-countries-subregion-learning', JSON.stringify([
    { subregionId: norway.subregionId, ...fields },
  ]))
  localStorage.setItem('world-countries-subregion-learning-membership', JSON.stringify({
    [norway.subregionId]: { current: countryFingerprint, history },
  }))
}

function attemptRows(countryId: string, skill: 'location-to-country' | 'country-to-capital') {
  return stored.attempts.filter(attempt => attempt.itemId === recallTargetIdFor(countryId, skill))
}

beforeEach(() => {
  stored.attempts = []
  strictWriteState.reject = false
  localStorage.clear()
  vi.clearAllMocks()
})

describe('World Countries attempt provenance migration', () => {
  it('types untyped recognized rows conservatively and leaves other IDs untouched', async () => {
    const itemId = recallTargetIdFor('NO', 'location-to-country')
    const other = { itemId: 'enc:42', at: 3, ok: true, ms: 10, custom: 'keep' }
    const unknownCountry = { itemId: 'world-countries:location-to-country:ZZ', at: 5, ok: true, ms: 10 }
    stored.attempts.push(
      { itemId, at: milestoneAt - 86_400_000, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-09' },
      { itemId, at: milestoneAt - 60 * 60 * 1000, ok: true, ms: 100, evidenceKind: 'recall', localDate: milestoneDate },
      { itemId, at: milestoneAt + 86_400_000, ok: false, ms: 100, localDate: '2026-08-11' },
      other,
      unknownCountry,
    )
    setLearningState({ countriesLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptProvenance()
    const targetRows = attemptRows('NO', 'location-to-country')

    expect(result.rewritten).toBe(3)
    expect(targetRows.map(attempt => attempt.attemptType)).toEqual(['legacy', 'learning', 'legacy'])
    expect(stored.attempts.find(attempt => attempt.itemId === 'enc:42')).toEqual(other)
    expect(stored.attempts.find(attempt => attempt.itemId === unknownCountry.itemId)).toEqual(unknownCountry)
  })

  it('preserves typed rows and excludes recognition from Learning recovery', async () => {
    const itemId = recallTargetIdFor('NO', 'location-to-country')
    stored.attempts.push(
      { itemId, at: milestoneAt, ok: true, ms: 100, evidenceKind: 'recognition', localDate: milestoneDate },
      { itemId, at: milestoneAt + 1, ok: true, ms: 100, attemptType: 'review', evidenceKind: 'recall', localDate: milestoneDate },
    )
    setLearningState({ countriesLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptProvenance()

    expect(result.alreadyTyped).toBe(1)
    expect(attemptRows('NO', 'location-to-country').map(attempt => attempt.attemptType)).toEqual(['legacy', 'review', 'learning'])
  })

  it('synthesizes one strict Learning row for each core milestone', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt, capitalsLearnedAt: milestoneAt })

    const result = await migrateWorldCountriesAttemptProvenance()

    expect(result.synthetic).toBe(2)
    expect(stored.attempts).toHaveLength(2)
    expect(stored.attempts).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: recallTargetIdFor('NO', 'location-to-country'), ok: true, ms: Number.NaN, evidenceKind: 'recall', localDate: milestoneDate, attemptType: 'learning' }),
      expect.objectContaining({ itemId: recallTargetIdFor('NO', 'country-to-capital'), ok: true, ms: Number.NaN, evidenceKind: 'recall', localDate: milestoneDate, attemptType: 'learning' }),
    ]))
  })

  it('converts the current and every retained membership fingerprint in one run', async () => {
    const earlierMilestone = Date.parse('2026-08-08T12:00:00Z')
    setLearningState(
      { countriesLearnedAt: milestoneAt, capitalsLearnedAt: milestoneAt },
      ['IS', 'NO'],
      { 'FI|SE': { countriesLearnedAt: earlierMilestone, capitalsLearnedAt: earlierMilestone } },
    )

    const result = await migrateWorldCountriesAttemptProvenance()

    expect(result.synthetic).toBe(8)
    expect(['IS', 'NO', 'FI', 'SE'].every(countryId =>
      attemptRows(countryId, 'location-to-country').some(attempt => attempt.attemptType === 'learning'),
    )).toBe(true)
    expect(['IS', 'NO', 'FI', 'SE'].every(countryId =>
      attemptRows(countryId, 'country-to-capital').some(attempt => attempt.attemptType === 'learning'),
    )).toBe(true)

    const attemptsReadDuringMigration = getAllAttemptsMock.mock.calls.length
    getAllSubregionLearningStates([norway])
    getAllSubregionLearningStates([iceland, norway])
    expect(getAllAttemptsMock).toHaveBeenCalledTimes(attemptsReadDuringMigration)
    expect(['IS', 'NO', 'FI', 'SE'].every(countryId =>
      attemptRows(countryId, 'location-to-country').some(attempt => attempt.attemptType === 'learning'),
    )).toBe(true)
  })

  it('recovers only the latest eligible attempt across all milestones for one item', async () => {
    const earlierMilestone = Date.parse('2026-08-08T12:00:00Z')
    const laterMilestone = Date.parse('2026-08-12T12:00:00Z')
    const itemId = recallTargetIdFor('NO', 'location-to-country')
    stored.attempts.push(
      { itemId, at: earlierMilestone - 60 * 60 * 1000, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-08' },
      { itemId, at: laterMilestone - 60 * 60 * 1000, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-12' },
    )
    setLearningState(
      { countriesLearnedAt: laterMilestone },
      ['IS', 'NO'],
      { 'NO|SE': { countriesLearnedAt: earlierMilestone } },
    )

    await migrateWorldCountriesAttemptProvenance()

    expect(attemptRows('NO', 'location-to-country').map(attempt => attempt.attemptType)).toEqual(['legacy', 'learning'])
  })

  it('uses the earliest applicable milestone for synthetic Learning evidence', async () => {
    const earlierMilestone = Date.parse('2026-08-08T12:00:00Z')
    const laterMilestone = Date.parse('2026-08-12T12:00:00Z')
    setLearningState(
      { countriesLearnedAt: laterMilestone },
      ['IS', 'NO'],
      { 'NO|SE': { countriesLearnedAt: earlierMilestone } },
    )

    await migrateWorldCountriesAttemptProvenance()

    const norwayLearning = attemptRows('NO', 'location-to-country').find(attempt => attempt.attemptType === 'learning')
    expect(norwayLearning?.at).toBe(earlierMilestone)
    expect(norwayLearning?.localDate).toBe('2026-08-08')
  })

  it('does not manufacture Country identity from malformed retained fingerprints', async () => {
    localStorage.setItem('world-countries-subregion-learning', JSON.stringify([
      { subregionId: norway.subregionId, countriesLearnedAt: milestoneAt },
    ]))
    localStorage.setItem('world-countries-subregion-learning-membership', JSON.stringify({
      [norway.subregionId]: {
        current: 'ZZ|NO',
        history: {
          'IS|NO|NO': { countriesLearnedAt: milestoneAt },
          'NO|TR': { capitalsLearnedAt: milestoneAt },
          'NO|ZZ': { countriesLearnedAt: milestoneAt },
        },
      },
    }))

    const result = await migrateWorldCountriesAttemptProvenance()

    expect(result.synthetic).toBe(0)
    expect(stored.attempts).toHaveLength(0)
  })

  it('succeeds without writes for an empty profile', async () => {
    const result = await migrateWorldCountriesAttemptProvenance()

    expect(result).toEqual({ rewritten: 0, synthetic: 0, alreadyTyped: 0 })
    expect(stored.attempts).toHaveLength(0)
    expect(recordAttemptOrThrowMock).not.toHaveBeenCalled()
  })

  it('serializes overlapping runs so synthetic writes remain idempotent', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt })

    const [first, second] = await Promise.all([
      migrateWorldCountriesAttemptProvenance(),
      migrateWorldCountriesAttemptProvenance(),
    ])

    expect([first.synthetic, second.synthetic].sort()).toEqual([0, 1])
    expect(stored.attempts).toHaveLength(1)
  })

  it('rejects a failed strict synthetic write and completes it on retry', async () => {
    setLearningState({ countriesLearnedAt: milestoneAt })
    strictWriteState.reject = true

    await expect(migrateWorldCountriesAttemptProvenance()).rejects.toThrow('synthetic write failed')
    expect(stored.attempts).toHaveLength(0)

    strictWriteState.reject = false
    const retry = await migrateWorldCountriesAttemptProvenance()
    const repeated = await migrateWorldCountriesAttemptProvenance()

    expect(retry.synthetic).toBe(1)
    expect(repeated.synthetic).toBe(0)
    expect(attemptRows('NO', 'location-to-country')).toHaveLength(1)
  })
})
