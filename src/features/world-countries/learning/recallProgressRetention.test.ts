import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DAY_MS, HISTORY_MAX, HISTORY_RETENTION_DAYS } from '@/core/scoring/itemStore'
import { getAttemptsForKey } from '@/core/scoring/attemptStore'
import { recordWorldCountriesAttempt } from './recallProgress'

describe('World Countries recall evidence retention', () => {
  it('retains evidence older than the generic window and beyond the generic cap', async () => {
    const key = 'world-countries:location-to-country:NO'
    const now = Date.now()
    const oldAt = now - (HISTORY_RETENTION_DAYS + 1) * DAY_MS

    await recordWorldCountriesAttempt('NO', 'location-to-country', {
      at: oldAt,
      ok: true,
      ms: 100,
      evidenceKind: 'recall',
    })
    for (let index = 0; index <= HISTORY_MAX; index += 1) {
      await recordWorldCountriesAttempt('NO', 'location-to-country', {
        at: now + index,
        ok: true,
        ms: 100,
        evidenceKind: 'recall',
      })
    }

    const attempts = await getAttemptsForKey(key)
    expect(attempts).toHaveLength(HISTORY_MAX + 2)
    expect(attempts[0]?.at).toBe(oldAt)
  })
})
