import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type WorldCountriesPracticeMode =
  | 'locate-countries'
  | 'countries-from-capitals'
  | 'capitals'
  | 'country-from-shape'

/** How the learner answers: typing / choosing, or clicking the map. */
export type WorldCountriesPracticeInteraction = 'recall' | 'location-click'

export interface WorldCountriesPracticeModeDefinition {
  id: WorldCountriesPracticeMode
  label: string
  description: string
  skill: WorldCountriesRecallSkill
  /** Supported answer interactions, most natural first. */
  interactions: readonly WorldCountriesPracticeInteraction[]
}

/**
 * Non-recording Playground activities.
 *
 * Capital → Country is one mode with two answer interactions rather than two
 * modes: a separate "Locate Capitals" card described the same prompt and the
 * same skill, and only differed in how the answer was given.
 */
export const WORLD_COUNTRIES_PRACTICE_MODES: readonly WorldCountriesPracticeModeDefinition[] = [
  {
    id: 'locate-countries',
    label: 'Locate Countries',
    description: 'Practise clicking each target Country on the map.',
    skill: 'location-to-country',
    interactions: ['location-click'],
  },
  {
    id: 'countries-from-capitals',
    label: 'Countries from Capitals',
    description: 'Given a Capital, name its Country by typing it or by clicking the map.',
    skill: 'capital-to-country',
    interactions: ['location-click', 'recall'],
  },
  {
    id: 'capitals',
    label: 'Capital Practice',
    description: 'Practise Country-to-Capital recall without recording progress.',
    skill: 'country-to-capital',
    interactions: ['recall'],
  },
  {
    id: 'country-from-shape',
    label: 'Country from Shape',
    description: 'Identify a Country from its isolated geographic shape.',
    skill: 'shape-to-country',
    interactions: ['recall'],
  },
]

const modeById = new Map(WORLD_COUNTRIES_PRACTICE_MODES.map(mode => [mode.id, mode]))

export function isWorldCountriesPracticeMode(value: string): value is WorldCountriesPracticeMode {
  return modeById.has(value as WorldCountriesPracticeMode)
}

export function getPracticeModeDefinition(mode: WorldCountriesPracticeMode): WorldCountriesPracticeModeDefinition {
  const definition = modeById.get(mode)
  if (!definition) throw new Error(`Unknown World Countries Practice mode: ${mode}`)
  return definition
}

export function getPracticeModeSkill(mode: WorldCountriesPracticeMode): WorldCountriesRecallSkill {
  return getPracticeModeDefinition(mode).skill
}

export function getDefaultPracticeInteraction(mode: WorldCountriesPracticeMode): WorldCountriesPracticeInteraction {
  return getPracticeModeDefinition(mode).interactions[0]!
}

/** Resolve a requested interaction against what the mode actually supports. */
export function resolvePracticeInteraction(
  mode: WorldCountriesPracticeMode,
  requested: WorldCountriesPracticeInteraction | undefined,
): WorldCountriesPracticeInteraction {
  const { interactions } = getPracticeModeDefinition(mode)
  return requested && interactions.includes(requested) ? requested : interactions[0]!
}

export function getPracticeInteractionLabel(interaction: WorldCountriesPracticeInteraction): string {
  return interaction === 'location-click' ? 'Click the map' : 'Type the answer'
}
