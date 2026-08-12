export type WorldCountriesLearningMode = 'learn-countries' | 'learn-capitals'
export type WorldCountriesPracticeMode = 'locate-countries' | 'capitals'
export type WorldCountriesLearnPracticeMode = WorldCountriesLearningMode | WorldCountriesPracticeMode

export const WORLD_COUNTRIES_LEARNING_MODES: readonly {
  id: WorldCountriesLearningMode
  label: string
  description: string
}[] = [
  {
    id: 'learn-countries',
    label: 'Learn Countries',
    description: 'Build Country location memory with guided learning.',
  },
  {
    id: 'learn-capitals',
    label: 'Learn Capitals',
    description: 'Build Country-to-Capital memory with guided learning.',
  },
]

export const WORLD_COUNTRIES_PRACTICE_MODES: readonly {
  id: WorldCountriesPracticeMode
  label: string
  description: string
}[] = [
  {
    id: 'locate-countries',
    label: 'Locate Countries',
    description: 'Practise clicking each target Country on the map.',
  },
  {
    id: 'capitals',
    label: 'Capitals',
    description: 'Practise Country-to-Capital recall without recording progress.',
  },
]

export function isWorldCountriesLearningMode(value: string): value is WorldCountriesLearningMode {
  return value === 'learn-countries' || value === 'learn-capitals'
}
