import type { Continent, Country } from '@/features/world-countries/data/countries'

export interface ContinentGroup {
  continent: Continent
  countries: readonly Country[]
}

/**
 * Group countries by continent and derive a scope label.
 *
 * Returns `scopeLabel = continent` when all countries share a single continent,
 * and `scopeLabel = 'World'` when they span multiple continents.
 */
export function groupCountriesByContinentWithLabel(countries: readonly Country[]): {
  continentGroups: ContinentGroup[]
  scopeLabel: string
} {
  const continentGroups = [...new Set(countries.map(c => c.continent))].map(continent => ({
    continent,
    countries: countries.filter(c => c.continent === continent),
  }))
  const scopeLabel = continentGroups.length === 1 ? continentGroups[0]!.continent : 'World'
  return { continentGroups, scopeLabel }
}
