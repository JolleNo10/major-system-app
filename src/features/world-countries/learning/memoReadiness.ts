import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from './subregionLearningState'
import { isSubregionCountriesLearned, isSubregionCapitalsLearned } from './subregionLearningState'
import type { ProgressMapLegendEntry } from './ProgressMapLegend'

export const WORLD_COUNTRIES_MEMO_READINESS_STATES = [
  'NOT_MEMOED',
  'COUNTRIES_MEMOED',
  'COUNTRIES_AND_CAPITALS_MEMOED',
] as const

export type WorldCountriesMemoReadiness = typeof WORLD_COUNTRIES_MEMO_READINESS_STATES[number]
export type WorldCountriesMemoLearningStates = readonly SubregionLearningState[] | ReadonlyMap<SubregionId, SubregionLearningState>

export const WORLD_COUNTRIES_MEMO_READINESS_COLORS: Readonly<Record<WorldCountriesMemoReadiness, string>> = {
  NOT_MEMOED: '#52525b',
  COUNTRIES_MEMOED: '#7c3aed',
  COUNTRIES_AND_CAPITALS_MEMOED: '#c026d3',
}

export const WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES: readonly ProgressMapLegendEntry[] = [
  { state: 'NOT_MEMOED', label: 'Not memoed', color: WORLD_COUNTRIES_MEMO_READINESS_COLORS.NOT_MEMOED },
  { state: 'COUNTRIES_MEMOED', label: 'Countries memoed', color: WORLD_COUNTRIES_MEMO_READINESS_COLORS.COUNTRIES_MEMOED },
  { state: 'COUNTRIES_AND_CAPITALS_MEMOED', label: 'Countries + Capitals memoed', color: WORLD_COUNTRIES_MEMO_READINESS_COLORS.COUNTRIES_AND_CAPITALS_MEMOED },
]

export function getWorldCountriesMemoReadinessLabel(readiness: WorldCountriesMemoReadiness): string {
  if (readiness === 'COUNTRIES_MEMOED') return 'Countries memoed'
  if (readiness === 'COUNTRIES_AND_CAPITALS_MEMOED') return 'Countries + Capitals memoed'
  return 'Not memoed'
}

export function getWorldCountriesMemoReadinessDescription(readiness: WorldCountriesMemoReadiness): string {
  if (readiness === 'COUNTRIES_MEMOED') return 'Countries Memo is complete; Capital Memo is incomplete.'
  if (readiness === 'COUNTRIES_AND_CAPITALS_MEMOED') return 'Countries Memo and Capital Memo are complete.'
  return 'The Countries Memo track is incomplete.'
}

/** Derive instructional readiness from the existing coarse Memo facts. */
export function deriveWorldCountriesMemoReadiness(
  state: SubregionLearningState | null | undefined,
): WorldCountriesMemoReadiness {
  if (!isSubregionCountriesLearned(state)) return 'NOT_MEMOED'
  return isSubregionCapitalsLearned(state)
    ? 'COUNTRIES_AND_CAPITALS_MEMOED'
    : 'COUNTRIES_MEMOED'
}

export function deriveWorldCountriesMemoReadinessFromTracks(
  countriesLearned: boolean,
  capitalsLearned: boolean,
): WorldCountriesMemoReadiness {
  if (!countriesLearned) return 'NOT_MEMOED'
  return capitalsLearned ? 'COUNTRIES_AND_CAPITALS_MEMOED' : 'COUNTRIES_MEMOED'
}

export function canEnterCapitalMemo(state: SubregionLearningState | null | undefined): boolean {
  return isSubregionCountriesLearned(state)
}

export function getMemoReadinessBySubregion(
  states: WorldCountriesMemoLearningStates,
): ReadonlyMap<SubregionId, WorldCountriesMemoReadiness> {
  const values = Array.isArray(states) ? states : [...states.values()]
  return new Map(values.map(state => [state.subregionId, deriveWorldCountriesMemoReadiness(state)]))
}

export function getMemoReadinessForCountry(
  country: Pick<Country, 'subregionId'>,
  statesBySubregion: ReadonlyMap<SubregionId, SubregionLearningState | WorldCountriesMemoReadiness>,
): WorldCountriesMemoReadiness {
  const state = statesBySubregion.get(country.subregionId)
  return typeof state === 'string' ? state : deriveWorldCountriesMemoReadiness(state)
}

export function createWorldCountriesMemoReadinessColors(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: readonly SubregionLearningState[],
): Map<CountryId, string> {
  const readinessBySubregion = getMemoReadinessBySubregion(states)
  return new Map(entries.map(country => {
    const readiness = getMemoReadinessForCountry(country, readinessBySubregion)
    return [country.id, WORLD_COUNTRIES_MEMO_READINESS_COLORS[readiness]]
  }))
}

export function createWorldCountriesMemoReadinessByCountry(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: readonly SubregionLearningState[],
): Map<CountryId, WorldCountriesMemoReadiness> {
  const readinessBySubregion = getMemoReadinessBySubregion(states)
  return new Map(entries.map(country => [country.id, getMemoReadinessForCountry(country, readinessBySubregion)]))
}
