import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { WorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { deriveWorldCountriesIntroducedness, type WorldCountriesTargetIntroduction } from '@/features/world-countries/learning/todayIntroduction'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import {
  deriveWorldCountriesReviewSchedule,
  type WorldCountriesReviewSchedule,
} from '@/features/world-countries/learning/reviewSchedule'
import {
  recallTargetIdFor,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  type WorldCountriesCoreRecallSkill,
} from '@/features/world-countries/learning/recallTargets'

export const WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE = 12

export type WorldCountriesTodayLearningTrack = 'learn-countries' | 'learn-capitals'

export interface WorldCountriesTodayReviewCandidate {
  target: { countryId: CountryId; skill: WorldCountriesCoreRecallSkill }
  country: Country
  schedule: WorldCountriesReviewSchedule
}

export interface WorldCountriesTodayLearningRecommendation {
  track: WorldCountriesTodayLearningTrack
  subregionId: SubregionId
  subregionLabel: string
  continent: Country['continent']
  countryIds: readonly CountryId[]
}

export interface WorldCountriesTodayPlan {
  dueCandidates: readonly WorldCountriesTodayReviewCandidate[]
  reviewQueue: readonly WorldCountriesTodayReviewCandidate[]
  dueCount: number
  dueCountryCount: number
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>
  nextLearning: WorldCountriesTodayLearningRecommendation | null
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
  return schedule.due
    ? { target: { countryId: country.id, skill }, country, schedule }
    : null
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

function recommendationFor(
  countriesInOrder: readonly Country[],
  introductions: ReadonlyMap<string, WorldCountriesTargetIntroduction>,
  subregionIds: readonly SubregionId[],
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
    const hasUnintroducedCapitals = entries.some(country => !introductions.get(
      recallTargetIdFor(country.id, 'country-to-capital'),
    )?.introduced)
    if (!hasUnintroducedCountries && !hasUnintroducedCapitals) continue

    const track: WorldCountriesTodayLearningTrack = hasUnintroducedCountries
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

/** Derive due review and the next whole-Subregion Learning action. */
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

  for (const country of effectiveCountries) {
    for (const skill of WORLD_COUNTRIES_CORE_RECALL_SKILLS) {
      const candidate = createCandidate(country, skill, input.history, introductions, input)
      if (candidate) dueCandidates.push(candidate)
    }
  }
  dueCandidates.sort((left, right) => compareCandidates(left, right, countryOrder))

  const subregionIds = [
    ...(input.effectiveSubregionIds ?? []),
    ...effectiveCountries.map(country => country.subregionId),
  ].filter((id, index, values) => values.indexOf(id) === index)

  return {
    dueCandidates,
    reviewQueue: dueCandidates.slice(0, WORLD_COUNTRIES_TODAY_REVIEW_BLOCK_SIZE),
    dueCount: dueCandidates.length,
    dueCountryCount: new Set(dueCandidates.map(candidate => candidate.country.id)).size,
    introductions,
    nextLearning: dueCandidates.length === 0
      ? recommendationFor(effectiveCountries, introductions, subregionIds)
      : null,
  }
}
