import {
  addAttemptRaw,
  getAllAttempts as getStoredAttempts,
  getAttemptsForKey,
  type AttemptWriteOptions,
} from '@/core/scoring/attemptStore'
import type { Attempt, RecallItemId } from './types'

/** Record evidence against an atomic learning identity. */
export function recordAttempt(
  itemId: RecallItemId,
  attempt: Attempt,
  options?: AttemptWriteOptions,
): Promise<void> {
  return options === undefined
    ? addAttemptRaw(itemId, attempt)
    : addAttemptRaw(itemId, attempt, options)
}

export const addAttempt = recordAttempt

export function getAttempts(itemId: RecallItemId): Promise<Attempt[]> {
  return getAttemptsForKey(itemId)
}

export const getAttemptsForItem = getAttempts

export async function getAllAttempts(): Promise<Array<{ itemId: RecallItemId } & Attempt>> {
  const attempts = await getStoredAttempts()
  return attempts.map(({ key, ...attempt }) => ({ itemId: key, ...attempt }))
}
