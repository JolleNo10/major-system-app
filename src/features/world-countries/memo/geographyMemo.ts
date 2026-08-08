import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import {
  getSubregionDefinition,
  subregionDefinitionFor,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  countrySubregionId,
  getCanonicalSubregionCountries,
  resolveSubregionCountryOrder,
} from '@/features/world-countries/subregions/subregionMetadata'
import { getSubregionMetadata } from '@/features/world-countries/subregions/subregionMetadataStore'

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)]
}
/** Return the Continents in the canonical order used by the country dataset. */
export function getContinents(entries: readonly Country[] = countries): Continent[] {
  return unique(entries.map(entry => entry.continent))
}

export function getCountriesForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): Country[] {
  return entries.filter(entry => entry.continent === continent)
}

export function getSubregionsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): string[] {
  return getSubregionIdsForContinent(continent, entries)
    .map(id => getSubregionDefinition(id).label)
}

/** Return stable Subregion IDs in the canonical order of the country records. */
export function getSubregionIdsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): SubregionId[] {
  return unique(
    getCountriesForContinent(continent, entries)
      .map(countrySubregionId)
      .filter((id): id is SubregionId => Boolean(id)),
  )
}

export function getSubregionDefinitionsForContinent(
  continent: Continent | string,
  entries: readonly Country[] = countries,
) {
  return getSubregionIdsForContinent(continent, entries).map(getSubregionDefinition)
}

export function getCountriesForSubregion(
  continent: Continent | string,
  subregion: SubregionId | string,
  entries: readonly Country[] = countries,
): Country[] {
  const id = subregionDefinitionFor(subregion)?.id
  return entries.filter(entry => entry.continent === continent && (
    id ? countrySubregionId(entry) === id : entry.subregion === subregion
  ))
}

export function getCountriesForSubregionId(
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
): Country[] {
  return getCanonicalSubregionCountries(subregionId, entries)
}

/** Read the shared Subregion order for workflow consumers. */
export function getCountriesForSubregionInEffectiveOrder(
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
): Country[] {
  return resolveSubregionCountryOrder(subregionId, entries, getSubregionMetadata(subregionId))
}

export function getSubregionGroups(
  continent: Continent | string,
  entries: readonly Country[] = countries,
): Array<{ name: string; countries: Country[] }> {
  return getSubregionsForContinent(continent, entries).map(name => ({
    name,
    countries: getCountriesForSubregion(continent, name, entries),
  }))
}
