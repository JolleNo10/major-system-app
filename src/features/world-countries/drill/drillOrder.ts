import type { CountryId } from '@/features/world-countries/data/countries'

export type WorldCountriesDrillOrder = 'ordered' | 'random'

export function isWorldCountriesDrillOrder(value: string): value is WorldCountriesDrillOrder {
  return value === 'ordered' || value === 'random'
}

/** Practice always uses a random Country sequence; only Drill honors the toggle. */
export function getWorldCountriesSessionOrder(
  activity: 'drill' | 'practice',
  drillOrder: WorldCountriesDrillOrder,
): WorldCountriesDrillOrder {
  return activity === 'practice' ? 'random' : drillOrder
}

/** Build the Country sequence for one Drill run without changing its scope. */
export function createDrillCountryOrder(
  countryIds: readonly CountryId[],
  order: WorldCountriesDrillOrder,
  random: () => number = Math.random,
): CountryId[] {
  const uniqueIds = [...new Set(countryIds)]
  if (order === 'ordered') return uniqueIds

  const shuffled = [...uniqueIds]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.999999999, random()))
    const swapWith = Math.floor(value * (index + 1))
    ;[shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]]
  }
  return shuffled
}
