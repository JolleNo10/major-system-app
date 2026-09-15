import { afterEach, describe, expect, it, vi } from 'vitest'
import { deriveWorldCountriesAtomicProgress } from './recallMastery'
import { recallTargetIdFor } from './recallTargets'
import {
  WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS,
  recordWorldCountriesFinalRecallAnswer,
  recordWorldCountriesFinalRecallPass,
} from './finalRecallEvidence'

const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/core/learning', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/learning')>()),
  recordAttempt: recordAttemptMock,
}))

afterEach(() => {
  recordAttemptMock.mockClear()
})

describe('World Countries Final recall evidence', () => {
  it('records one successful recall per Country in the skipped scope', async () => {
    await recordWorldCountriesFinalRecallPass(['NO', 'SE', 'DK'], 'country-to-capital', Date.parse('2026-09-12T10:00:00Z'))

    expect(recordAttemptMock.mock.calls.map(([itemId]) => itemId)).toEqual([
      recallTargetIdFor('NO', 'country-to-capital'),
      recallTargetIdFor('SE', 'country-to-capital'),
      recallTargetIdFor('DK', 'country-to-capital'),
    ])
    for (const [, attempt] of recordAttemptMock.mock.calls) {
      expect(attempt).toMatchObject({ ok: true, evidenceKind: 'recall' })
      expect(attempt.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not repeat a Country that appears twice in the scope', async () => {
    await recordWorldCountriesFinalRecallPass(['NO', 'NO'], 'location-to-country')

    expect(recordAttemptMock).toHaveBeenCalledTimes(1)
  })

  it('keeps an asserted pass out of median latency while still qualifying for mastery', () => {
    const itemId = recallTargetIdFor('NO', 'country-to-capital')
    const progress = deriveWorldCountriesAtomicProgress(itemId, [
      { at: 1, ok: true, ms: WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS, evidenceKind: 'recall', localDate: '2026-09-12' },
      { at: 2, ok: true, ms: 2000, evidenceKind: 'recall', localDate: '2026-09-13' },
      { at: 3, ok: true, ms: 3000, evidenceKind: 'recall', localDate: '2026-09-14' },
    ])

    expect(progress.medianMs).toBe(2500)
    expect(progress.proficiency).toBe('mastered')
  })

  it('records a measured Final recall answer with its real latency', async () => {
    await recordWorldCountriesFinalRecallAnswer('NO', 'country-to-capital', false, 4321)

    expect(recordAttemptMock).toHaveBeenCalledWith(
      recallTargetIdFor('NO', 'country-to-capital'),
      expect.objectContaining({ ok: false, ms: 4321, evidenceKind: 'recall' }),
      expect.anything(),
    )
  })
})
