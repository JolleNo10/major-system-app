import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesCountryProgress, type WorldCountriesCountryCoreState, type WorldCountriesCountryProgress, type RecallProgress } from './recallProgress'
import type { WorldCountriesProficiency } from './recallMastery'
import type { WorldCountriesRecallSkill } from './recallTargets'
import { createWorldCountriesEstablishedLearningReadinessByCountry, getWorldCountriesLearningReadinessLabel, getWorldCountriesLearningStateList, WORLD_COUNTRIES_LEARNING_BASE, WORLD_COUNTRIES_LEARNING_COUNTRIES_COLOR, type WorldCountriesLearningReadiness, type WorldCountriesLearningStates } from './learningReadiness'

export type WorldCountriesProgressPerspective = 'core' | WorldCountriesRecallSkill
export type WorldCountriesProgressState = WorldCountriesCountryCoreState | WorldCountriesProficiency
export type WorldCountriesProgressLegendKind = 'core' | 'skill'

export const WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES = [
  'learned',
  'weak',
  'developing',
  'strong',
  'mastered',
] as const satisfies readonly WorldCountriesProficiency[]

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
  learned: 'Learned',
  weak: 'Weak',
  developing: 'Developing',
  strong: 'Strong',
  mastered: 'Mastered',
  complete: 'Mastered',
}

/**
 * One atomic skill's place on the status list.
 *
 * A skill whose own Learning layer is not established has no recall health
 * yet, so it reports `NOT_LEARNED` rather than the `learned` floor - that
 * floor means "taught, never recalled", which is a claim we cannot make about
 * a Country the learner has never seen.
 */
export type WorldCountriesSkillStatus = 'NOT_LEARNED' | WorldCountriesProficiency

export const WORLD_COUNTRIES_SKILL_STATUSES = [
  'NOT_LEARNED',
  'learned',
  'weak',
  'developing',
  'strong',
  'mastered',
] as const satisfies readonly WorldCountriesSkillStatus[]

/**
 * The statuses that describe recall health, excluding the `learned` floor.
 *
 * `learned` is the last Learning milestone rather than a health reading: it
 * says the Country has been taught and never recalled, so the legend groups
 * it with Learning.
 */
export const WORLD_COUNTRIES_RECALL_HEALTH_STATES = [
  'weak',
  'developing',
  'strong',
  'mastered',
] as const satisfies readonly WorldCountriesProficiency[]

export function getWorldCountriesSkillStatusLabel(status: WorldCountriesSkillStatus): string {
  return status === 'NOT_LEARNED' ? 'Not learned' : WORLD_COUNTRIES_PROGRESS_LABELS[status]
}

export function getWorldCountriesSkillStatusColor(status: WorldCountriesSkillStatus): string {
  return status === 'NOT_LEARNED' ? WORLD_COUNTRIES_LEARNING_BASE : getCountryProgressColor(status)
}

export const WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION = 'Mastered requires both Location → Country and Country → Capital to be Mastered.'

export const WORLD_COUNTRIES_PROGRESS_COLORS: Readonly<Record<WorldCountriesProgressState, string>> = {
  learned: '#90796F',
  weak: '#BC9C7B',
  developing: '#B5A678',
  strong: '#769A70',
  mastered: '#3A7F70',
  complete: '#3A7F70',
}

const CORE_PROGRESS_LEGEND = 'Learned · Weak · Developing · Strong · Mastered'
const SKILL_PROGRESS_LEGEND = 'Learned · Weak · Developing · Strong · Mastered'

/** Return the semantic state a map should render for a Country. */
export function getCountryProgressState(
  progress: WorldCountriesCountryProgress,
  perspective: WorldCountriesProgressPerspective = 'core',
): WorldCountriesProgressState {
  if (perspective === 'core') return progress.coreState
  return progress.skills.get(perspective)?.proficiency ?? 'learned'
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
  ensure('COUNTRIES_LEARNED', 'Countries learned', WORLD_COUNTRIES_LEARNING_COUNTRIES_COLOR)
  for (const state of ['learned', 'weak', 'developing', 'strong', 'complete'] as const) {
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
