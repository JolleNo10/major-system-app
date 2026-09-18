import { beforeEach, describe, expect, it, vi } from 'vitest'

const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const recordAttemptOrThrowMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@/core/learning', () => ({
  getAllAttempts: vi.fn(() => Promise.resolve([])),
  getAllAttemptsOrThrow: vi.fn(() => Promise.resolve([])),
  recordAttempt: recordAttemptMock,
  recordAttemptOrThrow: recordAttemptOrThrowMock,
}))

import { recordWorldCountriesAttempt, recordWorldCountriesAttemptOrThrow } from './recallProgress'

describe('World Countries attempt evidence adapter', () => {
beforeEach(() => {
  recordAttemptMock.mockClear()
  recordAttemptOrThrowMock.mockClear()
})

  it('persists the cognitive evidence kind and answer-time local date', async () => {
    await recordWorldCountriesAttempt('NO', 'country-to-capital', {
      at: Date.UTC(2026, 7, 10, 18),
      ok: true,
      ms: 1200,
      attemptType: 'review',
      evidenceKind: 'recognition',
      localDate: '2026-08-10',
    })

    expect(recordAttemptMock).toHaveBeenCalledWith(
      'world-countries:country-to-capital:NO',
      expect.objectContaining({
        evidenceKind: 'recognition',
        attemptType: 'review',
        localDate: '2026-08-10',
      }),
      { pruneHistory: false },
    )
  })

  it('does not promote records with omitted evidence kind to mastery evidence', async () => {
    await recordWorldCountriesAttempt('NO', 'location-to-country', {
      at: Date.UTC(2026, 7, 10, 18),
      ok: true,
      ms: 1200,
      attemptType: 'learning',
      localDate: '2026-08-10',
    })

    expect(recordAttemptMock).toHaveBeenCalledWith(
      'world-countries:location-to-country:NO',
      expect.not.objectContaining({ evidenceKind: 'recall' }),
      { pruneHistory: false },
    )
    expect(recordAttemptMock).toHaveBeenCalledWith(
      'world-countries:location-to-country:NO',
      expect.objectContaining({ localDate: '2026-08-10' }),
      { pruneHistory: false },
    )
  })

  it('uses the strict writer with the same normalized attempt shape', async () => {
    const input = {
      at: Date.UTC(2026, 7, 10, 18),
      ok: true,
      ms: 1200,
      attemptType: 'learning' as const,
      evidenceKind: 'recall' as const,
    }

    await recordWorldCountriesAttemptOrThrow('NO', 'location-to-country', input)

    expect(recordAttemptOrThrowMock).toHaveBeenCalledWith(
      'world-countries:location-to-country:NO',
      expect.objectContaining({
        ...input,
        localDate: '2026-08-10',
      }),
      { pruneHistory: false },
    )
    expect(recordAttemptMock).not.toHaveBeenCalled()
  })
})
