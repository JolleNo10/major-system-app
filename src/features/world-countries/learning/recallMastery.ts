import type { Attempt, AttemptEvidenceKind, ItemProgress, RecallItemId } from '@/core/learning'
import {
  deriveWorldCountriesReviewEvents,
  isValidWorldCountriesLocalDate,
  worldCountriesLocalDateForTimestamp,
} from './reviewSchedule'
import { isWorldCountriesAttemptType } from './attemptTypes'
import {
  parseWorldCountriesRecallTargetId,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
} from './recallTargets'
import type { WorldCountriesAttemptType } from './attemptTypes'

/** Semantic proficiency for one atomic World Countries recall skill. */
export type WorldCountriesProficiency =
  | 'learned'
  | 'weak'
  | 'developing'
  | 'strong'
  | 'mastered'

export interface WorldCountriesAtomicProgress extends ItemProgress {
  /** Whether retained history ever met the explicit recall evidence requirement. */
  hasEverMastered: boolean
  proficiency: WorldCountriesProficiency
}

export type WorldCountriesAttemptEvaluationKind = 'acquisition' | 'performance'

export interface WorldCountriesAttemptEvaluationStep {
  at: number
  ms: number
  localDate?: string
  ok: boolean
  evidenceKind?: AttemptEvidenceKind
  /** The provenance value as it was stored, including absent/unknown values. */
  attemptType?: string
  /** The compatibility interpretation used by the evaluator. */
  effectiveAttemptType: WorldCountriesAttemptType
  evaluatedAs: WorldCountriesAttemptEvaluationKind
  masteryEligibleRecall: boolean
  proficiencyAfter: WorldCountriesProficiency
  masteredAfter: boolean
}

export interface WorldCountriesAtomicProgressEvaluation {
  progress: WorldCountriesAtomicProgress
  steps: readonly WorldCountriesAttemptEvaluationStep[]
  masteryQualifyingRecallDates: readonly string[]
}

const WORLD_COUNTRIES_MASTERY_RECALL_DATES = 3

function sortAttempts(input: readonly Attempt[]): Attempt[] {
  return input
    .map((attempt, index) => ({ attempt, index }))
    .sort((left, right) => left.attempt.at - right.attempt.at || left.index - right.index)
    .map(({ attempt }) => attempt)
}

function isQualifyingRecallSuccess(attempt: Attempt): boolean {
  return attempt.ok
    && attempt.evidenceKind === 'recall'
    && isValidWorldCountriesLocalDate(attempt.localDate)
}

function meetsMasteryEvidenceDateRequirement(dates: ReadonlySet<string>): boolean {
  return dates.size >= WORLD_COUNTRIES_MASTERY_RECALL_DATES
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
  learned: 0,
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
    case 'learned': return 'weak'
  }
}

function isCoreTarget(itemId: RecallItemId): boolean {
  const target = parseWorldCountriesRecallTargetId(itemId)
  return target !== null
    && (WORLD_COUNTRIES_CORE_RECALL_SKILLS as readonly string[]).includes(target.skill)
}

/** The fallback date is used only to group old evidence, never for mastery. */
function effectiveLegacyClusterDate(attempt: Attempt): string {
  return isValidWorldCountriesLocalDate(attempt.localDate)
    ? attempt.localDate
    : worldCountriesLocalDateForTimestamp(attempt.at)
}

interface AttemptProjection {
  acquisition: Attempt[]
  performance: Attempt[]
  classifications: AttemptClassification[]
}

interface AttemptClassification {
  attempt: Attempt
  effectiveAttemptType: WorldCountriesAttemptType
  evaluatedAs: WorldCountriesAttemptEvaluationKind
}

function effectiveAttemptType(attempt: Attempt): WorldCountriesAttemptType {
  return isWorldCountriesAttemptType(attempt.attemptType)
    ? attempt.attemptType
    : 'legacy'
}

/**
 * Separate curriculum/acquisition evidence from performance evidence before
 * applying the dated lapse and mastery state machine.
 */
