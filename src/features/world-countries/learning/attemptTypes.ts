import type { Attempt } from '@/core/learning'

/** Activity provenance owned by the World Countries feature. */
export const WORLD_COUNTRIES_ATTEMPT_TYPES = [
  'learning',
  'review',
  'strengthen',
  'drill',
  'legacy',
] as const

export type WorldCountriesAttemptType = typeof WORLD_COUNTRIES_ATTEMPT_TYPES[number]

export function isWorldCountriesAttemptType(value: unknown): value is WorldCountriesAttemptType {
  return (WORLD_COUNTRIES_ATTEMPT_TYPES as readonly unknown[]).includes(value)
}

/** World Countries' narrowed view of the shared opaque attempt contract. */
export interface WorldCountriesAttempt extends Attempt {
  attemptType?: WorldCountriesAttemptType
}
