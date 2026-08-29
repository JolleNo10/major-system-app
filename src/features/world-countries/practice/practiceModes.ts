export type WorldCountriesPracticeMode = 'locate-countries' | 'locate-capitals' | 'capitals'

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
    id: 'locate-capitals',
    label: 'Locate Capitals',
    description: 'Practise clicking the Country whose Capital is shown.',
  },
  {
    id: 'capitals',
    label: 'Capitals',
    description: 'Practise Country-to-Capital recall without recording progress.',
  },
]
