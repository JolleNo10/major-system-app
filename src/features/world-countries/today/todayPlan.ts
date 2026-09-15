import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { continentIdFor, type ContinentId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { deriveWorldCountriesIntroducedness, type WorldCountriesTargetIntroduction } from '@/features/world-countries/learning/todayIntroduction'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { createWorldCountriesEstablishedLearningReadinessByCountry, isWorldCountriesCapitalLayerEstablished, isWorldCountriesCountryLayerEstablished, type WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import {
  deriveWorldCountriesReviewSchedule,
  isValidWorldCountriesLocalDate,
  worldCountriesLocalDateForTimestamp,
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

export const WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE = 8
const WORLD_COUNTRIES_TODAY_MIN_REVIEW_OPPORTUNITY_DUE_ITEMS = 3
const WORLD_COUNTRIES_TODAY_HIGH_CONSOLIDATION_MIN_FRAGILE_TARGETS = 4
const WORLD_COUNTRIES_TODAY_HIGH_CONSOLIDATION_MIN_FRAGILE_RATIO = 0.5

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

export interface WorldCountriesTodayConsolidationPressure {
  establishedNonMasteredTargetCount: number
  fragileTargetCount: number
  fragileRatio: number
  isHigh: boolean
}

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
  /** The planner-derived default Home focus; never persisted or sourced from queue position. */
  plannerFocusSubregionId: SubregionId | null
  /** The same readiness-derived curriculum action for every active Subregion. */
  curriculumRecommendationsBySubregion: ReadonlyMap<SubregionId, WorldCountriesTodayLearningRecommendation | null>
  /** Independent Review-area opportunity: sufficient scheduled review first, consolidation otherwise. */
  reviewOpportunity: WorldCountriesTodayReviewOpportunity
  /** Derived pressure from established, non-mastered recall targets in scope. */
  consolidationPressure: WorldCountriesTodayConsolidationPressure
}

export interface WorldCountriesTodayPlanInput {
  activeCountries: readonly Country[]
  history: WorldCountriesRecallHistory
  learningStates?: readonly SubregionLearningState[]
  /** Effective World -> Continent -> Subregion -> Country order. */
  effectiveCountries?: readonly Country[]
  effectiveSubregionIds?: readonly SubregionId[]
  preferredJourneyContinent?: ContinentId | null
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
  reviewEligible: boolean,
  milestoneAt: number | null,
  options: Pick<WorldCountriesTodayPlanInput, 'now' | 'localDate'>,
): WorldCountriesTodayReviewCandidate | null {
  const itemId = recallTargetIdFor(country.id, skill)
  if (!reviewEligible) return null
  const schedule = deriveWorldCountriesReviewSchedule(history.get(itemId) ?? [], {
    now: options.now,
    localDate: options.localDate,
    milestoneAt,
  })
  return { target: { countryId: country.id, skill }, country, schedule }
}

function isTargetEstablishedForReadiness(
  skill: WorldCountriesCoreRecallSkill,
  readiness: WorldCountriesLearningReadiness,
): boolean {
  return skill === 'location-to-country'
    ? readiness !== 'NOT_LEARNED'
    : readiness === 'COUNTRIES_AND_CAPITALS_LEARNED'
}

function createsConsolidationPressure(proficiency: WorldCountriesProficiency): boolean {
  return proficiency === 'unpractised'
    || proficiency === 'weak'
    || proficiency === 'developing'
}

function deriveConsolidationPressure({
  countries,
  establishedReadinessByCountry,
  progressByTarget,
}: {
  countries: readonly Country[]
  establishedReadinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>
  progressByTarget: ReadonlyMap<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>
}): WorldCountriesTodayConsolidationPressure {
  let establishedNonMasteredTargetCount = 0
  let fragileTargetCount = 0

  for (const country of countries) {
    const readiness = establishedReadinessByCountry.get(country.id) ?? 'NOT_LEARNED'
    for (const skill of WORLD_COUNTRIES_CORE_RECALL_SKILLS) {
      if (!isTargetEstablishedForReadiness(skill, readiness)) continue
      const progress = progressByTarget.get(recallTargetIdFor(country.id, skill))
      if (!progress || progress.mastered) continue

      establishedNonMasteredTargetCount += 1
      if (createsConsolidationPressure(progress.proficiency)) {
        fragileTargetCount += 1
      }
    }
  }

  const fragileRatio = establishedNonMasteredTargetCount === 0
    ? 0
    : fragileTargetCount / establishedNonMasteredTargetCount
  return {
    establishedNonMasteredTargetCount,
    fragileTargetCount,
    fragileRatio,
    isHigh: fragileTargetCount >= WORLD_COUNTRIES_TODAY_HIGH_CONSOLIDATION_MIN_FRAGILE_TARGETS
      && fragileRatio >= WORLD_COUNTRIES_TODAY_HIGH_CONSOLIDATION_MIN_FRAGILE_RATIO,
  }
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

function groupCountriesBySubregion(
  countriesInOrder: readonly Country[],
): ReadonlyMap<SubregionId, readonly Country[]> {
  const bySubregion = new Map<SubregionId, Country[]>()
  for (const country of countriesInOrder) {
    const entries = bySubregion.get(country.subregionId) ?? []
    entries.push(country)
    bySubregion.set(country.subregionId, entries)
  }
  return bySubregion
}

function recommendationForSubregion({
  countriesBySubregion,
  introductions,
  subregionId,
  learningStates,
  progressByTarget,
}: {
  countriesBySubregion: ReadonlyMap<SubregionId, readonly Country[]>
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>
  subregionId: SubregionId
  learningStates: readonly SubregionLearningState[]
  progressByTarget: ReadonlyMap<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>
}): WorldCountriesTodayLearningRecommendation | null {
  const entries = countriesBySubregion.get(subregionId)
  if (!entries?.length) return null
  const hasUnintroducedCountries = entries.some(country => !introductions.get(
    recallTargetIdFor(country.id, 'location-to-country'),
  )?.introduced)
  const learningState = learningStates.find(state => state.subregionId === subregionId)
  const countriesEstablished = isWorldCountriesCountryLayerEstablished(entries, subregionId, learningState, progressByTarget)
  const capitalsEstablished = isWorldCountriesCapitalLayerEstablished(entries, subregionId, learningState, progressByTarget)
  if (!hasUnintroducedCountries && countriesEstablished && capitalsEstablished) return null

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

function deriveCurriculumRecommendations({
  countriesInOrder,
  introductions,
  subregionIds,
  learningStates,
  progressByTarget,
  incompleteCountries,
  preferredJourneyContinent,
}: {
  countriesInOrder: readonly Country[]
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>
  subregionIds: readonly SubregionId[]
  learningStates: readonly SubregionLearningState[]
  progressByTarget: ReadonlyMap<string, ReturnType<typeof deriveWorldCountriesAtomicProgress>>
  incompleteCountries: ReadonlySet<CountryId>
  preferredJourneyContinent?: ContinentId | null
}): {
  curriculumRecommendation: WorldCountriesTodayLearningRecommendation | null
  plannerFocusSubregionId: SubregionId | null
  curriculumRecommendationsBySubregion: ReadonlyMap<SubregionId, WorldCountriesTodayLearningRecommendation | null>
} {
  const countriesBySubregion = groupCountriesBySubregion(countriesInOrder)
  const curriculumRecommendationsBySubregion = new Map(
    subregionIds.map(subregionId => [
      subregionId,
      recommendationForSubregion({ countriesBySubregion, introductions, subregionId, learningStates, progressByTarget }),
    ] as const),
  )
  const ordinaryCurriculumRecommendation = subregionIds
    .map(subregionId => curriculumRecommendationsBySubregion.get(subregionId) ?? null)
    .find(Boolean) ?? null
  const preferredCurriculumRecommendation = preferredJourneyContinent
    ? subregionIds
      .map(subregionId => curriculumRecommendationsBySubregion.get(subregionId) ?? null)
      .find(recommendation => recommendation
        && continentIdFor(recommendation.continent) === preferredJourneyContinent)
      ?? null
    : null
  const curriculumRecommendation = preferredCurriculumRecommendation ?? ordinaryCurriculumRecommendation
  const plannerFocusSubregionId = curriculumRecommendation?.subregionId
    ?? subregionIds.find(subregionId => countriesBySubregion.get(subregionId)?.some(country => incompleteCountries.has(country.id)))
    ?? null
  return { curriculumRecommendation, plannerFocusSubregionId, curriculumRecommendationsBySubregion }
}

/** Derive independent Journey Learning and Review-area opportunities. */
export function buildWorldCountriesTodayPlan(
  input: WorldCountriesTodayPlanInput,
): WorldCountriesTodayPlan {
  const now = input.now ?? Date.now()
  const localDate = isValidWorldCountriesLocalDate(input.localDate)
    ? input.localDate
    : worldCountriesLocalDateForTimestamp(now)
  const temporalOptions = { now, localDate }
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
    }
  }

  const establishedReadinessByCountry = createWorldCountriesEstablishedLearningReadinessByCountry(
    effectiveCountries,
    input.learningStates ?? [],
    progressByTarget,
  )

  for (const country of effectiveCountries) {
    for (const skill of WORLD_COUNTRIES_CORE_RECALL_SKILLS) {
      const itemId = recallTargetIdFor(country.id, skill)
      const readiness = establishedReadinessByCountry.get(country.id) ?? 'NOT_LEARNED'
      const reviewEligible = isTargetEstablishedForReadiness(skill, readiness)
      const milestoneAt = introductions.get(itemId)?.milestoneAt ?? null
      const candidate = createCandidate(country, skill, input.history, reviewEligible, milestoneAt, temporalOptions)
      if (!candidate) continue
      if (candidate.schedule.due) dueCandidates.push({ ...candidate, purpose: 'review' })
      const recalledSuccessfullyToday = candidate.schedule.qualifyingRecallDates.includes(localDate)
      if (!progressByTarget.get(itemId)!.mastered && !recalledSuccessfullyToday) {
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

  const {
    curriculumRecommendation,
    plannerFocusSubregionId,
    curriculumRecommendationsBySubregion,
  } = deriveCurriculumRecommendations({
    countriesInOrder: effectiveCountries,
    introductions,
    subregionIds,
    learningStates: input.learningStates ?? [],
    progressByTarget,
    incompleteCountries,
    preferredJourneyContinent: input.preferredJourneyContinent,
  })
  const consolidationPressure = deriveConsolidationPressure({
    countries: effectiveCountries,
    establishedReadinessByCountry,
    progressByTarget,
  })
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
  const reviewOpportunity: WorldCountriesTodayReviewOpportunity = dueCandidates.length >= WORLD_COUNTRIES_TODAY_MIN_REVIEW_OPPORTUNITY_DUE_ITEMS
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
    plannerFocusSubregionId,
    curriculumRecommendationsBySubregion,
    reviewOpportunity,
    consolidationPressure,
  }
}
