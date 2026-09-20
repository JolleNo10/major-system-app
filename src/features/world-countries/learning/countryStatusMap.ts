import type { CountryId } from '@/features/world-countries/data/countries'
import type { SvgMapCountryInnerGlow, SvgMapCountryPattern } from '@/features/world-countries/maps/SvgMapController'
import { WORLD_COUNTRIES_CAPITAL_INNER_GLOW } from '@/features/world-countries/maps/worldCountriesMapPalette'
import {
  createWorldCountriesLearningPattern,
  getWorldCountriesLearningPatternKind,
  getWorldCountriesLearningReadinessLabel,
  type WorldCountriesLearningReadiness,
} from './learningReadiness'
import {
  getCountryProgressColor,
  WORLD_COUNTRIES_PROGRESS_LABELS,
} from './progressPresentation'
import { deriveWorldCountriesCountryProgress, type RecallProgress } from './recallProgress'
import type { WorldCountriesProficiency } from './recallMastery'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface WorldCountriesStatusMapInput {
  countries: readonly { id: CountryId }[]
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>
  recallProgress: RecallProgress
  /** Drop the Learning layer once every Country in view has finished Learning. */
  learningComplete?: boolean
}

export interface WorldCountriesStatusMapPresentation {
  countryColorsById: ReadonlyMap<CountryId, string>
  countryInnerGlowsById: ReadonlyMap<CountryId, SvgMapCountryInnerGlow>
  countryPatternsById: ReadonlyMap<CountryId, SvgMapCountryPattern>
  countryDescriptionsById: ReadonlyMap<CountryId, string>
}

/**
 * The one World Countries map status presentation: Learning until a Country
 * has finished both Learning layers, then recall health with the Country in
 * the fill and the Capital on the inner edge.
 *
 * Every surface that paints Country status shares this so the learner reads
 * one ladder everywhere. Per-activity ladders were rejected: they made the
 * same colour mean different things on Home and in setup.
 */
export function createWorldCountriesStatusMapPresentation({
  countries,
  readinessByCountry,
  recallProgress,
  learningComplete = false,
}: WorldCountriesStatusMapInput): WorldCountriesStatusMapPresentation {
  const countryColorsById = new Map<CountryId, string>()
  const countryInnerGlowsById = new Map<CountryId, SvgMapCountryInnerGlow>()
  const countryPatternsById = new Map<CountryId, SvgMapCountryPattern>()
  const countryDescriptionsById = new Map<CountryId, string>()

  for (const country of countries) {
    const readiness = readinessByCountry.get(country.id) ?? 'NOT_LEARNED'
    if (readiness !== 'COUNTRIES_AND_CAPITALS_LEARNED') {
      const patternKind = learningComplete ? null : getWorldCountriesLearningPatternKind(readiness)
      if (patternKind) countryPatternsById.set(country.id, createWorldCountriesLearningPattern(patternKind))
      countryDescriptionsById.set(country.id, `Learning: ${getWorldCountriesLearningReadinessLabel(readiness)}.`)
      continue
    }
    const { countryState, capitalState } = getWorldCountriesCountryRecallStates(country.id, recallProgress)
    countryColorsById.set(country.id, getCountryProgressColor(countryState))
    countryInnerGlowsById.set(country.id, { color: getCountryProgressColor(capitalState), ...WORLD_COUNTRIES_CAPITAL_INNER_GLOW })
    countryDescriptionsById.set(
      country.id,
      `Country recall: ${WORLD_COUNTRIES_PROGRESS_LABELS[countryState]}. Capital recall: ${WORLD_COUNTRIES_PROGRESS_LABELS[capitalState]}.`,
    )
  }

  return { countryColorsById, countryInnerGlowsById, countryPatternsById, countryDescriptionsById }
}

/** The two core recall readings a Country contributes to the shared status. */
export function getWorldCountriesCountryRecallStates(
  countryId: CountryId,
  recallProgress: RecallProgress,
): { countryState: WorldCountriesProficiency; capitalState: WorldCountriesProficiency } {
  const progress = deriveWorldCountriesCountryProgress(countryId, recallProgress)
  return {
    countryState: progress.skills.get('location-to-country')?.proficiency ?? 'learned',
    capitalState: progress.skills.get('country-to-capital')?.proficiency ?? 'learned',
  }
}

/**
 * Severity order for the focus filters: the two states that mean "needs work"
 * come first, then the `learned` floor, which is an absence of recall evidence
 * rather than a deficiency.
 */
const RECALL_HEALTH_SEVERITY: readonly WorldCountriesProficiency[] = [
  'weak',
  'developing',
  'learned',
  'strong',
  'mastered',
]

/**
 * The recall health the shared status shows for one skill, or `null` when the
 * Country has not finished Learning and so has no reading to show yet.
 */
export function getWorldCountriesSkillRecallHealth(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
  readiness: WorldCountriesLearningReadiness,
  recallProgress: RecallProgress,
): WorldCountriesProficiency | null {
  if (readiness !== 'COUNTRIES_AND_CAPITALS_LEARNED') return null
  return deriveWorldCountriesCountryProgress(countryId, recallProgress).skills.get(skill)?.proficiency ?? 'learned'
}

/** Reduce several skills to the one reading that most needs attention. */
export function getWorldCountriesWorstRecallHealth(
  countryId: CountryId,
  skills: readonly WorldCountriesRecallSkill[],
  readiness: WorldCountriesLearningReadiness,
  recallProgress: RecallProgress,
): WorldCountriesProficiency | null {
  let worst: WorldCountriesProficiency | null = null
  for (const skill of skills) {
    const health = getWorldCountriesSkillRecallHealth(countryId, skill, readiness, recallProgress)
    if (!health) return null
    if (!worst || RECALL_HEALTH_SEVERITY.indexOf(health) < RECALL_HEALTH_SEVERITY.indexOf(worst)) worst = health
  }
  return worst
}
