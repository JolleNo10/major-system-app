import { describe, expect, it, vi } from 'vitest'

const addAttemptRawMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const rewriteAttemptsForKeyMock = vi.hoisted(() => vi.fn(async (_key: string, _rewrite: unknown) => undefined))
const getStoredAttemptsMock = vi.hoisted(() => vi.fn(async () => ([
  {
    key: 'world-countries:country-to-capital:NO',
    at: 1,
    ok: true,
    ms: 400,
    evidenceKind: 'recall' as const,
    localDate: '2026-08-10',
  },
])))

vi.mock('@/core/scoring/attemptStore', () => ({
  addAttemptRaw: addAttemptRawMock,
  getAllAttempts: getStoredAttemptsMock,
  getAllAttemptsOrThrow: getStoredAttemptsMock,
  getAttemptsForKey: vi.fn(() => Promise.resolve([])),
  rewriteAttemptsForKey: rewriteAttemptsForKeyMock,
}))

import { getAllAttempts, recordAttempt, rewriteAttemptsForItem } from './attempts'

describe('shared learning evidence adapter', () => {
  it('preserves generic evidence metadata through the shared adapter', async () => {
    await recordAttempt('world-countries:country-to-capital:NO', {
      at: 1,
      ok: true,
      ms: 400,
      evidenceKind: 'recall',
      localDate: '2026-08-10',
    })
    expect(addAttemptRawMock).toHaveBeenCalledWith(
      'world-countries:country-to-capital:NO',
      expect.objectContaining({ evidenceKind: 'recall', localDate: '2026-08-10' }),
    )

    await expect(getAllAttempts()).resolves.toEqual([{
      itemId: 'world-countries:country-to-capital:NO',
      at: 1,
      ok: true,
      ms: 400,
      evidenceKind: 'recall',
      localDate: '2026-08-10',
    }])
  })

  it('preserves opaque activity provenance through the shared adapter', async () => {
    await recordAttempt('world-countries:country-to-capital:NO', {
      at: 1,
      ok: true,
      ms: 400,
      attemptType: 'review',
    })

    expect(addAttemptRawMock).toHaveBeenCalledWith(
      'world-countries:country-to-capital:NO',
      expect.objectContaining({ attemptType: 'review' }),
    )
  })

  it('exposes an opaque item-keyed rewrite seam', async () => {
    const rewrite = vi.fn((attempt) => ({ ...attempt, attemptType: 'legacy' }))
    await rewriteAttemptsForItem('world-countries:country-to-capital:NO', rewrite)

    expect(rewriteAttemptsForKeyMock).toHaveBeenCalledWith(
      'world-countries:country-to-capital:NO',
      expect.any(Function),
    )
    const callback = rewriteAttemptsForKeyMock.mock.calls[0]?.[1] as unknown as (attempt: unknown, index: number, history: readonly unknown[]) => unknown
    const attempt = { at: 1, ok: true, ms: 400, custom: 'keep' }
    expect(callback(attempt, 0, [attempt])).toEqual({ ...attempt, attemptType: 'legacy' })
  })
})
