import { readString, safeRemove, safeSet } from '@/core/storage'
import { isContinentId, type ContinentId } from '@/features/world-countries/data/subregions'

export const JOURNEY_PREFERENCE_STORAGE_KEY = 'world-countries-journey-preference'

export function getPreferredJourneyContinent(): ContinentId | null {
  const value = readString(JOURNEY_PREFERENCE_STORAGE_KEY)
  return value && isContinentId(value) ? value : null
}

export function setPreferredJourneyContinent(continentId: ContinentId): void {
  if (!isContinentId(continentId)) throw new Error(`Unknown Continent ID: ${continentId}`)
  safeSet(JOURNEY_PREFERENCE_STORAGE_KEY, continentId)
}

export function clearPreferredJourneyContinent(): void {
  safeRemove(JOURNEY_PREFERENCE_STORAGE_KEY)
}
