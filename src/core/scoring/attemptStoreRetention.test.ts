import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DAY_MS, HISTORY_MAX, HISTORY_RETENTION_DAYS } from './itemStore'
import { addAttemptRaw, getAttemptsForKey, shouldPruneAttemptHistory } from './attemptStore'

let testKey = 0

function uniqueKey(prefix: string): string {
  testKey += 1
  return `${prefix}:${testKey}`
}

async function addAttempts(key: string, count: number, at: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await addAttemptRaw(key, { at: at + index, ok: true, ms: 100 })
  }
}

describe('attempt history retention policy', () => {
  it('keeps generic history pruning enabled by default', () => {
    expect(shouldPruneAttemptHistory()).toBe(true)
    expect(shouldPruneAttemptHistory({ pruneHistory: true })).toBe(true)
  })

  it('allows a caller with durable evidence semantics to retain full history', () => {
    expect(shouldPruneAttemptHistory({ pruneHistory: false })).toBe(false)
  })

  it('prunes an attempt older than the generic retention window', async () => {
    const key = uniqueKey('generic-age')
    const now = Date.now()
    await addAttemptRaw(key, {
      at: now - (HISTORY_RETENTION_DAYS + 1) * DAY_MS,
      ok: true,
      ms: 100,
    }, { pruneHistory: false })
    await addAttemptRaw(key, { at: now, ok: true, ms: 100 })

    expect(await getAttemptsForKey(key)).toHaveLength(1)
  })

  it('removes the oldest generic attempt after the 201st write', async () => {
    const key = uniqueKey('generic-cap')
    const now = Date.now()
    await addAttempts(key, HISTORY_MAX + 1, now)

    const attempts = await getAttemptsForKey(key)
    expect(attempts).toHaveLength(HISTORY_MAX)
    expect(attempts.some(attempt => attempt.at === now)).toBe(false)
  })
})
