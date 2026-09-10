import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { deriveWorldCountriesIntroducedness, type WorldCountriesTargetIntroduction } from '@/features/world-countries/learning/todayIntroduction'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { isWorldCountriesCapitalLayerEstablished, isWorldCountriesCountryLayerEstablished } from '@/features/world-countries/learning/learningReadiness'
import {
  deriveWorldCountriesReviewSchedule,
  type WorldCountriesReviewSchedule,
} from '@/features/world-countries/learning/reviewSchedule'
import {
  recallTargetIdFor,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  type WorldCountriesCoreRecallSkill,
} from '@/features/world-countries/learning/recallTargets'
import { deriveWorldCountriesAtomicProgress, type WorldCountriesProficiency } from '@/features/world-countries/learning/recallMastery'
import {
  summarizeWorldCountriesTodayReviewReasons,
  type WorldCountriesTodayReviewReasonSummary,
} from './reviewReason'
import { interleaveWorldCountriesTodayReviewCandidates } from './reviewInterleaving'

export const WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE = 12

export type WorldCountriesTodayLearningTrack = 'learn-countries' | 'learn-capitals'

export interface WorldCountriesTodayReviewCandidate {
  target: { countryId: CountryId; skill: WorldCountriesCoreRecallSkill }
  country: Country
  schedule: WorldCountriesReviewSchedule
  purpose?: 'review' | 'consolidation'
}

export interface WorldCountriesTodayLearningRecommendation {
  track: WorldCountriesTodayLearningTrack
  subregionId: SubregionId
  subregionLabel: string
  continent: Country['continent']
  countryIds: readonly CountryId[]
}

export type WorldCountriesTodayReviewOpportunity =
  | { kind: 'review'; candidates: readonly WorldCountriesTodayReviewCandidate[] }
  | { kind: 'consolidate'; candidates: readonly WorldCountriesTodayReviewCandidate[] }
  | null

export interface WorldCountriesTodayPlan {
  dueCandidates: readonly WorldCountriesTodayReviewCandidate[]
  reviewQueue: readonly WorldCountriesTodayReviewCandidate[]
  consolidationCandidates: readonly WorldCountriesTodayReviewCandidate[]
  consolidationQueue: readonly WorldCountriesTodayReviewCandidate[]
  reviewReasonSummary: WorldCountriesTodayReviewReasonSummary
  dueCount: number
  dueCountryCount: number
  incompleteCountryCount: number
  incompleteSubregionLabels: readonly string[]
  scopeComplete: boolean
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>
  /** The current whole-Subregion curriculum recommendation, independent of Review. */
  curriculumRecommendation: WorldCountriesTodayLearningRecommendation | null
  /** Derived Home journey focus; never persisted and never sourced from queue position. */
  journeyFocusSubregionId: SubregionId | null
  /** Independent Review-area opportunity: scheduled review first, weak spots second. */
  reviewOpportunity: WorldCountriesTodayReviewOpportunity
}

export interface WorldCountriesTodayPlanInput {
  activeCountries: readonly Country[]
  history: WorldCountriesRecallHistory
  learningStates?: readonly SubregionLearningState[]
  /** Effective World -> Continent -> Subregion -> Country order. */
  effectiveCountries?: readonly Country[]
  effectiveSubregionIds?: readonly SubregionId[]
  now?: number
  localDate?: string
}

function skillIndex(skill: WorldCountriesCoreRecallSkill): number {
  return WORLD_COUNTRIES_CORE_RECALL_SKILLS.indexOf(skill)
}

function orderedActiveCountries(
  activeCountries: readonly Country[],
  effectiveCountries: readonly Country[],
): Country[] {
  const activeIds = new Set(activeCountries.map(country => country.id))
  const result = effectiveCountries.filter(country => activeIds.has(country.id))
  const included = new Set(result.map(country => country.id))
  return [
    ...result,
    ...activeCountries.filter(country => !included.has(country.id)),
  ]
}

function createCandidate(
  country: Country,
  skill: WorldCountriesCoreRecallSkill,
  history: WorldCountriesRecallHistory,
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>,
  options: Pick<WorldCountriesTodayPlanInput, 'now' | 'localDate'>,
): WorldCountriesTodayReviewCandidate | null {
  const itemId = recallTargetIdFor(country.id, skill)
  const introduction = introductions.get(itemId)
  if (!introduction?.introduced) return null
  const schedule = deriveWorldCountriesReviewSchedule(history.get(itemId) ?? [], {
    now: options.now,
    localDate: options.localDate,
    milestoneAt: introduction.source === 'milestone' ? introduction.milestoneAt : null,
  })
  return { target: { countryId: country.id, skill }, country, schedule }
}

