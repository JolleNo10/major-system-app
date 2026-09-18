import type { Attempt } from '@/core/learning'
import { getAllAttemptsOrThrow, rewriteAttemptsForItem } from '@/core/learning'
import { countries as canonicalCountries, type Country } from '@/features/world-countries/data/countries'
import { getAllSubregionLearningStates } from './subregionLearningStore'
import { recordWorldCountriesAttempt } from './recallProgress'
import {
  parseWorldCountriesRecallTargetId,
  recallTargetIdFor,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  type WorldCountriesCoreRecallSkill,
} from './recallTargets'
import { isWorldCountriesAttemptType } from './attemptTypes'
import { isValidWorldCountriesLocalDate, worldCountriesLocalDateForTimestamp } from './reviewSchedule'
import { WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS } from './finalRecallEvidence'

export interface WorldCountriesAttemptTypeMigrationOptions {
  /** The effective active Country population at the composition boundary. */
  activeCountries?: readonly Country[]
}

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

function effectiveCandidateDate(attempt: Attempt): string {
  return isValidWorldCountriesLocalDate(attempt.localDate)
    ? attempt.localDate
    : worldCountriesLocalDateForTimestamp(attempt.at)
}

function learningMilestones(activeCountries: readonly Country[]): Map<string, LearningMilestone> {
  const milestones = new Map<string, LearningMilestone>()
  for (const state of getAllSubregionLearningStates(activeCountries)) {
    const countryIds = activeCountries
      .filter(country => country.subregionId === state.subregionId)
      .map(country => country.id)
    const entries: Array<[WorldCountriesCoreRecallSkill, number | undefined]> = [
      ['location-to-country', state.countriesLearnedAt],
      ['country-to-capital', state.capitalsLearnedAt],
    ]
    for (const [skill, learnedAt] of entries) {
      if (typeof learnedAt !== 'number' || !Number.isFinite(learnedAt)) continue
      const localDate = worldCountriesLocalDateForTimestamp(learnedAt)
      if (!isValidWorldCountriesLocalDate(localDate)) continue
      for (const countryId of countryIds) {
        const itemId = recallTargetIdFor(countryId, skill)
        milestones.set(itemId, { itemId, learnedAt, localDate })
      }
    }
  }
  return milestones
}

function latestLearningCandidateIndex(
  history: readonly Attempt[],
  milestone: LearningMilestone | undefined,
): number {
  if (!milestone) return -1
  let candidateIndex = -1
  let candidateAt = Number.NEGATIVE_INFINITY
  history.forEach((attempt, index) => {
    if (isWorldCountriesAttemptType(attempt.attemptType)) return
    if (!attempt.ok || attempt.evidenceKind === 'recognition') return
    if (attempt.at > milestone.learnedAt || effectiveCandidateDate(attempt) !== milestone.localDate) return
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
 * Best-effort, idempotent migration for the existing shared World Countries
 * attempt namespace. Core provides the rewrite seam; all inference stays here.
 */
async function runWorldCountriesAttemptTypeMigration(
  options: WorldCountriesAttemptTypeMigrationOptions = {},
): Promise<WorldCountriesAttemptTypeMigrationResult> {
  const activeCountries = options.activeCountries ?? canonicalCountries
  const retainedAttempts = await getAllAttemptsOrThrow()
  const recognizedItemIds = new Set(
    retainedAttempts
      .map(attempt => attempt.itemId)
      .filter(itemId => parseWorldCountriesRecallTargetId(itemId) !== null),
  )
  const milestones = learningMilestones(activeCountries)
  const learningItemIds = new Set<string>()
  let rewritten = 0
  let alreadyTyped = 0

  for (const itemId of recognizedItemIds) {
    const targetAttempts = orderAttempts(retainedAttempts.filter(attempt => attempt.itemId === itemId))
    if (targetAttempts.some(attempt => attempt.attemptType === 'learning')) learningItemIds.add(itemId)
    alreadyTyped += targetAttempts.filter(attempt => isWorldCountriesAttemptType(attempt.attemptType)).length

    const candidateMilestone = milestones.get(itemId)
    const candidateIndex = latestLearningCandidateIndex(targetAttempts, candidateMilestone)
    await rewriteAttemptsForItem(itemId, (attempt, index) => {
      if (isWorldCountriesAttemptType(attempt.attemptType)) return undefined
      rewritten += 1
      const attemptType = index === candidateIndex ? 'learning' : 'legacy'
      if (attemptType === 'learning') learningItemIds.add(itemId)
      return { attemptType }
    })
  }

  let synthetic = 0
  for (const milestone of milestones.values()) {
    if (learningItemIds.has(milestone.itemId)) continue
    const target = parseWorldCountriesRecallTargetId(milestone.itemId)
    if (!target) continue
    await recordWorldCountriesAttempt(target.countryId, target.skill, {
      at: milestone.learnedAt,
      ok: true,
      ms: WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS,
      evidenceKind: 'recall',
      localDate: milestone.localDate,
      attemptType: 'learning',
    })
    learningItemIds.add(milestone.itemId)
    synthetic += 1
  }

  return { rewritten, synthetic, alreadyTyped }
}

/** Serialize retries and membership-change runs so synthetic reconciliation stays idempotent. */
export function migrateWorldCountriesAttemptTypes(
  options: WorldCountriesAttemptTypeMigrationOptions = {},
): Promise<WorldCountriesAttemptTypeMigrationResult> {
  const next = migrationQueue.then(() => runWorldCountriesAttemptTypeMigration(options))
  migrationQueue = next.then(() => undefined, () => undefined)
  return next
}
