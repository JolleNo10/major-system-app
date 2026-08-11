import type { CountryId } from '@/features/world-countries/data/countries'

export interface WorldCountriesReciteScope {
  countryIds: readonly CountryId[]
  totalCountries: number
}

/** Build a stable recitation scope from the shell-provided active population. */
export function createWorldCountriesReciteScope(
  entries: readonly Pick<{ id: CountryId }, 'id'>[],
): WorldCountriesReciteScope {
  const countryIds = [...new Set(entries.map(entry => entry.id))]
  return { countryIds, totalCountries: countryIds.length }
}
