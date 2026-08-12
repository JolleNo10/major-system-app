import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { recallTargetIdFor } from './recallTargets'
import type { RecallProgress } from './recallProgress'
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
  const values = Array.isArray(states) ? states : [...states.values()]
  return new Map(values.map(state => [state.subregionId, deriveWorldCountriesLearningReadiness(state)]))
}

/**
 * Add the derived Drill signal used by Learn & Practise setup. A Subregion's
 * Country learning is considered ready when every active Country has current
 * Location → Country proficiency of Developing or better. This does not write
 * or alter the durable Learning milestone.
 */
export function getLearningReadinessBySubregionWithDrillEvidence(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: WorldCountriesLearningStates,
  recallProgress: RecallProgress,
): ReadonlyMap<SubregionId, WorldCountriesLearningReadiness> {
  const readinessBySubregion = new Map(getLearningReadinessBySubregion(states))
  const entriesBySubregion = new Map<SubregionId, Array<Pick<Country, 'id' | 'subregionId'>>>()

  for (const entry of entries) {
    const current = entriesBySubregion.get(entry.subregionId) ?? []
    current.push(entry)
    entriesBySubregion.set(entry.subregionId, current)
  }

  for (const [subregionId, subregionEntries] of entriesBySubregion) {
    if (!readinessBySubregion.has(subregionId)) readinessBySubregion.set(subregionId, 'NOT_LEARNED')
    const drillCountriesLearned = subregionEntries.every(entry => {
      const proficiency = recallProgress.get(recallTargetIdFor(entry.id, 'location-to-country'))?.proficiency
      return proficiency === 'developing' || proficiency === 'strong' || proficiency === 'mastered'
    })
    if (!drillCountriesLearned) continue

    const state = Array.isArray(states)
      ? states.find(candidate => candidate.subregionId === subregionId)
      : (states as ReadonlyMap<SubregionId, SubregionLearningState>).get(subregionId)
    readinessBySubregion.set(
      subregionId,
      deriveWorldCountriesLearningReadinessFromTracks(true, isSubregionCapitalsLearned(state)),
    )
  }

  return readinessBySubregion
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
