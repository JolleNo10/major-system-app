import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { getRecallSkillLabel } from '@/features/world-countries/learning/recallLabels'

export type WorldCountriesDrillMode =
  | 'countries-capitals'
  | 'countries'
  | 'capitals'

/** The Drill mode that carries the primary learning goal; the rest narrow it. */
export type WorldCountriesDrillModeTier = 'main' | 'sub'

export interface DrillModeDefinition {
  id: WorldCountriesDrillMode
  label: string
  description: string
  tier: WorldCountriesDrillModeTier
  skills: readonly WorldCountriesRecallSkill[]
}

/**
 * Recorded Drill covers the two core recall skills and nothing else.
 *
 * Shape → Country and Capital → Country left Drill for Playground Practice:
 * they are useful Country knowledge that does not move the primary finish
 * line, so offering them as peer Drill modes made recorded evidence look like
 * progress toward a goal it never advanced.
 */
export const WORLD_COUNTRIES_DRILL_MODES: readonly DrillModeDefinition[] = [
  {
    id: 'countries-capitals',
    label: 'Countries + Capitals',
    description: 'Identify each map location, then recall that Country’s Capital.',
    tier: 'main',
    skills: ['location-to-country', 'country-to-capital'],
  },
  {
    id: 'countries',
    label: 'Countries',
    description: 'Identify the highlighted Country location on the map.',
    tier: 'sub',
    skills: ['location-to-country'],
  },
  {
    id: 'capitals',
    label: 'Capitals',
    description: 'Recall each Country’s Capital on its own.',
    tier: 'sub',
    skills: ['country-to-capital'],
  },
]

export const WORLD_COUNTRIES_MAIN_DRILL_MODE: DrillModeDefinition = WORLD_COUNTRIES_DRILL_MODES
  .find(mode => mode.tier === 'main')!

export const WORLD_COUNTRIES_SUB_DRILL_MODES: readonly DrillModeDefinition[] = WORLD_COUNTRIES_DRILL_MODES
  .filter(mode => mode.tier === 'sub')

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
