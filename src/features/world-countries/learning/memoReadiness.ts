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
  COUNTRIES_MEMOED: '#71717a',
  COUNTRIES_AND_CAPITALS_MEMOED: '#a1a1aa',
}

const WORLD_COUNTRIES_MEMO_READINESS_LABELS: Readonly<Record<WorldCountriesMemoReadiness, string>> = {
  NOT_MEMOED: 'Not memoed',
  COUNTRIES_MEMOED: 'Countries memoed',
  COUNTRIES_AND_CAPITALS_MEMOED: 'Countries + Capitals memoed',
}

const WORLD_COUNTRIES_MEMO_READINESS_DESCRIPTIONS: Readonly<Record<WorldCountriesMemoReadiness, string>> = {
  NOT_MEMOED: 'The Countries Memo track is incomplete.',
  COUNTRIES_MEMOED: 'Countries Memo is complete; Capital Memo is incomplete.',
  COUNTRIES_AND_CAPITALS_MEMOED: 'Countries Memo and Capital Memo are complete.',
}

export const WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES: readonly ProgressMapLegendEntry[] = [
  ...WORLD_COUNTRIES_MEMO_READINESS_STATES.map(state => ({
    state,
    label: WORLD_COUNTRIES_MEMO_READINESS_LABELS[state],
    color: WORLD_COUNTRIES_MEMO_READINESS_COLORS[state],
  })),
]

export function getWorldCountriesMemoReadinessLabel(readiness: WorldCountriesMemoReadiness): string {
  return WORLD_COUNTRIES_MEMO_READINESS_LABELS[readiness]
}

export function getWorldCountriesMemoReadinessDescription(readiness: WorldCountriesMemoReadiness): string {
  return WORLD_COUNTRIES_MEMO_READINESS_DESCRIPTIONS[readiness]
}

/** Derive instructional readiness from the existing coarse Memo facts. */
export function deriveWorldCountriesMemoReadiness(
  state: SubregionLearningState | null | undefined,
): WorldCountriesMemoReadiness {
  return deriveWorldCountriesMemoReadinessFromTracks(
    isSubregionCountriesLearned(state),
    isSubregionCapitalsLearned(state),
  )
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
  readinessBySubregion: ReadonlyMap<SubregionId, WorldCountriesMemoReadiness>,
): WorldCountriesMemoReadiness {
  return readinessBySubregion.get(country.subregionId) ?? 'NOT_MEMOED'
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
