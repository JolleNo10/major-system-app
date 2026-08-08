import type { ItemProgress } from './itemProgress'
import type { RecallItemId } from './types'

export type ProgressLookup =
  | ReadonlyMap<RecallItemId, ItemProgress>
  | Readonly<Record<string, ItemProgress>>

export interface SelectNextItemInput {
  candidates: readonly RecallItemId[]
  progress?: ProgressLookup
  /** IDs most recently shown, oldest first. */
  recentHistory?: readonly RecallItemId[]
  now?: number
  rng?: () => number
}

function getProgress(
  progress: ProgressLookup | undefined,
  itemId: RecallItemId,
): ItemProgress | undefined {
  if (!progress) return undefined
  return progress instanceof Map
    ? progress.get(itemId)
    : (progress as Readonly<Record<string, ItemProgress>>)[itemId]
}

function exposureCount(history: readonly RecallItemId[], itemId: RecallItemId): number {
  return history.reduce((count, seen) => count + (seen === itemId ? 1 : 0), 0)
}

function scoreItem(
  itemId: RecallItemId,
  index: number,
  candidates: readonly RecallItemId[],
  progress: ProgressLookup | undefined,
  history: readonly RecallItemId[],
  now: number,
): number {
  const item = getProgress(progress, itemId)
  const exposure = exposureCount(history, itemId)
  const maxExposure = Math.max(...candidates.map(candidate => exposureCount(history, candidate)))
  const recentIndex = history.lastIndexOf(itemId)
  const recencyPenalty = recentIndex === -1
    ? 0
    : Math.min(30, history.length - recentIndex)
  const ageBonus = item?.lastAttemptAt === null || item?.lastAttemptAt === undefined
    ? 0
    : Math.min(10, Math.max(0, (now - item.lastAttemptAt) / 86_400_000))

  // Mastery and exposure are deliberately separate: a weak item gets priority,
  // but a mastered item can still be selected when the scope needs balancing.
  const masteryNeed = item?.mastered ? 0 : 100
  const unseenNeed = item && item.attempts > 0 ? 0 : 12
  const balanceNeed = (maxExposure - exposure) * 8

  // A stable index tie-breaker keeps the function deterministic when no RNG is
  // supplied, which is useful for feature tests and server-side callers.
  return masteryNeed + unseenNeed + balanceNeed + ageBonus - recencyPenalty - index / 1000
}

/** Return candidates in the scheduler's preferred order. */
export function rankNextItems(input: SelectNextItemInput): RecallItemId[] {
  const candidates = [...new Set(input.candidates)]
  if (candidates.length < 2) return candidates

  const history = input.recentHistory ?? []
  const recentSet = new Set(history.slice(-2))
  const alternatives = candidates.filter(candidate => !recentSet.has(candidate))
  const eligible = alternatives.length ? alternatives : candidates
  const progress = input.progress
  const now = input.now ?? Date.now()

  return eligible
    .map((itemId, index) => ({
      itemId,
      index: candidates.indexOf(itemId),
      score: scoreItem(itemId, index, candidates, progress, history, now),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(entry => entry.itemId)
}

/**
 * Select the next atomic recall identity for any feature domain.
 *
 * The scheduler has no knowledge of Pi, Geography, cards, or Major System
 * concepts; those features only provide IDs, progress, and recent history.
 */
export function selectNextItem(input: SelectNextItemInput): RecallItemId | null {
  const ranked = rankNextItems(input)
  if (!ranked.length) return null
  if (ranked.length === 1 || !input.rng) return ranked[0]

  // Randomise only among equally ranked priorities. This preserves fairness and
  // anti-repeat behavior while avoiding a fixed ordering for fresh scopes.
  const first = ranked[0]
  const firstScore = scoreItem(
    first,
    input.candidates.indexOf(first),
    [...new Set(input.candidates)],
    input.progress,
    input.recentHistory ?? [],
    input.now ?? Date.now(),
  )
  const tied = ranked.filter(itemId => Math.abs(scoreItem(
    itemId,
    input.candidates.indexOf(itemId),
    [...new Set(input.candidates)],
    input.progress,
    input.recentHistory ?? [],
    input.now ?? Date.now(),
  ) - firstScore) < 0.001)
  return tied[Math.min(tied.length - 1, Math.floor(input.rng() * tied.length))]
}
