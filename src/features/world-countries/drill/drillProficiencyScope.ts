import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForDrillSelectionInEffectiveOrder, withAllDrillSubregions } from './drillSelection'
import {
  getDrillCountryProficiencyState,
  getDrillCountrySkillProficiencyState,
} from './drillProgressPresentation'
import type { RecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesProgressState } from '@/features/world-countries/learning/progressPresentation'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import type { SubregionMetadata } from '@/features/world-countries/geography/subregionMetadata'

export type WorldCountriesProficiencyFilter = 'weak' | 'developing'

export type WorldCountriesProficiencySelection = readonly WorldCountriesProficiencyFilter[]

export type WorldCountriesProficiencyActivity =
  | { kind: 'drill'; mode: WorldCountriesDrillMode }
  | { kind: 'practice'; mode: WorldCountriesPracticeMode }

export interface WorldCountriesProficiencyScope {
  counts: Readonly<Record<WorldCountriesProficiencyFilter, number>>
  countryIds: readonly CountryId[]
  countries: readonly Country[]
}

const PROFICIENCY_FILTERS: readonly WorldCountriesProficiencyFilter[] = ['weak', 'developing']

export function getPracticeSkill(mode: WorldCountriesPracticeMode): WorldCountriesRecallSkill {
  if (mode === 'locate-countries') return 'location-to-country'
  if (mode === 'locate-capitals') return 'capital-to-country'
  return 'country-to-capital'
}

/** Derive current matching Countries without creating geography metadata or IDs. */
export function resolveDrillProficiencyScope(
  continent: Continent,
  selection: WorldCountriesProficiencySelection,
  recallProgress: RecallProgress,
  activity: WorldCountriesProficiencyActivity,
  entries: readonly Country[],
  subregionMetadata: readonly Pick<SubregionMetadata, 'subregionId' | 'countryOrder'>[] = [],
): WorldCountriesProficiencyScope {
  const selected = new Set(selection)
  const countriesInOrder = getCountriesForDrillSelectionInEffectiveOrder(
    withAllDrillSubregions(continent, entries),
    entries,
    getContinentMetadata(continent),
    subregionMetadata,
  )
  const matchingByFilter = new Map<WorldCountriesProficiencyFilter, Country[]>()
  for (const filter of PROFICIENCY_FILTERS) matchingByFilter.set(filter, [])

  for (const country of countriesInOrder) {
    const state = getProficiencyState(country.id, recallProgress, activity)
    if (state === 'weak' || state === 'developing') matchingByFilter.get(state)?.push(country)
  }

  const counts = {
    weak: matchingByFilter.get('weak')?.length ?? 0,
    developing: matchingByFilter.get('developing')?.length ?? 0,
  } as const
  const countries = countriesInOrder.filter(country => {
    const state = getProficiencyState(country.id, recallProgress, activity)
    return state !== null && selected.has(state as WorldCountriesProficiencyFilter)
  })

  return {
    counts,
    countryIds: countries.map(country => country.id),
    countries,
  }
}

function getProficiencyState(
  countryId: CountryId,
  recallProgress: RecallProgress,
  activity: WorldCountriesProficiencyActivity,
): WorldCountriesProgressState | null {
  return activity.kind === 'drill'
    ? getDrillCountryProficiencyState(countryId, activity.mode, recallProgress)
    : getDrillCountrySkillProficiencyState(countryId, getPracticeSkill(activity.mode), recallProgress)
}