function projectAttempts(
  itemId: RecallItemId,
  sorted: readonly Attempt[],
): AttemptProjection {
  const core = isCoreTarget(itemId)
  const acquisition: Attempt[] = []
  const performance: Attempt[] = []
  const classifications: AttemptClassification[] = []
  let firstLegacyClusterDate: string | null = null
  const hasExplicitLearning = core && sorted.some(attempt => attempt.attemptType === 'learning')

  for (const attempt of sorted) {
    const attemptType = effectiveAttemptType(attempt)
    let evaluatedAs: WorldCountriesAttemptEvaluationKind = 'performance'

    if (core && attemptType === 'learning') {
      acquisition.push(attempt)
      evaluatedAs = 'acquisition'
    } else if (core && !hasExplicitLearning && attemptType === 'legacy') {
      const clusterDate = effectiveLegacyClusterDate(attempt)
      if (firstLegacyClusterDate === null) firstLegacyClusterDate = clusterDate
      if (clusterDate === firstLegacyClusterDate) {
        acquisition.push(attempt)
        evaluatedAs = 'acquisition'
      } else {
        performance.push(attempt)
      }
    } else {
      // Additional skills have no guided Learning owner, so all provenance
      // values, including legacy, retain the ordinary performance semantics.
      performance.push(attempt)
    }

    classifications.push({ attempt, effectiveAttemptType: attemptType, evaluatedAs })
  }

  return { acquisition, performance, classifications }
}

function projectionFromClassifications(
  classifications: readonly AttemptClassification[],
): AttemptProjection {
  return {
    acquisition: classifications
      .filter(classification => classification.evaluatedAs === 'acquisition')
      .map(classification => classification.attempt),
    performance: classifications
      .filter(classification => classification.evaluatedAs === 'performance')
      .map(classification => classification.attempt),
    classifications: [...classifications],
  }
}

/**
 * Derive current proficiency as a sequence of lapse/recovery events. The
 * scheduler supplies the shared dated lapse context, while the current band
 * remains a projection of retained performance attempts rather than state.
 */
function deriveCurrentProficiency(
  attempts: readonly Attempt[],
  initialProficiency: WorldCountriesProficiency,
): {
  proficiency: WorldCountriesProficiency
  mastered: boolean
  masteryQualifyingRecallDates: readonly string[]
} {
  let proficiency = initialProficiency
  let latestFailureIndex = -1
  let acceleratedRecoveryEligible = false
  let masteredLapseDate: string | null = null
  const currentMasteryDates = new Set<string>()
  const reviewEvents = new Map(
    deriveWorldCountriesReviewEvents(attempts).map(event => [event.localDate, event]),
  )
  const processedFailureDates = new Set<string>()

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index]!
    if (!attempt.ok) {
      // Mastery dates are always evaluated after the latest failure boundary,
      // including repeated failures on one local date. The lapse band itself
      // still collapses repeated dated failures below.
      currentMasteryDates.clear()
      const localDate = isValidWorldCountriesLocalDate(attempt.localDate)
        ? attempt.localDate
        : null
      if (localDate) {
        const event = reviewEvents.get(localDate)
        if (!event?.lapse || processedFailureDates.has(localDate)) continue
        processedFailureDates.add(localDate)
      }

      acceleratedRecoveryEligible = proficiency === 'mastered' && localDate !== null
      masteredLapseDate = acceleratedRecoveryEligible ? localDate : null

      // Both lapse kinds move one current band. Repeated difficulty can keep
      // stepping down because each later dated lapse event changes the band;
      // attempts clustered on the same date have already been collapsed.
      proficiency = lowerProficiency(proficiency)
      latestFailureIndex = index
      continue
    }

    if (isQualifyingRecallSuccess(attempt)) {
      currentMasteryDates.add(attempt.localDate as string)
    }

    const postFailureAttempts = attempts.slice(latestFailureIndex + 1, index + 1)
    const postFailureSuccesses = postFailureAttempts.filter(candidate => candidate.ok).length
    const successProficiency: WorldCountriesProficiency = postFailureSuccesses >= 2
      ? 'strong'
      : 'developing'
    const localDate = isValidWorldCountriesLocalDate(attempt.localDate)
      ? attempt.localDate
      : null
    if (
      acceleratedRecoveryEligible
      && masteredLapseDate !== null
      && isQualifyingRecallSuccess(attempt)
      && localDate !== null
      && localDate > masteredLapseDate
    ) {
      proficiency = 'mastered'
      acceleratedRecoveryEligible = false
      masteredLapseDate = null
      continue
    }

    const mastered = meetsMasteryEvidenceDateRequirement(currentMasteryDates)
    if (mastered) {
      proficiency = 'mastered'
      continue
    }

    proficiency = strongerProficiency(successProficiency, proficiency)
  }

  return {
    proficiency,
    mastered: proficiency === 'mastered',
    masteryQualifyingRecallDates: [...currentMasteryDates].sort(),
  }
}

