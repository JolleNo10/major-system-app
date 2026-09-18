import {
  addAttemptRaw,
  addAttemptRawOrThrow,
  getAllAttempts as getStoredAttempts,
  getAllAttemptsOrThrow as getStoredAttemptsOrThrow,
  getAttemptsForKey,
  rewriteAttemptsForKey as rewriteStoredAttemptsForKey,
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

/** Record durable evidence while propagating storage failures to the caller. */
export function recordAttemptOrThrow(
  itemId: RecallItemId,
  attempt: Attempt,
  options?: AttemptWriteOptions,
): Promise<void> {
  return options === undefined
    ? addAttemptRawOrThrow(itemId, attempt)
    : addAttemptRawOrThrow(itemId, attempt, options)
}

export const addAttempt = recordAttempt

export function getAttempts(itemId: RecallItemId): Promise<Attempt[]> {
  return getAttemptsForKey(itemId)
}

export const getAttemptsForItem = getAttempts

/** Rewrite one opaque learning item's retained attempts in place. */
export function rewriteAttemptsForItem(
  itemId: RecallItemId,
  rewrite: (
    attempt: Attempt,
    index: number,
    history: readonly Attempt[],
  ) => Partial<Attempt> | void,
): Promise<void> {
  return rewriteStoredAttemptsForKey(itemId, (attempt, index, history) => rewrite(
    attempt,
    index,
    history,
  ))
}

export async function getAllAttempts(): Promise<Array<{ itemId: RecallItemId } & Attempt>> {
  const attempts = await getStoredAttempts()
  return attempts.map(({ key, ...attempt }) => ({ itemId: key, ...attempt }))
}

export async function getAllAttemptsOrThrow(): Promise<Array<{ itemId: RecallItemId } & Attempt>> {
  const attempts = await getStoredAttemptsOrThrow()
  return attempts.map(({ key, ...attempt }) => ({ itemId: key, ...attempt }))
}
