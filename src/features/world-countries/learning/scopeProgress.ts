import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type {
  WorldCountriesCountryCoreState,
  WorldCountriesCountryProgress,
  RecallProgress,
} from './recallProgress'
import { deriveWorldCountriesCountryProgress } from './recallProgress'
import { isWorldCountriesSkillLearned, type WorldCountriesLearningReadiness } from './learningReadiness'
import { WORLD_COUNTRIES_SKILL_STATUSES, type WorldCountriesSkillStatus } from './progressPresentation'

export const WORLD_COUNTRIES_COUNTRY_CORE_STATES = [
  'learned',
  'weak',
  'developing',
  'strong',
  'complete',
] as const satisfies readonly WorldCountriesCountryCoreState[]

export interface WorldCountriesScopeProgress {
  scopeId: string
  countryIds: readonly CountryId[]
  totalCountries: number
  completeCountries: number
  completionRatio: number
  coreMasteredSkills: number
  coreSkillCount: number
  coreMasteryRatio: number
  complete: boolean
  countryStateCounts: Readonly<Record<WorldCountriesCountryCoreState, number>>
  locationToCountryMasteredCountries: number
  locationToCountryMasteryRatio: number
  countryToCapitalMasteredCountries: number
  countryToCapitalMasteryRatio: number
  locationToCountryStateCounts: Readonly<Record<WorldCountriesSkillStatus, number>>
  countryToCapitalStateCounts: Readonly<Record<WorldCountriesSkillStatus, number>>
  additionalMasteredSkills: number
  additionalSkillCount: number
  additionalMasteryRatio: number
}

function emptyStateCounts(): Record<WorldCountriesCountryCoreState, number> {
  return {
    learned: 0,
    weak: 0,
    developing: 0,
    strong: 0,
    complete: 0,
  }
}

function emptyAtomicStateCounts(): Record<WorldCountriesSkillStatus, number> {
  return Object.fromEntries(
    WORLD_COUNTRIES_SKILL_STATUSES.map(status => [status, 0]),
  ) as Record<WorldCountriesSkillStatus, number>
}

/** Aggregate current Country population directly into a geographic scope. */
export function deriveWorldCountriesScopeProgress(
  scopeId: string,
  countryIds: readonly CountryId[],
  countryProgress: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
  /**
   * Supply Learning Readiness to report a skill below its own Learning layer
   * as `NOT_LEARNED` instead of the `learned` floor. Without it every skill
   * is treated as learned, which overstates a scope the learner has not met.
   */
  readinessByCountry?: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
): WorldCountriesScopeProgress {
  const uniqueCountryIds = [...new Set(countryIds)]
  const countryStates = emptyStateCounts()
  const locationToCountryStates = emptyAtomicStateCounts()
  const countryToCapitalStates = emptyAtomicStateCounts()
  let completeCountries = 0
  let coreMasteredSkills = 0
  let coreSkillCount = 0
  let locationToCountryMasteredCountries = 0
  let countryToCapitalMasteredCountries = 0
  let additionalMasteredSkills = 0
  let additionalSkillCount = 0

  for (const countryId of uniqueCountryIds) {
    const progress = countryProgress.get(countryId)
    const readiness = readinessByCountry?.get(countryId)
    const skillStatus = (
      skill: 'location-to-country' | 'country-to-capital',
    ): WorldCountriesSkillStatus => (
      readiness !== undefined && !isWorldCountriesSkillLearned(skill, readiness)
        ? 'NOT_LEARNED'
        : progress?.skills.get(skill)?.proficiency ?? 'learned'
    )
    const locationToCountry = skillStatus('location-to-country')
    const countryToCapital = skillStatus('country-to-capital')
    locationToCountryStates[locationToCountry]++
    countryToCapitalStates[countryToCapital]++
    if (locationToCountry === 'mastered') locationToCountryMasteredCountries++
    if (countryToCapital === 'mastered') countryToCapitalMasteredCountries++
    if (!progress) {
      countryStates.learned++
      coreSkillCount += 2
      continue
    }
    countryStates[progress.coreState]++
    if (progress.complete) completeCountries++
    coreMasteredSkills += progress.coreMasteredSkills
    coreSkillCount += progress.coreSkillCount
    additionalMasteredSkills += progress.additionalMasteredSkills
    additionalSkillCount += progress.additionalSkillCount
  }

  const totalCountries = uniqueCountryIds.length
  return {
    scopeId,
    countryIds: uniqueCountryIds,
    totalCountries,
    completeCountries,
    completionRatio: totalCountries ? completeCountries / totalCountries : 0,
    coreMasteredSkills,
    coreSkillCount,
    coreMasteryRatio: coreSkillCount ? coreMasteredSkills / coreSkillCount : 0,
    complete: totalCountries > 0 && completeCountries === totalCountries,
    countryStateCounts: countryStates,
    locationToCountryMasteredCountries,
    locationToCountryMasteryRatio: totalCountries
      ? locationToCountryMasteredCountries / totalCountries
      : 0,
    countryToCapitalMasteredCountries,
    countryToCapitalMasteryRatio: totalCountries
      ? countryToCapitalMasteredCountries / totalCountries
      : 0,
    locationToCountryStateCounts: locationToCountryStates,
    countryToCapitalStateCounts: countryToCapitalStates,
    additionalMasteredSkills,
    additionalSkillCount,
    additionalMasteryRatio: additionalSkillCount
      ? additionalMasteredSkills / additionalSkillCount
      : 0,
  }
}

