import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getRecallSkillLabel } from '@/features/world-countries/learning/recallLabels'

export type WorldCountriesDrillMode =
  | 'countries'
  | 'countries-capitals'
  | 'countries-from-capitals'
  | 'countries-from-shape'

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
    id: 'countries-from-capitals',
    label: 'Countries from Capitals',
    description: 'Given a Capital, recall its Country.',
    skills: ['capital-to-country'],
  },
  {
    id: 'countries-from-shape',
    label: 'Country for Shape',
    description: 'Identify a Country from its isolated geographic shape.',
    skills: ['shape-to-country'],
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
  return getRecallSkillLabel(skill)
}
