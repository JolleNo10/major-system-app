import type { Attempt, ItemProgress, RecallItemId } from '@/core/learning'
import {
  deriveWorldCountriesReviewEvents,
  isValidWorldCountriesLocalDate,
} from './reviewSchedule'

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

const PROFICIENCY_RANK: Readonly<Record<WorldCountriesProficiency, number>> = {
  unpractised: 0,
  weak: 1,
  developing: 2,
  strong: 3,
  mastered: 4,
}

function strongerProficiency(
  left: WorldCountriesProficiency,
  right: WorldCountriesProficiency,
): WorldCountriesProficiency {
  return PROFICIENCY_RANK[left] >= PROFICIENCY_RANK[right] ? left : right
}

function lowerProficiency(proficiency: WorldCountriesProficiency): WorldCountriesProficiency {
  switch (proficiency) {
    case 'mastered': return 'strong'
    case 'strong': return 'developing'
    case 'developing': return 'weak'
    case 'weak': return 'weak'
    case 'unpractised': return 'weak'
  }
}

/**
 * Derive current proficiency as a sequence of lapse/recovery events. The
 * scheduler supplies the shared dated lapse context, while the current band
 * remains a projection of retained attempts rather than a stored state.
 */
function deriveCurrentProficiency(
  attempts: readonly Attempt[],
): { proficiency: WorldCountriesProficiency; mastered: boolean } {
  let proficiency: WorldCountriesProficiency = 'unpractised'
  let latestFailureIndex = -1
  const reviewEvents = new Map(
    deriveWorldCountriesReviewEvents(attempts).map(event => [event.localDate, event]),
  )
  const processedFailureDates = new Set<string>()

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index]!
    if (!attempt.ok) {
      const localDate = isValidWorldCountriesLocalDate(attempt.localDate)
        ? attempt.localDate
        : null
      if (localDate) {
        const event = reviewEvents.get(localDate)
        if (!event?.lapse || processedFailureDates.has(localDate)) continue
        processedFailureDates.add(localDate)
      }

      // Both lapse kinds move one current band. Repeated difficulty can keep
      // stepping down because each later dated lapse event changes the band;
      // attempts clustered on the same date have already been collapsed.
      proficiency = lowerProficiency(proficiency)
      latestFailureIndex = index
      continue
    }

    const postFailureAttempts = attempts.slice(latestFailureIndex + 1, index + 1)
    const postFailureSuccesses = postFailureAttempts.filter(candidate => candidate.ok).length
    const successProficiency: WorldCountriesProficiency = postFailureSuccesses >= 2
      ? 'strong'
      : 'developing'
    const mastered = hasMasteryEvidence(postFailureAttempts)
    if (mastered) {
      proficiency = 'mastered'
      continue
    }

    proficiency = strongerProficiency(successProficiency, proficiency)
  }

  return { proficiency, mastered: proficiency === 'mastered' }
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
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : undefined
  const hasEverMastered = hasEverMasteryEvidence(attempts)
  const current = deriveCurrentProficiency(attempts)
  const mastered = Boolean(lastAttempt?.ok && current.mastered)

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
    proficiency: current.proficiency,
  }
}
