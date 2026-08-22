import type { CountryId } from '@/features/world-countries/data/countries'

/** Atomic World Countries recall directions. */
export const WORLD_COUNTRIES_RECALL_SKILLS = [
  'location-to-country',
  'shape-to-country',
  'country-to-capital',
  'capital-to-country',
] as const

export type WorldCountriesRecallSkill = typeof WORLD_COUNTRIES_RECALL_SKILLS[number]

/** Skills that define the primary World Countries learning goal. */
export const WORLD_COUNTRIES_CORE_RECALL_SKILLS = [
  'location-to-country',
  'country-to-capital',
] as const satisfies readonly WorldCountriesRecallSkill[]

/** Useful Country knowledge that does not move the primary finish line. */
export const WORLD_COUNTRIES_ADDITIONAL_RECALL_SKILLS = [
  'shape-to-country',
  'capital-to-country',
] as const satisfies readonly WorldCountriesRecallSkill[]

export type WorldCountriesCoreRecallSkill = typeof WORLD_COUNTRIES_CORE_RECALL_SKILLS[number]
export type WorldCountriesAdditionalRecallSkill = typeof WORLD_COUNTRIES_ADDITIONAL_RECALL_SKILLS[number]

export type WorldCountriesRecallSkillCategory = 'core' | 'additional'

export function getWorldCountriesRecallSkillCategory(
  skill: WorldCountriesRecallSkill,
): WorldCountriesRecallSkillCategory {
  return (WORLD_COUNTRIES_CORE_RECALL_SKILLS as readonly string[]).includes(skill)
    ? 'core'
    : 'additional'
}

export interface WorldCountriesRecallTarget {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
}

const TARGET_PREFIX = 'world-countries:'

/** Construct the one durable learning identity for a Country and recall skill. */
export function recallTargetIdFor(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
): string {
  if (!countryId.trim()) throw new Error('Country ID must not be empty')
  return `${TARGET_PREFIX}${skill}:${countryId}`
}
