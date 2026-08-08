import type { Attempt, RecallItemId } from './types'
import { defaultMasteryPolicy, type MasteryPolicy } from './mastery'

export const DEFAULT_RECENT_ATTEMPTS = 3

export interface ItemProgress {
  itemId: RecallItemId

  attempts: number
  correct: number
  wrong: number

  recentCorrect: number
  consecutiveCorrect: number

  lastAttemptAt: number | null
  medianMs: number | null

  mastered: boolean
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/** Derive all item state from historical atomic evidence. */
export function deriveItemProgress(
  itemId: RecallItemId,
  inputAttempts: readonly Attempt[],
  policy: MasteryPolicy = defaultMasteryPolicy,
): ItemProgress {
  const attempts = [...inputAttempts].sort((a, b) => a.at - b.at)
  const correct = attempts.filter(attempt => attempt.ok).length
  const wrong = attempts.length - correct
  const recent = attempts.slice(-DEFAULT_RECENT_ATTEMPTS)

  let consecutiveCorrect = 0
  for (let index = attempts.length - 1; index >= 0 && attempts[index].ok; index--) {
    consecutiveCorrect++
  }

  const progressWithoutMastery: ItemProgress = {
    itemId,
    attempts: attempts.length,
    correct,
    wrong,
    recentCorrect: recent.filter(attempt => attempt.ok).length,
    consecutiveCorrect,
    lastAttemptAt: attempts.length ? attempts[attempts.length - 1].at : null,
    medianMs: median(
      attempts
        .map(attempt => attempt.ms)
        .filter(ms => Number.isFinite(ms) && ms >= 0),
    ),
    mastered: false,
  }

  return {
    ...progressWithoutMastery,
    mastered: policy.isMastered(progressWithoutMastery),
  }
}

export function emptyItemProgress(
  itemId: RecallItemId,
  policy: MasteryPolicy = defaultMasteryPolicy,
): ItemProgress {
  return deriveItemProgress(itemId, [], policy)
}
