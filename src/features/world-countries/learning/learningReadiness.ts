import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from './subregionLearningState'
import { isSubregionCountriesLearned, isSubregionCapitalsLearned } from './subregionLearningState'
import type { ProgressMapLegendEntry } from './ProgressMapLegend'

export const WORLD_COUNTRIES_LEARNING_READINESS_STATES = [
  'NOT_LEARNED',
  'COUNTRIES_LEARNED',
  'COUNTRIES_AND_CAPITALS_LEARNED',
] as const

export type WorldCountriesLearningReadiness = typeof WORLD_COUNTRIES_LEARNING_READINESS_STATES[number]
export type WorldCountriesLearningStates = readonly SubregionLearningState[] | ReadonlyMap<SubregionId, SubregionLearningState>

export function getWorldCountriesLearningStateList(
  states: WorldCountriesLearningStates,
): readonly SubregionLearningState[] {
  return Array.isArray(states) ? states : [...states.values()]
}

export const WORLD_COUNTRIES_LEARNING_READINESS_COLORS: Readonly<Record<WorldCountriesLearningReadiness, string>> = {
  NOT_LEARNED: '#52525b',
  COUNTRIES_LEARNED: '#71717a',
  COUNTRIES_AND_CAPITALS_LEARNED: '#a1a1aa',
}

const WORLD_COUNTRIES_LEARNING_READINESS_LABELS: Readonly<Record<WorldCountriesLearningReadiness, string>> = {
  NOT_LEARNED: 'Not learned',
  COUNTRIES_LEARNED: 'Countries learned',
  COUNTRIES_AND_CAPITALS_LEARNED: 'Countries + Capitals learned',
}

const WORLD_COUNTRIES_LEARNING_READINESS_DESCRIPTIONS: Readonly<Record<WorldCountriesLearningReadiness, string>> = {
  NOT_LEARNED: 'Countries learning is incomplete.',
  COUNTRIES_LEARNED: 'Countries learning is complete; Capital learning is incomplete.',
  COUNTRIES_AND_CAPITALS_LEARNED: 'Countries and Capital learning are complete.',
}

export const WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES: readonly ProgressMapLegendEntry[] = [
  ...WORLD_COUNTRIES_LEARNING_READINESS_STATES.map(state => ({
    state,
    label: WORLD_COUNTRIES_LEARNING_READINESS_LABELS[state],
    color: WORLD_COUNTRIES_LEARNING_READINESS_COLORS[state],
  })),
]

export function getWorldCountriesLearningReadinessLabel(readiness: WorldCountriesLearningReadiness): string {
  return WORLD_COUNTRIES_LEARNING_READINESS_LABELS[readiness]
}

export function getWorldCountriesLearningReadinessDescription(readiness: WorldCountriesLearningReadiness): string {
  return WORLD_COUNTRIES_LEARNING_READINESS_DESCRIPTIONS[readiness]
}

/** Derive Learning Readiness from the existing durable learning milestones. */
export function deriveWorldCountriesLearningReadiness(
  state: SubregionLearningState | null | undefined,
): WorldCountriesLearningReadiness {
  return deriveWorldCountriesLearningReadinessFromTracks(
    isSubregionCountriesLearned(state),
    isSubregionCapitalsLearned(state),
  )
}

export function deriveWorldCountriesLearningReadinessFromTracks(
  countriesLearned: boolean,
  capitalsLearned: boolean,
): WorldCountriesLearningReadiness {
  if (!countriesLearned) return 'NOT_LEARNED'
  return capitalsLearned ? 'COUNTRIES_AND_CAPITALS_LEARNED' : 'COUNTRIES_LEARNED'
}

export function getLearningReadinessBySubregion(
  states: WorldCountriesLearningStates,
): ReadonlyMap<SubregionId, WorldCountriesLearningReadiness> {
  return new Map(getWorldCountriesLearningStateList(states).map(state => [state.subregionId, deriveWorldCountriesLearningReadiness(state)]))
}

export function getLearningReadinessForCountry(
  country: Pick<Country, 'subregionId'>,
  readinessBySubregion: ReadonlyMap<SubregionId, WorldCountriesLearningReadiness>,
): WorldCountriesLearningReadiness {
  return readinessBySubregion.get(country.subregionId) ?? 'NOT_LEARNED'
}

export function createWorldCountriesLearningReadinessColors(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: readonly SubregionLearningState[],
): Map<CountryId, string> {
  const readinessBySubregion = getLearningReadinessBySubregion(states)
  return new Map(entries.map(country => {
    const readiness = getLearningReadinessForCountry(country, readinessBySubregion)
    return [country.id, WORLD_COUNTRIES_LEARNING_READINESS_COLORS[readiness]]
  }))
}

export function createWorldCountriesLearningReadinessByCountry(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: readonly SubregionLearningState[],
): Map<CountryId, WorldCountriesLearningReadiness> {
  const readinessBySubregion = getLearningReadinessBySubregion(states)
  return new Map(entries.map(country => [country.id, getLearningReadinessForCountry(country, readinessBySubregion)]))
}