export function getWorldCountriesScopeDisplayedMasteryRatio(
  progress: Pick<WorldCountriesScopeProgress, 'locationToCountryMasteryRatio' | 'countryToCapitalMasteryRatio'>,
): number {
  return Math.min(
    progress.locationToCountryMasteryRatio,
    progress.countryToCapitalMasteryRatio,
  )
}

/** Build scope progress from atomic evidence without a separate Country cache. */
export function deriveWorldCountriesScopeProgressFromEvidence(
  scopeId: string,
  countryIds: readonly CountryId[],
  itemProgress: RecallProgress,
  readinessByCountry?: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
): WorldCountriesScopeProgress {
  const countryProgress = new Map(
    [...new Set(countryIds)].map(countryId => [
      countryId,
      deriveWorldCountriesCountryProgress(countryId, itemProgress),
    ]),
  )
  return deriveWorldCountriesScopeProgress(scopeId, countryIds, countryProgress, readinessByCountry)
}

/** Derive a scope from canonical Country records supplied by the feature. */
export function deriveWorldCountriesScopeProgressForCountries(
  scopeId: string,
  scopeCountries: readonly Pick<Country, 'id'>[],
  itemProgress: RecallProgress,
  readinessByCountry?: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
): WorldCountriesScopeProgress {
  return deriveWorldCountriesScopeProgressFromEvidence(
    scopeId,
    scopeCountries.map(country => country.id),
    itemProgress,
    readinessByCountry,
  )
}

/** Current canonical Subregion membership is the Subregion denominator. */
export function deriveWorldCountriesSubregionProgress(
  subregionId: SubregionId,
  itemProgress: RecallProgress,
  entries: readonly Country[] = countries,
): WorldCountriesScopeProgress {
  return deriveWorldCountriesScopeProgressForCountries(
    `subregion:${subregionId}`,
    entries.filter(country => country.subregionId === subregionId),
    itemProgress,
  )
}

/** Current canonical Continent membership is the Continent denominator. */
export function deriveWorldCountriesContinentProgress(
  continent: Continent,
  itemProgress: RecallProgress,
  entries: readonly Country[] = countries,
): WorldCountriesScopeProgress {
  return deriveWorldCountriesScopeProgressForCountries(
    `continent:${continent}`,
    entries.filter(country => country.continent === continent),
    itemProgress,
  )
}
