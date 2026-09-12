import type { WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'

export type WorldCountriesSetupActivity =
  | { kind: 'drill' }
  | { kind: 'practice'; mode: WorldCountriesPracticeMode }
