import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import {
  getSubregionDefinition,
  type ContinentId,
  type SubregionDefinition,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  getCanonicalSubregionCountries,
  resolveSubregionCountryOrder,
  type SubregionMetadata,
} from './subregionMetadata'
import {
  resolveContinentSubregionOrder,
  type ContinentMetadata,
} from './continentMetadata'
import {
  getCanonicalWorldContinents,
  resolveWorldContinentOrder,
  type WorldMetadata,
} from './worldMetadata'

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)]
}

/** Return Continents in the canonical order used by the country data. */
export function getContinents(entries: readonly Country[] = countries): Continent[] {
  return getCanonicalWorldContinents(entries)
}

/**
 * Resolve the effective user Continent order from supplied World metadata.
 * Storage is deliberately not consulted here; callers inject the metadata
 * they read.
 */
export function getContinentsInEffectiveOrder(
  entries: readonly Country[] = countries,
  metadata?: { continentOrder: readonly WorldMetadata['continentOrder'][number][] } | null,
): Continent[] {
  return resolveWorldContinentOrder(entries, metadata)
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
  metadata?: { subregionId: SubregionId; countryOrder: readonly CountryId[] } | null,
): Country[] {
  return resolveSubregionCountryOrder(subregionId, entries, metadata)
}

/**
 * Resolve the effective user Subregion order from supplied Continent metadata.
 * Storage is deliberately not consulted here; callers inject the metadata.
 */
export function getSubregionsForContinentInEffectiveOrder(
  continent: Continent | string,
  entries: readonly Country[] = countries,
  metadata?: { continentId: ContinentId; subregionOrder: readonly SubregionId[] } | null,
): SubregionDefinition[] {
  return resolveContinentSubregionOrder(continent, entries, metadata)
}
