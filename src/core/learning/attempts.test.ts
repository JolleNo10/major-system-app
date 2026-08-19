import { describe, expect, it, vi } from 'vitest'

const addAttemptRawMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
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
}))

import { getAllAttempts, recordAttempt } from './attempts'

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
})
