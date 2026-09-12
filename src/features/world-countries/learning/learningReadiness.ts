import type { Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { recallTargetIdFor, type WorldCountriesCoreRecallSkill } from './recallTargets'
import type { RecallProgress } from './recallProgress'
import type { SubregionLearningState } from './subregionLearningState'
import { isSubregionCountriesLearned, isSubregionCapitalsLearned } from './subregionLearningState'
import type { ProgressMapLegendEntry } from './ProgressMapLegend'
import type { SvgMapCountryPattern } from '@/features/world-countries/maps/SvgMapController'

export const WORLD_COUNTRIES_LEARNING_READINESS_STATES = [
  'NOT_LEARNED',
  'COUNTRIES_LEARNED',
  'COUNTRIES_AND_CAPITALS_LEARNED',
] as const

export type WorldCountriesLearningReadiness = typeof WORLD_COUNTRIES_LEARNING_READINESS_STATES[number]
export type WorldCountriesLearningStates = readonly SubregionLearningState[] | ReadonlyMap<SubregionId, SubregionLearningState>
export type WorldCountriesLearningEdgeTreatment = 'none' | 'outline' | 'halo'
export type WorldCountriesLearningPatternKind = 'diagonal' | 'crosshatch'

export const WORLD_COUNTRIES_LEARNING_EDGE_STROKE = '#22d3ee'
export const WORLD_COUNTRIES_LEARNING_EDGE_STROKE_WIDTH = '2px'
export const WORLD_COUNTRIES_LEARNING_PATTERN_BASE = '#4a4742'
export const WORLD_COUNTRIES_LEARNING_PATTERN_LINE = '#d6c7ad'
export const WORLD_COUNTRIES_LEARNING_PATTERN_WIDTH = 2
export const WORLD_COUNTRIES_LEARNING_PATTERN_PITCH = 16

export function createWorldCountriesLearningPattern(kind: WorldCountriesLearningPatternKind): SvgMapCountryPattern {
  return {
    kind,
    baseColor: WORLD_COUNTRIES_LEARNING_PATTERN_BASE,
    lineColor: WORLD_COUNTRIES_LEARNING_PATTERN_LINE,
    lineWidth: WORLD_COUNTRIES_LEARNING_PATTERN_WIDTH,
    pitch: WORLD_COUNTRIES_LEARNING_PATTERN_PITCH,
  }
}

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

/**
 * A display/planning-only fallback for an already-known Country layer.
 *
 * This deliberately requires every location -> Country target to have
 * previously met the existing atomic mastery evidence rule. It does not
 * write or imply the durable countriesLearnedAt milestone.
 */
export function isWorldCountriesCountryRecallMastered(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  recallProgress: RecallProgress,
): boolean {
  return isWorldCountriesRecallSkillMastered(entries, subregionId, recallProgress, 'location-to-country')
}

/** A display/planning-only fallback for an already-known Capital layer. */
export function isWorldCountriesCapitalRecallMastered(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  recallProgress: RecallProgress,
): boolean {
  return isWorldCountriesRecallSkillMastered(entries, subregionId, recallProgress, 'country-to-capital')
}

function isWorldCountriesRecallSkillMastered(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  recallProgress: RecallProgress,
  skill: WorldCountriesCoreRecallSkill,
): boolean {
  const subregionEntries = entries.filter(entry => entry.subregionId === subregionId)
  return subregionEntries.length > 0 && subregionEntries.every(entry => (
    recallProgress.get(recallTargetIdFor(entry.id, skill))?.hasEverMastered === true
  ))
}

/**
 * Derive the non-persisted Country curriculum readiness used by guided Today
 * presentation. The durable milestone remains independently observable.
 */
export function isWorldCountriesCountryLayerEstablished(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  state: SubregionLearningState | null | undefined,
  recallProgress: RecallProgress,
): boolean {
  return isSubregionCountriesLearned(state)
    || isWorldCountriesCountryRecallMastered(entries, subregionId, recallProgress)
}

/**
 * Derive the non-persisted Capital curriculum readiness used by guided Today
 * presentation. The durable milestone remains independently observable.
 */
export function isWorldCountriesCapitalLayerEstablished(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  state: SubregionLearningState | null | undefined,
  recallProgress: RecallProgress,
): boolean {
  return isSubregionCapitalsLearned(state)
    || isWorldCountriesCapitalRecallMastered(entries, subregionId, recallProgress)
}

/**
 * Derive the stable Learning signal for map presentation. Established-layer
 * fallback is intentionally the same historical evidence used by Today and
 * Drill planning; it never writes a synthetic durable milestone.
 */
export function deriveWorldCountriesEstablishedLearningReadiness(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  subregionId: SubregionId,
  state: SubregionLearningState | null | undefined,
  recallProgress: RecallProgress,
): WorldCountriesLearningReadiness {
  return deriveWorldCountriesLearningReadinessFromTracks(
    isWorldCountriesCountryLayerEstablished(entries, subregionId, state, recallProgress),
    isWorldCountriesCapitalLayerEstablished(entries, subregionId, state, recallProgress),
  )
}

export function getWorldCountriesLearningEdgeTreatment(
  readiness: WorldCountriesLearningReadiness,
): WorldCountriesLearningEdgeTreatment {
  if (readiness === 'COUNTRIES_AND_CAPITALS_LEARNED') return 'halo'
  if (readiness === 'COUNTRIES_LEARNED') return 'outline'
  return 'none'
}

function getLearningState(
  states: WorldCountriesLearningStates,
  subregionId: SubregionId,
): SubregionLearningState | undefined {
  if (Array.isArray(states)) return states.find(state => state.subregionId === subregionId)
  return (states as ReadonlyMap<SubregionId, SubregionLearningState>).get(subregionId)
}

export function createWorldCountriesEstablishedLearningReadinessByCountry(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: WorldCountriesLearningStates,
  recallProgress: RecallProgress,
): Map<CountryId, WorldCountriesLearningReadiness> {
  return new Map([...new Set(entries.map(entry => entry.subregionId))].flatMap(subregionId => {
    const readiness = deriveWorldCountriesEstablishedLearningReadiness(
      entries,
      subregionId,
      getLearningState(states, subregionId),
      recallProgress,
    )
    return entries
      .filter(entry => entry.subregionId === subregionId)
      .map(entry => [entry.id, readiness] as const)
  }))
}

export function createWorldCountriesLearningEdgeTreatmentsByCountry(
  entries: readonly Pick<Country, 'id' | 'subregionId'>[],
  states: WorldCountriesLearningStates,
  recallProgress: RecallProgress,
): Map<CountryId, WorldCountriesLearningEdgeTreatment> {
  const readinessByCountry = createWorldCountriesEstablishedLearningReadinessByCountry(
    entries,
    states,
    recallProgress,
  )
  return new Map([...readinessByCountry].map(([countryId, readiness]) => [
    countryId,
    getWorldCountriesLearningEdgeTreatment(readiness),
  ]))
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
