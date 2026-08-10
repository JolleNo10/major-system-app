import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'

export type WorldCountriesDrillMode =
  | 'countries'
  | 'countries-capitals'
  | 'capitals'
  | 'countries-from-capitals'

export interface DrillModeDefinition {
  id: WorldCountriesDrillMode
  label: string
  description: string
  skills: readonly WorldCountriesRecallSkill[]
}

export const WORLD_COUNTRIES_DRILL_MODES: readonly DrillModeDefinition[] = [
  {
    id: 'countries',
    label: 'Countries',
    description: 'Identify the highlighted Country location on the map.',
    skills: ['location-to-country'],
  },
  {
    id: 'countries-capitals',
    label: 'Countries + Capitals',
    description: 'Identify each map location, then recall that Country’s Capital.',
    skills: ['location-to-country', 'country-to-capital'],
  },
  {
    id: 'capitals',
    label: 'Capitals',
    description: 'Given a Country, recall its Capital.',
    skills: ['country-to-capital'],
  },
  {
    id: 'countries-from-capitals',
    label: 'Countries from Capitals',
    description: 'Given a Capital, recall its Country.',
    skills: ['capital-to-country'],
  },
]

const modeById = new Map(WORLD_COUNTRIES_DRILL_MODES.map(mode => [mode.id, mode]))

export function isWorldCountriesDrillMode(value: string): value is WorldCountriesDrillMode {
  return modeById.has(value as WorldCountriesDrillMode)
}

export function getDrillModeDefinition(mode: WorldCountriesDrillMode): DrillModeDefinition {
  const definition = modeById.get(mode)
  if (!definition) throw new Error(`Unknown World Countries Drill mode: ${mode}`)
  return definition
}

export function getSkillsForDrillMode(mode: WorldCountriesDrillMode): readonly WorldCountriesRecallSkill[] {
  return getDrillModeDefinition(mode).skills
}

export function getDrillSkillLabel(skill: WorldCountriesRecallSkill): string {
  if (skill === 'location-to-country') return 'Location → Country'
  if (skill === 'country-to-capital') return 'Country → Capital'
  return 'Capital → Country'
}
