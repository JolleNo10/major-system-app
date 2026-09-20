import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForDrillSelectionInEffectiveOrder, withAllDrillSubregions } from './drillSelection'
import { getWorldCountriesWorstRecallHealth } from '@/features/world-countries/learning/countryStatusMap'
import type { WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { RecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesProficiency } from '@/features/world-countries/learning/recallMastery'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import { getPracticeModeSkill, type WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'
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

function getActivitySkills(activity: WorldCountriesProficiencyActivity): readonly WorldCountriesRecallSkill[] {
  return activity.kind === 'drill' ? getSkillsForDrillMode(activity.mode) : [getPracticeModeSkill(activity.mode)]
}

/** Derive current matching Countries without creating geography metadata or IDs. */
export function resolveDrillProficiencyScope(
  continent: Continent,
  selection: WorldCountriesProficiencySelection,
  recallProgress: RecallProgress,
  activity: WorldCountriesProficiencyActivity,
  entries: readonly Country[],
  subregionMetadata: readonly { subregionId: SubregionMetadata['subregionId']; countryOrder: readonly CountryId[] }[] = [],
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness> = new Map(),
): WorldCountriesProficiencyScope {
  const selected = new Set(selection)
  const selectionMetadata = {
    continents: [getContinentMetadata(continent)].filter((metadata): metadata is NonNullable<typeof metadata> => metadata !== null),
    subregions: subregionMetadata,
  }
  const countriesInOrder = getCountriesForDrillSelectionInEffectiveOrder(
    withAllDrillSubregions(continent, entries, selectionMetadata),
    entries,
    selectionMetadata,
  )
  const skills = getActivitySkills(activity)
  const stateByCountry = new Map<CountryId, WorldCountriesProficiency | null>(countriesInOrder.map(country => [
    country.id,
    getWorldCountriesWorstRecallHealth(
      country.id,
      skills,
      readinessByCountry.get(country.id) ?? 'COUNTRIES_AND_CAPITALS_LEARNED',
      recallProgress,
    ),
  ]))
  const counts = {
    weak: 0,
    developing: 0,
  }
  for (const filter of PROFICIENCY_FILTERS) {
    counts[filter] = countriesInOrder.filter(country => stateByCountry.get(country.id) === filter).length
  }
  const countries = countriesInOrder.filter(country => {
    const state = stateByCountry.get(country.id)
    return state !== null && state !== undefined && selected.has(state as WorldCountriesProficiencyFilter)
  })

  return {
    counts,
    countryIds: countries.map(country => country.id),
    countries,
  }
}