interface DerivedProjection {
  progress: WorldCountriesAtomicProgress
  masteryQualifyingRecallDates: readonly string[]
}

function deriveProgressFromProjection(
  itemId: RecallItemId,
  attempts: readonly Attempt[],
  projection: AttemptProjection,
): DerivedProjection {
  const correct = attempts.filter(attempt => attempt.ok).length
  const wrong = attempts.length - correct
  const recent = attempts.slice(-3)
  let consecutiveCorrect = 0
  for (let index = attempts.length - 1; index >= 0 && attempts[index].ok; index--) {
    consecutiveCorrect++
  }
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : undefined
  const hasEverMastered = hasEverMasteryEvidence(projection.performance)
  // `learned` is the floor of the scale: the Country has been taught but no
  // recall attempt has moved it yet. Acquisition evidence used to push the
  // band straight to `weak`, which made `learned` unreachable and left a
  // freshly taught Country indistinguishable from one that keeps failing.
  const current = deriveCurrentProficiency(projection.performance, 'learned')

  const validLatencies = attempts
    .map(attempt => attempt.ms)
    .filter(ms => Number.isFinite(ms) && ms >= 0)
  const sortedLatencies = [...validLatencies].sort((a, b) => a - b)
  const middle = Math.floor(sortedLatencies.length / 2)

  return {
    progress: {
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
      mastered: current.mastered,
      hasEverMastered,
      proficiency: current.proficiency,
    },
    masteryQualifyingRecallDates: current.masteryQualifyingRecallDates,
  }
}

/**
 * Derive World Countries proficiency from raw evidence. Milestones are not
 * consulted: they describe curriculum completion, while retained attempts
 * are the sole proficiency source.
 */
export function deriveWorldCountriesAtomicProgressEvaluation(
  itemId: RecallItemId,
  inputAttempts: readonly Attempt[],
): WorldCountriesAtomicProgressEvaluation {
  const attempts = sortAttempts(inputAttempts)
  const projection = projectAttempts(itemId, attempts)
  const final = deriveProgressFromProjection(itemId, attempts, projection)
  const steps = projection.classifications.map((classification, index) => {
    const prefixProjection = projectionFromClassifications(
      projection.classifications.slice(0, index + 1),
    )
    const prefix = deriveProgressFromProjection(
      itemId,
      attempts.slice(0, index + 1),
      prefixProjection,
    )
    const { attempt, effectiveAttemptType, evaluatedAs } = classification
    return {
      at: attempt.at,
      ms: attempt.ms,
      localDate: attempt.localDate,
      ok: attempt.ok,
      evidenceKind: attempt.evidenceKind,
      attemptType: attempt.attemptType,
      effectiveAttemptType,
      evaluatedAs,
      masteryEligibleRecall: evaluatedAs === 'performance' && isQualifyingRecallSuccess(attempt),
      proficiencyAfter: prefix.progress.proficiency,
      masteredAfter: prefix.progress.mastered,
    }
  })

  return {
    progress: final.progress,
    steps,
    masteryQualifyingRecallDates: final.masteryQualifyingRecallDates,
  }
}

export function deriveWorldCountriesAtomicProgress(
  itemId: RecallItemId,
  inputAttempts: readonly Attempt[],
): WorldCountriesAtomicProgress {
  const attempts = sortAttempts(inputAttempts)
  const projection = projectAttempts(itemId, attempts)
  return deriveProgressFromProjection(itemId, attempts, projection).progress
}
