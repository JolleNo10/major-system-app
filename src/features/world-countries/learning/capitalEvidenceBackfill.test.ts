import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  applyWorldCountriesCapitalBackfill,
  planWorldCountriesCapitalBackfill,
} from './capitalEvidenceBackfill'
import { recallTargetIdFor } from './recallTargets'
import {
  markSubregionCapitalsLearned,
  markSubregionCountriesLearned,
} from './subregionLearningStore'

const attemptsMock = vi.hoisted(() => ({ value: [] as Array<{ itemId: string } & Record<string, unknown>> }))
const recordAttemptMock = vi.hoisted(() => vi.fn(
  (_itemId: string, _attempt: Record<string, unknown>, _options?: unknown) => Promise.resolve(),
))
const strictWriteState = vi.hoisted(() => ({ reject: false, failOnCall: null as number | null, calls: 0 }))
const recordAttemptOrThrowMock = vi.hoisted(() => vi.fn(
  async (itemId: string, attempt: Record<string, unknown>) => {
    strictWriteState.calls += 1
    if (strictWriteState.reject || strictWriteState.calls === strictWriteState.failOnCall) {
      throw new Error('capital backfill write failed')
    }
    attemptsMock.value.push({ itemId, ...attempt })
  },
))
vi.mock('@/core/learning', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/learning')>()),
  getAllAttemptsOrThrow: () => Promise.resolve(attemptsMock.value),
  recordAttempt: recordAttemptMock,
  recordAttemptOrThrow: recordAttemptOrThrowMock,
}))

const activeCountries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'PL', country: 'Poland', capital: 'Warsaw', continent: 'Europe', subregionId: 'central-europe', subregion: 'Central Europe' },
]

// Local noon keeps the derived learner-local date stable across time zones.
const learnedAt = new Date(2026, 8, 12, 12, 0, 0).getTime()

beforeEach(() => {
  attemptsMock.value = []
  strictWriteState.reject = false
  strictWriteState.failOnCall = null
  strictWriteState.calls = 0
})

afterEach(() => {
  localStorage.clear()
  recordAttemptMock.mockClear()
  recordAttemptOrThrowMock.mockClear()
})

describe('World Countries Capital evidence backfill', () => {
  it('plans one reconstruction per Country in each Subregion with a Capital milestone', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)

    const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

    expect(plan.pending.map(entry => entry.countryId)).toEqual(['NO', 'SE'])
    expect(plan.subregionLabels).toEqual(['Northern Europe'])
    expect(plan.pending[0]).toMatchObject({ localDate: '2026-09-12', learnedAt, action: 'write' })
  })

  it('ignores a Subregion that only has the Countries milestone', async () => {
    markSubregionCountriesLearned('central-europe', learnedAt, activeCountries)

    const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

    expect(plan.entries).toEqual([])
  })

  it('writes nothing on a second run', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)

    const first = await applyWorldCountriesCapitalBackfill({ activeCountries })
    expect(first).toMatchObject({ written: 2, alreadyRecorded: 0 })
    expect(recordAttemptOrThrowMock).toHaveBeenCalledTimes(2)
    expect(recordAttemptMock).not.toHaveBeenCalled()
    expect(recordAttemptOrThrowMock.mock.calls[0]?.[0]).toBe(recallTargetIdFor('NO', 'country-to-capital'))
    expect(recordAttemptOrThrowMock.mock.calls[0]?.[1]).toMatchObject({
      at: learnedAt,
      ok: true,
      evidenceKind: 'recall',
      localDate: '2026-09-12',
      attemptType: 'learning',
    })

    recordAttemptOrThrowMock.mockClear()

    const second = await applyWorldCountriesCapitalBackfill({ activeCountries })

    expect(second).toMatchObject({ written: 0, alreadyRecorded: 2 })
    expect(recordAttemptOrThrowMock).not.toHaveBeenCalled()
  })

  it('still reconstructs a Country whose existing Capital evidence is on another date', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
    attemptsMock.value = [{
      itemId: recallTargetIdFor('NO', 'country-to-capital'),
      at: learnedAt,
      ok: true,
      ms: 2000,
      evidenceKind: 'recall',
      localDate: '2026-09-15',
    }]

    const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

    expect(plan.pending.map(entry => entry.countryId)).toEqual(['NO', 'SE'])
  })

  it('does not reconstruct over a failed attempt recorded on the milestone date', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
    attemptsMock.value = [{
      itemId: recallTargetIdFor('NO', 'country-to-capital'),
      at: learnedAt,
      ok: false,
      ms: 2000,
      evidenceKind: 'recall',
      localDate: '2026-09-12',
    }]

    const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

    expect(plan.pending.map(entry => entry.countryId)).toEqual(['NO', 'SE'])
  })

  it.each(['review', 'strengthen', 'drill', 'legacy', undefined] as const)(
    'still reconstructs over same-day %s evidence',
    async attemptType => {
      markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
      attemptsMock.value = [{
        itemId: recallTargetIdFor('NO', 'country-to-capital'),
        at: learnedAt,
        ok: true,
        ms: 2000,
        evidenceKind: 'recall',
        localDate: '2026-09-12',
        ...(attemptType === undefined ? {} : { attemptType }),
      }]

      const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

      expect(plan.pending.map(entry => entry.countryId)).toEqual(['NO', 'SE'])
    },
  )

  it('recognizes reconstructed Learning evidence on the second run', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
    attemptsMock.value = ['NO', 'SE'].map(countryId => ({
      itemId: recallTargetIdFor(countryId, 'country-to-capital'),
      at: learnedAt,
      ok: true,
      ms: Number.NaN,
      evidenceKind: 'recall',
      localDate: '2026-09-12',
      attemptType: 'learning',
    }))

    const plan = await planWorldCountriesCapitalBackfill({ activeCountries })

    expect(plan.pending).toEqual([])
    expect(plan.entries.every(entry => entry.action === 'already-recorded')).toBe(true)
  })

  it('rejects failed strict reconstruction and completes it on a later retry', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
    strictWriteState.reject = true

    await expect(applyWorldCountriesCapitalBackfill({ activeCountries }))
      .rejects.toThrow('capital backfill write failed')
    expect(attemptsMock.value).toEqual([])

    strictWriteState.reject = false
    const retry = await applyWorldCountriesCapitalBackfill({ activeCountries })
    const repeated = await applyWorldCountriesCapitalBackfill({ activeCountries })

    expect(retry).toMatchObject({ written: 2, alreadyRecorded: 0 })
    expect(repeated).toMatchObject({ written: 0, alreadyRecorded: 2 })
    expect(attemptsMock.value.filter(attempt => attempt.attemptType === 'learning')).toHaveLength(2)
  })

  it('resumes after a later row fails without duplicating the earlier row', async () => {
    markSubregionCapitalsLearned('northern-europe', learnedAt, activeCountries)
    strictWriteState.failOnCall = 2

    await expect(applyWorldCountriesCapitalBackfill({ activeCountries }))
      .rejects.toThrow('capital backfill write failed')
    expect(attemptsMock.value.map(attempt => attempt.itemId)).toEqual([
      recallTargetIdFor('NO', 'country-to-capital'),
    ])

    strictWriteState.failOnCall = null
    const retry = await applyWorldCountriesCapitalBackfill({ activeCountries })

    expect(retry).toMatchObject({ written: 1, alreadyRecorded: 1 })
    expect(attemptsMock.value.map(attempt => attempt.itemId)).toEqual([
      recallTargetIdFor('NO', 'country-to-capital'),
      recallTargetIdFor('SE', 'country-to-capital'),
    ])
  })
})
