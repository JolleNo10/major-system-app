import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DAY_MS, HISTORY_MAX, HISTORY_RETENTION_DAYS } from './itemStore'
import { addAttemptRaw, addAttemptRawOrThrow, getAttemptsForKey, getDb, reqToPromise, rewriteAttemptsForKey, shouldPruneAttemptHistory } from './attemptStore'

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

  it('strictly appends a record while preserving opaque metadata', async () => {
    const key = uniqueKey('strict-append')
    await addAttemptRawOrThrow(key, {
      at: 10,
      ok: true,
      ms: 100,
      attemptType: 'learning',
      custom: { source: 'migration' },
    } as Parameters<typeof addAttemptRawOrThrow>[1] & Record<string, unknown>, { pruneHistory: false })

    await expect(getAttemptsForKey(key)).resolves.toEqual([expect.objectContaining({
      at: 10,
      ok: true,
      ms: 100,
      attemptType: 'learning',
      custom: { source: 'migration' },
    })])
  })

  it('propagates a write failure only through the strict append API', async () => {
    const invalidAttempt = {
      at: undefined,
      ok: true,
      ms: 100,
    } as unknown as Parameters<typeof addAttemptRawOrThrow>[1]

    await expect(addAttemptRawOrThrow(uniqueKey('strict-failure'), invalidAttempt))
      .rejects.toBeDefined()
    await expect(addAttemptRaw(uniqueKey('best-effort-failure'), invalidAttempt)).resolves.toBeUndefined()
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

  it('rewrites only one key while preserving IDs, order, and arbitrary metadata', async () => {
    const selectedKey = uniqueKey('rewrite-selected')
    const otherKey = uniqueKey('rewrite-other')
    await addAttemptRaw(selectedKey, { at: 1, ok: true, ms: 100, custom: { source: 'keep' } } as Parameters<typeof addAttemptRaw>[1] & Record<string, unknown>)
    await addAttemptRaw(selectedKey, { at: 2, ok: false, ms: 200, evidenceKind: 'recognition' } as Parameters<typeof addAttemptRaw>[1] & Record<string, unknown>)
    await addAttemptRaw(otherKey, { at: 3, ok: true, ms: 300, custom: 'untouched' } as Parameters<typeof addAttemptRaw>[1] & Record<string, unknown>)

    const before = await reqToPromise(await getDb().then(db => db.transaction('attempts', 'readonly').objectStore('attempts').getAll()))
    const selectedBefore = before.filter(record => record.key === selectedKey)
    const otherBefore = before.filter(record => record.key === otherKey)

    await rewriteAttemptsForKey(selectedKey, (attempt, index) => ({
      attemptType: index === 0 ? 'learning' : 'legacy',
      customRewrite: true,
    }))

    const after = await reqToPromise(await getDb().then(db => db.transaction('attempts', 'readonly').objectStore('attempts').getAll()))
    const selectedAfter = after.filter(record => record.key === selectedKey)
    const otherAfter = after.filter(record => record.key === otherKey)

    expect(selectedAfter).toHaveLength(2)
    expect(selectedAfter.map(record => record.id)).toEqual(selectedBefore.map(record => record.id))
    expect(selectedAfter.map(record => record.at)).toEqual([1, 2])
    expect(selectedAfter[0]).toMatchObject({ attemptType: 'learning', custom: { source: 'keep' }, customRewrite: true })
    expect(selectedAfter[1]).toMatchObject({ attemptType: 'legacy', evidenceKind: 'recognition', customRewrite: true })
    expect(otherAfter).toEqual(otherBefore)
  })
})