function compareCandidates(
  left: WorldCountriesTodayReviewCandidate,
  right: WorldCountriesTodayReviewCandidate,
  countryOrder: ReadonlyMap<CountryId, number>,
): number {
  const leftTier = left.schedule.priorityTier ?? 4
  const rightTier = right.schedule.priorityTier ?? 4
  if (leftTier !== rightTier) return leftTier - rightTier

  if (leftTier === 1) {
    const failureOrder = (left.schedule.latestFailureAt ?? 0) - (right.schedule.latestFailureAt ?? 0)
    if (failureOrder !== 0) return failureOrder
  } else if (leftTier === 2) {
    const attemptOrder = (left.schedule.latestAttemptAt ?? 0) - (right.schedule.latestAttemptAt ?? 0)
    if (attemptOrder !== 0) return attemptOrder
  } else if (leftTier === 3) {
    const overdueOrder = right.schedule.overdueDays - left.schedule.overdueDays
    if (overdueOrder !== 0) return overdueOrder
    const dueOrder = (left.schedule.nextDueAt ?? 0) - (right.schedule.nextDueAt ?? 0)
    if (dueOrder !== 0) return dueOrder
  }

  const geographicOrder = (countryOrder.get(left.country.id) ?? Number.MAX_SAFE_INTEGER)
    - (countryOrder.get(right.country.id) ?? Number.MAX_SAFE_INTEGER)
  if (geographicOrder !== 0) return geographicOrder
  return skillIndex(left.target.skill) - skillIndex(right.target.skill)
}

function proficiencyIndex(proficiency: WorldCountriesProficiency): number {
  switch (proficiency) {
    case 'unpractised': return 0
    case 'weak': return 1
    case 'developing': return 2
    case 'strong': return 3
    case 'mastered': return 4
  }
}

function compareConsolidationCandidates(
  left: WorldCountriesTodayReviewCandidate,
  right: WorldCountriesTodayReviewCandidate,
  countryOrder: ReadonlyMap<CountryId, number>,
  progressByTarget: ReadonlyMap<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>,
): number {
  const leftProgress = progressByTarget.get(recallTargetIdFor(left.target.countryId, left.target.skill))
  const rightProgress = progressByTarget.get(recallTargetIdFor(right.target.countryId, right.target.skill))
  const proficiencyOrder = proficiencyIndex(leftProgress?.proficiency ?? 'unpractised')
    - proficiencyIndex(rightProgress?.proficiency ?? 'unpractised')
  if (proficiencyOrder !== 0) return proficiencyOrder

  const failureOrder = (right.schedule.latestFailureAt ?? 0) - (left.schedule.latestFailureAt ?? 0)
  if (failureOrder !== 0) return failureOrder

  const geographicOrder = (countryOrder.get(left.country.id) ?? Number.MAX_SAFE_INTEGER)
    - (countryOrder.get(right.country.id) ?? Number.MAX_SAFE_INTEGER)
  if (geographicOrder !== 0) return geographicOrder
  return skillIndex(left.target.skill) - skillIndex(right.target.skill)
}

function recommendationFor(
  countriesInOrder: readonly Country[],
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>,
  subregionIds: readonly SubregionId[],
  learningStates: readonly SubregionLearningState[],
  progressByTarget: ReadonlyMap<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>,
): WorldCountriesTodayLearningRecommendation | null {
  const bySubregion = new Map<SubregionId, Country[]>()
  for (const country of countriesInOrder) {
    const entries = bySubregion.get(country.subregionId) ?? []
    entries.push(country)
    bySubregion.set(country.subregionId, entries)
  }

  for (const subregionId of subregionIds) {
    const entries = bySubregion.get(subregionId)
    if (!entries?.length) continue
    const hasUnintroducedCountries = entries.some(country => !introductions.get(
      recallTargetIdFor(country.id, 'location-to-country'),
    )?.introduced)
    const learningState = learningStates.find(state => state.subregionId === subregionId)
    const countriesEstablished = isWorldCountriesCountryLayerEstablished(entries, subregionId, learningState, progressByTarget)
    const capitalsEstablished = isWorldCountriesCapitalLayerEstablished(entries, subregionId, learningState, progressByTarget)
    if (!hasUnintroducedCountries && countriesEstablished && capitalsEstablished) continue

    const track: WorldCountriesTodayLearningTrack = hasUnintroducedCountries || !countriesEstablished
      ? 'learn-countries'
      : 'learn-capitals'
    return {
      track,
      subregionId,
      subregionLabel: getSubregionDefinition(subregionId).label,
      continent: entries[0].continent,
      countryIds: entries.map(country => country.id),
    }
  }
  return null
}

