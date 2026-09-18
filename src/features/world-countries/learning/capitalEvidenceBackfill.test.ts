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
vi.mock('@/core/learning', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/learning')>()),
  getAllAttemptsOrThrow: () => Promise.resolve(attemptsMock.value),
  recordAttempt: recordAttemptMock,
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
})

afterEach(() => {
  localStorage.clear()
  recordAttemptMock.mockClear()
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
    expect(recordAttemptMock).toHaveBeenCalledTimes(2)
    expect(recordAttemptMock.mock.calls[0]?.[0]).toBe(recallTargetIdFor('NO', 'country-to-capital'))
    expect(recordAttemptMock.mock.calls[0]?.[1]).toMatchObject({
      at: learnedAt,
      ok: true,
      evidenceKind: 'recall',
      localDate: '2026-09-12',
      attemptType: 'learning',
    })

    // The first run's rows are now retained evidence.
    attemptsMock.value = ['NO', 'SE'].map(countryId => ({
      itemId: recallTargetIdFor(countryId, 'country-to-capital'),
      at: learnedAt,
      ok: true,
      ms: Number.NaN,
      evidenceKind: 'recall',
      localDate: '2026-09-12',
    }))
    recordAttemptMock.mockClear()

    const second = await applyWorldCountriesCapitalBackfill({ activeCountries })

    expect(second).toMatchObject({ written: 0, alreadyRecorded: 2 })
    expect(recordAttemptMock).not.toHaveBeenCalled()
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
})
