import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesCountryProgress, type WorldCountriesCountryCoreState, type WorldCountriesCountryProgress, type RecallProgress } from './recallProgress'
import type { WorldCountriesProficiency } from './recallMastery'
import type { WorldCountriesRecallSkill } from './recallTargets'
import { createWorldCountriesEstablishedLearningReadinessByCountry, getWorldCountriesLearningReadinessLabel, getWorldCountriesLearningStateList, WORLD_COUNTRIES_LEARNING_BASE, type WorldCountriesLearningReadiness, type WorldCountriesLearningStates } from './learningReadiness'

export type WorldCountriesProgressPerspective = 'core' | WorldCountriesRecallSkill
export type WorldCountriesProgressState = WorldCountriesCountryCoreState | WorldCountriesProficiency
export type WorldCountriesProgressLegendKind = 'core' | 'skill'

export type WorldCountriesPrimaryStatus =
  | { kind: 'learning'; readiness: WorldCountriesLearningReadiness }
  | { kind: 'recall'; state: WorldCountriesProgressState }

export interface WorldCountriesPrimaryStatusCount {
  state: string
  label: string
  count: number
  color: string
}

export const WORLD_COUNTRIES_PROGRESS_LABELS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: 'Early recall',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
  complete: 'Mastered',
}

export const WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION = 'Mastered requires both Location → Country and Country → Capital to be Mastered.'

export const WORLD_COUNTRIES_PROGRESS_COLORS: Readonly<Record<WorldCountriesProgressState, string>> = {
  unpractised: '#b45309',
  weak: '#d97706',
  developing: '#d9ad32',
  strong: '#69a95d',
  mastered: '#16834f',
  complete: '#16834f',
}

const CORE_PROGRESS_LEGEND = 'Early recall · Weak · Developing · Strong · Mastered'
const SKILL_PROGRESS_LEGEND = 'Early recall · Weak · Developing · Strong · Mastered'

/** Return the semantic state a map should render for a Country. */
export function getCountryProgressState(
  progress: WorldCountriesCountryProgress,
  perspective: WorldCountriesProgressPerspective = 'core',
): WorldCountriesProgressState {
  if (perspective === 'core') return progress.coreState
  return progress.skills.get(perspective)?.proficiency ?? 'unpractised'
}

export function getCountryProgressColor(state: WorldCountriesProgressState): string {
  return WORLD_COUNTRIES_PROGRESS_COLORS[state]
}

/** Create solid core-recall colors for a map after Learning has handed off. */
export function createWorldCountriesRecallColorsByCountry(
  countries: readonly Pick<Country, 'id'>[],
  recallProgress: RecallProgress,
): Map<CountryId, string> {
  return new Map(countries.map(country => [
    country.id,
    getCountryProgressColor(getCountryProgressState(deriveWorldCountriesCountryProgress(country.id, recallProgress))),
  ]))
}

/** Gate recall-health labels behind the durable Learning ladder. */
export function deriveWorldCountriesPrimaryStatus(
  readiness: WorldCountriesLearningReadiness,
  progress: WorldCountriesCountryProgress,
): WorldCountriesPrimaryStatus {
  return readiness === 'COUNTRIES_AND_CAPITALS_LEARNED'
    ? { kind: 'recall', state: progress.coreState }
    : { kind: 'learning', readiness }
}

export function getWorldCountriesPrimaryStatusLabel(status: WorldCountriesPrimaryStatus): string {
  return status.kind === 'learning'
    ? getWorldCountriesLearningReadinessLabel(status.readiness)
    : WORLD_COUNTRIES_PROGRESS_LABELS[status.state]
}

export function deriveWorldCountriesPrimaryStatusCounts(
  countries: readonly Pick<Country, 'id' | 'subregionId'>[],
  learningStates: WorldCountriesLearningStates,
  recallProgress: RecallProgress,
): readonly WorldCountriesPrimaryStatusCount[] {
  const readinessByCountry = createWorldCountriesEstablishedLearningReadinessByCountry(
    countries,
    getWorldCountriesLearningStateList(learningStates),
    recallProgress,
  )
  const statuses = new Map<string, WorldCountriesPrimaryStatusCount>()
  const ensure = (state: string, label: string, color: string) => {
    if (!statuses.has(state)) statuses.set(state, { state, label, count: 0, color })
    return statuses.get(state)!
  }
  ensure('NOT_LEARNED', 'Not learned', WORLD_COUNTRIES_LEARNING_BASE)
  ensure('COUNTRIES_LEARNED', 'Countries learned', WORLD_COUNTRIES_LEARNING_BASE)
  for (const state of ['unpractised', 'weak', 'developing', 'strong', 'complete'] as const) {
    ensure(state, WORLD_COUNTRIES_PROGRESS_LABELS[state], getCountryProgressColor(state))
  }

  for (const country of countries) {
    const status = deriveWorldCountriesPrimaryStatus(
      readinessByCountry.get(country.id) ?? 'NOT_LEARNED',
      deriveWorldCountriesCountryProgress(country.id, recallProgress),
    )
    const key = status.kind === 'learning' ? status.readiness : status.state
    const count = ensure(
      key,
      getWorldCountriesPrimaryStatusLabel(status),
      status.kind === 'learning' ? WORLD_COUNTRIES_LEARNING_BASE : getCountryProgressColor(status.state),
    )
    count.count++
  }
  return [...statuses.values()]
}

export function getWorldCountriesProgressLegend(kind: WorldCountriesProgressLegendKind = 'core'): string {
  return kind === 'core' ? CORE_PROGRESS_LEGEND : SKILL_PROGRESS_LEGEND
}
