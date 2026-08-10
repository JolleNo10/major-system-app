import type { CountryId } from '@/features/world-countries/data/countries'

/** Atomic World Countries recall directions. */
export const WORLD_COUNTRIES_RECALL_SKILLS = [
  'location-to-country',
  'country-to-capital',
  'capital-to-country',
] as const

export type WorldCountriesRecallSkill = typeof WORLD_COUNTRIES_RECALL_SKILLS[number]

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
