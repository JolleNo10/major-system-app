export type WorldCountriesLearningMode = 'learn-countries' | 'learn-capitals'

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

export function isWorldCountriesLearningMode(value: string): value is WorldCountriesLearningMode {
  return value === 'learn-countries' || value === 'learn-capitals'
}
