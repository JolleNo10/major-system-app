import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@/core/learning', () => ({
  getAllAttempts: vi.fn(() => Promise.resolve([])),
  recordAttempt: recordAttemptMock,
}))

import { recordWorldCountriesAttempt } from './recallProgress'

describe('World Countries attempt evidence adapter', () => {
  beforeEach(() => recordAttemptMock.mockClear())

  it('persists the cognitive evidence kind and answer-time local date', async () => {
    await recordWorldCountriesAttempt('NO', 'country-to-capital', {
      at: Date.UTC(2026, 7, 10, 18),
      ok: true,
      ms: 1200,
      evidenceKind: 'recognition',
      localDate: '2026-08-10',
    })

    expect(recordAttemptMock).toHaveBeenCalledWith(
      'world-countries:country-to-capital:NO',
      expect.objectContaining({
        evidenceKind: 'recognition',
        localDate: '2026-08-10',
      }),
      { pruneHistory: false },
    )
  })

  it('defaults direct World Countries records to explicit free recall', async () => {
    await recordWorldCountriesAttempt('NO', 'location-to-country', {
      at: Date.UTC(2026, 7, 10, 18),
      ok: true,
      ms: 1200,
      localDate: '2026-08-10',
    })

    expect(recordAttemptMock).toHaveBeenCalledWith(
      'world-countries:location-to-country:NO',
      expect.objectContaining({ evidenceKind: 'recall', localDate: '2026-08-10' }),
      { pruneHistory: false },
    )
  })
})
