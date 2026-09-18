// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  addAttemptRaw,
  addAttemptRawOrThrow,
  getAllAttempts,
  getAllAttemptsOrThrow,
} from './attemptStore'

describe('attempt store without IndexedDB', () => {
  it('rejects strict APIs while best-effort APIs fall back', async () => {
    const attempt = { at: 1, ok: true, ms: 100 }

    await expect(addAttemptRawOrThrow('strict-no-idb', attempt))
      .rejects.toThrow('IndexedDB is unavailable')
    await expect(getAllAttemptsOrThrow())
      .rejects.toThrow('IndexedDB is unavailable')
    await expect(addAttemptRaw('best-effort-no-idb', attempt)).resolves.toBeUndefined()
    await expect(getAllAttempts()).resolves.toEqual([])
  })
})
