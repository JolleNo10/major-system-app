import type { Attempt } from '@/core/learning'
import { getAllAttemptsOrThrow, rewriteAttemptsForItem } from '@/core/learning'
import { countries } from '@/features/world-countries/data/countries'
import { getAllRetainedSubregionLearningSnapshots } from './subregionLearningStore'
import { recordWorldCountriesAttemptOrThrow } from './recallProgress'
import {
  parseWorldCountriesRecallTargetId,
  recallTargetIdFor,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  type WorldCountriesCoreRecallSkill,
} from './recallTargets'
import { isWorldCountriesAttemptType } from './attemptTypes'
import { isValidWorldCountriesLocalDate, worldCountriesLocalDateForTimestamp } from './reviewSchedule'
import { WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS } from './finalRecallEvidence'

export interface WorldCountriesAttemptTypeMigrationResult {
  rewritten: number
  synthetic: number
  alreadyTyped: number
}

interface LearningMilestone {
  itemId: string
  learnedAt: number
  localDate: string
}

let migrationQueue: Promise<void> = Promise.resolve()
const canonicalCountryIds = new Set(countries.map(country => country.id))

function isRecognizedWorldCountriesItemId(itemId: string): boolean {
  const target = parseWorldCountriesRecallTargetId(itemId)
  return target !== null && canonicalCountryIds.has(target.countryId)
}

function effectiveCandidateDate(attempt: Attempt): string {
  return isValidWorldCountriesLocalDate(attempt.localDate)
    ? attempt.localDate
    : worldCountriesLocalDateForTimestamp(attempt.at)
}

function learningMilestones(): Map<string, LearningMilestone[]> {
  const milestones = new Map<string, LearningMilestone[]>()
  for (const snapshot of getAllRetainedSubregionLearningSnapshots()) {
    const entries: Array<[WorldCountriesCoreRecallSkill, number | undefined]> = [
      ['location-to-country', snapshot.countriesLearnedAt],
      ['country-to-capital', snapshot.capitalsLearnedAt],
    ]
    for (const [skill, learnedAt] of entries) {
      if (typeof learnedAt !== 'number' || !Number.isFinite(learnedAt)) continue
      const localDate = worldCountriesLocalDateForTimestamp(learnedAt)
      if (!isValidWorldCountriesLocalDate(localDate)) continue
      for (const countryId of snapshot.countryIds) {
        const itemId = recallTargetIdFor(countryId, skill)
        const candidates = milestones.get(itemId) ?? []
        if (!candidates.some(candidate => candidate.learnedAt === learnedAt)) {
          candidates.push({ itemId, learnedAt, localDate })
          milestones.set(itemId, candidates)
        }
      }
    }
  }
  for (const candidates of milestones.values()) candidates.sort((left, right) => left.learnedAt - right.learnedAt)
  return milestones
}

function latestLearningCandidateIndex(
  history: readonly Attempt[],
  milestones: readonly LearningMilestone[],
): number {
  if (!milestones.length) return -1
  let candidateIndex = -1
  let candidateAt = Number.NEGATIVE_INFINITY
  history.forEach((attempt, index) => {
    if (isWorldCountriesAttemptType(attempt.attemptType)) return
    if (!attempt.ok || attempt.evidenceKind === 'recognition') return
    const matchesMilestone = milestones.some(milestone =>
      attempt.at <= milestone.learnedAt && effectiveCandidateDate(attempt) === milestone.localDate)
    if (!matchesMilestone) return
    if (attempt.at >= candidateAt) {
      candidateAt = attempt.at
      candidateIndex = index
    }
  })
  return candidateIndex
}

function orderAttempts(attempts: readonly Attempt[]): Attempt[] {
  return attempts
    .map((attempt, index) => ({ attempt, index }))
    .sort((left, right) => left.attempt.at - right.attempt.at || left.index - right.index)
    .map(({ attempt }) => attempt)
}

/**
 * Idempotent migration for the complete persisted World Countries model.
 * Inference remains feature-owned; membership enumeration does not reconcile or
 * change which saved Subregion membership is active.
 */
async function runWorldCountriesAttemptProvenanceMigration(): Promise<WorldCountriesAttemptTypeMigrationResult> {
  const retainedAttempts = await getAllAttemptsOrThrow()
  const milestones = learningMilestones()
  const recognizedItemIds = new Set(
    retainedAttempts
      .map(attempt => attempt.itemId)
      .filter(isRecognizedWorldCountriesItemId),
  )
  for (const itemId of milestones.keys()) recognizedItemIds.add(itemId)

  const learningItemIds = new Set<string>()
  let rewritten = 0
  let alreadyTyped = 0

  for (const itemId of recognizedItemIds) {
    const targetAttempts = orderAttempts(retainedAttempts.filter(attempt => attempt.itemId === itemId))
    const alreadyHasLearning = targetAttempts.some(attempt => attempt.attemptType === 'learning')
    if (alreadyHasLearning) learningItemIds.add(itemId)
    alreadyTyped += targetAttempts.filter(attempt => isWorldCountriesAttemptType(attempt.attemptType)).length
    if (!targetAttempts.some(attempt => !isWorldCountriesAttemptType(attempt.attemptType))) continue

    const candidateIndex = alreadyHasLearning
      ? -1
      : latestLearningCandidateIndex(targetAttempts, milestones.get(itemId) ?? [])
    await rewriteAttemptsForItem(itemId, (_attempt, index) => {
      if (isWorldCountriesAttemptType(_attempt.attemptType)) return undefined
      rewritten += 1
      const attemptType = index === candidateIndex ? 'learning' : 'legacy'
      if (attemptType === 'learning') learningItemIds.add(itemId)
      return { attemptType }
    })
  }

  let synthetic = 0
  for (const [itemId, candidates] of milestones) {
    if (learningItemIds.has(itemId)) continue
    const target = parseWorldCountriesRecallTargetId(itemId)
    const earliestMilestone = candidates[0]
    if (!target || !earliestMilestone) continue
    await recordWorldCountriesAttemptOrThrow(target.countryId, target.skill, {
      at: earliestMilestone.learnedAt,
      ok: true,
      ms: WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS,
      evidenceKind: 'recall',
      localDate: earliestMilestone.localDate,
      attemptType: 'learning',
    })
    learningItemIds.add(itemId)
    synthetic += 1
  }

  return { rewritten, synthetic, alreadyTyped }
}

/** Serialize overlapping calls so retries remain safe after partial conversion. */
export function migrateWorldCountriesAttemptProvenance(): Promise<WorldCountriesAttemptTypeMigrationResult> {
  const next = migrationQueue.then(() => runWorldCountriesAttemptProvenanceMigration())
  migrationQueue = next.then(() => undefined, () => undefined)
  return next
}
