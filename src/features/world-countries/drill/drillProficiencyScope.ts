import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import {
  getCountriesForDrillSelectionInEffectiveOrder,
  selectAllDrillSubregions,
  withAllDrillSubregions,
  type DrillSelectionMetadata,
} from './drillSelection'
import { getWorldCountriesWorstRecallHealth } from '@/features/world-countries/learning/countryStatusMap'
import type { WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { RecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesProficiency } from '@/features/world-countries/learning/recallMastery'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import { getPracticeModeSkill, type WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'

/** Which source supplies the Countries a Drill or Practice run covers. */
export type WorldCountriesDrillScopeSource = 'geography' | 'proficiency'

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

export interface WorldCountriesProficiencyScopeInput {
  /** The open setup Continent, or `null` for the whole active World population. */
  continent: Continent | null
  selection: WorldCountriesProficiencySelection
  recallProgress: RecallProgress
  activity: WorldCountriesProficiencyActivity
  entries: readonly Country[]
  selectionMetadata?: DrillSelectionMetadata
  readinessByCountry?: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>
}

export const WORLD_COUNTRIES_PROFICIENCY_FILTERS: readonly WorldCountriesProficiencyFilter[] = ['weak', 'developing']

function getActivitySkills(activity: WorldCountriesProficiencyActivity): readonly WorldCountriesRecallSkill[] {
  return activity.kind === 'drill' ? getSkillsForDrillMode(activity.mode) : [getPracticeModeSkill(activity.mode)]
}

/**
 * Derive current matching Countries without creating geography metadata or IDs.
 *
 * The breadth follows the open setup level rather than a separate control: a
 * Continent hub searches that Continent, World searches the whole active
 * population. A third breadth picker was rejected because Geography already
 * means "what this level shows".
 */
export function resolveDrillProficiencyScope({
  continent,
  selection,
  recallProgress,
  activity,
  entries,
  selectionMetadata = {},
  readinessByCountry = new Map(),
}: WorldCountriesProficiencyScopeInput): WorldCountriesProficiencyScope {
  const selected = new Set(selection)
  const searchSelection = continent
    ? withAllDrillSubregions(continent, entries, selectionMetadata)
    : selectAllDrillSubregions(entries, selectionMetadata)
  const countriesInOrder = getCountriesForDrillSelectionInEffectiveOrder(searchSelection, entries, selectionMetadata)
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
  const counts = { weak: 0, developing: 0 }
  for (const filter of WORLD_COUNTRIES_PROFICIENCY_FILTERS) {
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
