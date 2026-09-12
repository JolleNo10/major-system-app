import type { Attempt, ItemProgress, RecallItemId } from '@/core/learning'

/** Semantic proficiency for one atomic World Countries recall skill. */
export type WorldCountriesProficiency =
  | 'unpractised'
  | 'weak'
  | 'developing'
  | 'strong'
  | 'mastered'

export interface WorldCountriesAtomicProgress extends ItemProgress {
  /** Whether retained history ever met the explicit recall evidence requirement. */
  hasEverMastered: boolean
  proficiency: WorldCountriesProficiency
}

function sortAttempts(input: readonly Attempt[]): Attempt[] {
  return input
    .map((attempt, index) => ({ attempt, index }))
    .sort((left, right) => left.attempt.at - right.attempt.at || left.index - right.index)
    .map(({ attempt }) => attempt)
}

function latestFailureIndex(attempts: readonly Attempt[]): number {
  for (let index = attempts.length - 1; index >= 0; index--) {
    if (!attempts[index].ok) return index
  }
  return -1
}

function isQualifyingRecallSuccess(attempt: Attempt): boolean {
  return attempt.ok && attempt.evidenceKind === 'recall' && Boolean(attempt.localDate)
}

function masteryEvidenceDates(attempts: readonly Attempt[]): Set<string> {
  return new Set(
    attempts
      .filter(isQualifyingRecallSuccess)
      .map(attempt => attempt.localDate as string),
  )
}

function meetsMasteryEvidenceDateRequirement(dates: ReadonlySet<string>): boolean {
  return dates.size >= 2
}

function hasMasteryEvidence(attempts: readonly Attempt[]): boolean {
  return meetsMasteryEvidenceDateRequirement(masteryEvidenceDates(attempts))
}

/**
 * Keep the evidence of a prior mastery qualification even after a later
 * failure starts a new current-mastery boundary.
 */
function hasEverMasteryEvidence(attempts: readonly Attempt[]): boolean {
  const dates = new Set<string>()
  for (const attempt of attempts) {
    if (!attempt.ok) {
      dates.clear()
      continue
    }
    if (!isQualifyingRecallSuccess(attempt)) continue
    dates.add(attempt.localDate as string)
    if (meetsMasteryEvidenceDateRequirement(dates)) return true
  }
  return false
}

/**
 * Derive World Countries proficiency from raw evidence after the latest
 * failure. Legacy success remains positive evidence, but cannot qualify as
 * explicit free-recall mastery because its interaction is unknown.
 */
export function deriveWorldCountriesAtomicProgress(
  itemId: RecallItemId,
  inputAttempts: readonly Attempt[],
): WorldCountriesAtomicProgress {
  const attempts = sortAttempts(inputAttempts)
  const correct = attempts.filter(attempt => attempt.ok).length
  const wrong = attempts.length - correct
  const recent = attempts.slice(-3)
  let consecutiveCorrect = 0
  for (let index = attempts.length - 1; index >= 0 && attempts[index].ok; index--) {
    consecutiveCorrect++
  }
  const failureIndex = latestFailureIndex(attempts)
  const postFailureAttempts = attempts.slice(failureIndex + 1)
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : undefined
  const postFailureSuccesses = postFailureAttempts.filter(attempt => attempt.ok).length
  const hasEverMastered = hasEverMasteryEvidence(attempts)
  const mastered = Boolean(
    lastAttempt?.ok
    && hasMasteryEvidence(postFailureAttempts),
  )

  let proficiency: WorldCountriesProficiency = 'unpractised'
  if (attempts.length > 0) {
    if (!lastAttempt?.ok) proficiency = 'weak'
    else if (mastered) proficiency = 'mastered'
    else if (postFailureSuccesses >= 2) proficiency = 'strong'
    else proficiency = 'developing'
  }

  const validLatencies = attempts
    .map(attempt => attempt.ms)
    .filter(ms => Number.isFinite(ms) && ms >= 0)
  const sortedLatencies = [...validLatencies].sort((a, b) => a - b)
  const middle = Math.floor(sortedLatencies.length / 2)

  return {
    itemId,
    attempts: attempts.length,
    correct,
    wrong,
    recentCorrect: recent.filter(attempt => attempt.ok).length,
    consecutiveCorrect,
    lastAttemptAt: lastAttempt?.at ?? null,
    medianMs: sortedLatencies.length === 0
      ? null
      : sortedLatencies.length % 2 === 1
        ? sortedLatencies[middle]
        : (sortedLatencies[middle - 1] + sortedLatencies[middle]) / 2,
    mastered,
    hasEverMastered,
    proficiency,
  }
}
