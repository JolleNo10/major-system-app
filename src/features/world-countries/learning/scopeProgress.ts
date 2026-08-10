import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type {
  WorldCountriesCountryCoreState,
  WorldCountriesCountryProgress,
  RecallProgress,
} from './recallProgress'
import { deriveWorldCountriesCountryProgress } from './recallProgress'

export const WORLD_COUNTRIES_COUNTRY_CORE_STATES = [
  'unpractised',
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
  complete: boolean
  countryStateCounts: Readonly<Record<WorldCountriesCountryCoreState, number>>
  additionalMasteredSkills: number
  additionalSkillCount: number
  additionalMasteryRatio: number
}

function emptyStateCounts(): Record<WorldCountriesCountryCoreState, number> {
  return {
    unpractised: 0,
    weak: 0,
    developing: 0,
    strong: 0,
    complete: 0,
  }
}

/** Aggregate current Country population directly into a geographic scope. */
export function deriveWorldCountriesScopeProgress(
  scopeId: string,
  countryIds: readonly CountryId[],
  countryProgress: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
): WorldCountriesScopeProgress {
  const uniqueCountryIds = [...new Set(countryIds)]
  const countryStates = emptyStateCounts()
  let completeCountries = 0
  let additionalMasteredSkills = 0
  let additionalSkillCount = 0

  for (const countryId of uniqueCountryIds) {
    const progress = countryProgress.get(countryId)
    if (!progress) {
      countryStates.unpractised++
      continue
    }
    countryStates[progress.coreState]++
    if (progress.complete) completeCountries++
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
    complete: totalCountries > 0 && completeCountries === totalCountries,
    countryStateCounts: countryStates,
    additionalMasteredSkills,
    additionalSkillCount,
    additionalMasteryRatio: additionalSkillCount
      ? additionalMasteredSkills / additionalSkillCount
      : 0,
  }
}

/** Build scope progress from atomic evidence without a separate Country cache. */
export function deriveWorldCountriesScopeProgressFromEvidence(
  scopeId: string,
  countryIds: readonly CountryId[],
  itemProgress: RecallProgress,
): WorldCountriesScopeProgress {
  const countryProgress = new Map(
    [...new Set(countryIds)].map(countryId => [
      countryId,
      deriveWorldCountriesCountryProgress(countryId, itemProgress),
    ]),
  )
  return deriveWorldCountriesScopeProgress(scopeId, countryIds, countryProgress)
}

/** Derive a scope from canonical Country records supplied by the feature. */
export function deriveWorldCountriesScopeProgressForCountries(
  scopeId: string,
  scopeCountries: readonly Pick<Country, 'id'>[],
  itemProgress: RecallProgress,
): WorldCountriesScopeProgress {
  return deriveWorldCountriesScopeProgressFromEvidence(
    scopeId,
    scopeCountries.map(country => country.id),
    itemProgress,
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

/** World progress is derived from every current canonical Country. */
export function deriveWorldCountriesWorldProgress(
  itemProgress: RecallProgress,
  entries: readonly Country[] = countries,
): WorldCountriesScopeProgress {
  return deriveWorldCountriesScopeProgressForCountries('world', entries, itemProgress)
}
