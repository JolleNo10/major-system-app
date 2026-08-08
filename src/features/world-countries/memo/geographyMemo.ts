import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'

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
  return unique(getCountriesForContinent(continent, entries).map(entry => entry.subregion))
}

export function getCountriesForSubregion(
  continent: Continent | string,
  subregion: string,
  entries: readonly Country[] = countries,
): Country[] {
  return entries.filter(entry => entry.continent === continent && entry.subregion === subregion)
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