/** Derive independent Journey Learning and Review-area opportunities. */
export function buildWorldCountriesTodayPlan(
  input: WorldCountriesTodayPlanInput,
): WorldCountriesTodayPlan {
  const effectiveCountries = orderedActiveCountries(
    input.activeCountries,
    input.effectiveCountries ?? input.activeCountries,
  )
  const introductions = deriveWorldCountriesIntroducedness(
    effectiveCountries,
    input.history,
    input.learningStates,
  )
  const countryOrder = new Map(effectiveCountries.map((country, index) => [country.id, index]))
  const dueCandidates: WorldCountriesTodayReviewCandidate[] = []
  const consolidationCandidates: WorldCountriesTodayReviewCandidate[] = []
  const progressByTarget = new Map<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>()
  const incompleteCountries = new Set<CountryId>()

  for (const country of effectiveCountries) {
    for (const skill of WORLD_COUNTRIES_CORE_RECALL_SKILLS) {
      const itemId = recallTargetIdFor(country.id, skill)
      const progress = deriveWorldCountriesAtomicProgress(itemId, input.history.get(itemId) ?? [])
      progressByTarget.set(itemId, progress)
      if (!progress.mastered) incompleteCountries.add(country.id)
      const candidate = createCandidate(country, skill, input.history, introductions, input)
      if (!candidate) continue
      if (candidate.schedule.due) dueCandidates.push({ ...candidate, purpose: 'review' })
      if (introductions.get(itemId)?.introduced && !progress.mastered) {
        consolidationCandidates.push({ ...candidate, purpose: 'consolidation' })
      }
    }
  }
  dueCandidates.sort((left, right) => compareCandidates(left, right, countryOrder))
  consolidationCandidates.sort((left, right) => compareConsolidationCandidates(left, right, countryOrder, progressByTarget))

  const subregionIds = [
    ...(input.effectiveSubregionIds ?? []),
    ...effectiveCountries.map(country => country.subregionId),
  ].filter((id, index, values) => values.indexOf(id) === index)

  const curriculumRecommendation = recommendationFor(
    effectiveCountries,
    introductions,
    subregionIds,
    input.learningStates ?? [],
    progressByTarget,
  )
  const journeyFocusSubregionId = curriculumRecommendation?.subregionId
    ?? subregionIds.find(subregionId => effectiveCountries.some(country => country.subregionId === subregionId && incompleteCountries.has(country.id)))
    ?? null
  const incompleteSubregionLabels = [...new Set(effectiveCountries
    .filter(country => incompleteCountries.has(country.id))
    .map(country => getSubregionDefinition(country.subregionId).label))]
  const reviewQueue = interleaveWorldCountriesTodayReviewCandidates(
    dueCandidates,
    WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE,
  )
  const consolidationQueue = interleaveWorldCountriesTodayReviewCandidates(
    consolidationCandidates,
    WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE,
  )
  const reviewOpportunity: WorldCountriesTodayReviewOpportunity = dueCandidates.length > 0
    ? { kind: 'review', candidates: reviewQueue }
    : consolidationCandidates.length > 0
      ? { kind: 'consolidate', candidates: consolidationQueue }
      : null
  return {
    dueCandidates,
    reviewQueue,
    consolidationCandidates,
    consolidationQueue,
    reviewReasonSummary: summarizeWorldCountriesTodayReviewReasons(dueCandidates),
    dueCount: dueCandidates.length,
    dueCountryCount: new Set(dueCandidates.map(candidate => candidate.country.id)).size,
    incompleteCountryCount: incompleteCountries.size,
    incompleteSubregionLabels,
    scopeComplete: effectiveCountries.length > 0 && incompleteCountries.size === 0,
    introductions,
    curriculumRecommendation,
    journeyFocusSubregionId,
    reviewOpportunity,
  }
}
