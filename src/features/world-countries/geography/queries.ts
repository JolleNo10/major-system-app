import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import {
  getSubregionDefinition,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  getCanonicalSubregionCountries,
  resolveSubregionCountryOrder,
  type SubregionMetadata,
} from './subregionMetadata'

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)]
}

/** Return Continents in the canonical order used by the country data. */
export function getContinents(entries: readonly Country[] = countries): Continent[] {
  return unique(entries.map(entry => entry.continent))
}

export function getCountriesForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): Country[] {
  return entries.filter(entry => entry.continent === continent)
}

/** Return stable Subregion IDs in the canonical order of the country data. */
export function getSubregionIdsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): SubregionId[] {
  return unique(getCountriesForContinent(continent, entries).map(country => country.subregionId))
}

export function getSubregionsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): string[] {
  return getSubregionIdsForContinent(continent, entries)
    .map(id => getSubregionDefinition(id).label)
}

export function getSubregionDefinitionsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
) {
  return getSubregionIdsForContinent(continent, entries).map(getSubregionDefinition)
}

export function getCountriesForSubregion(
  continent: Continent | string,
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
): Country[] {
  return entries.filter(entry => (
    entry.continent === continent && entry.subregionId === subregionId
  ))
}

export function getCountriesForSubregionId(
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
): Country[] {
  return getCanonicalSubregionCountries(subregionId, entries)
}

/**
 * Resolve the effective user order from supplied Geography metadata. Storage
 * is deliberately not consulted here; callers inject the metadata they read.
 */
export function getCountriesForSubregionInEffectiveOrder(
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
  metadata?: Pick<SubregionMetadata, 'subregionId' | 'countryOrder'> | null,
): Country[] {
  return resolveSubregionCountryOrder(subregionId, entries, metadata)
}
