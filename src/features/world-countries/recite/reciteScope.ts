import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import {
  getCountriesForSubregionInEffectiveOrder,
  getSubregionsForContinentInEffectiveOrder,
} from '@/features/world-countries/geography/queries'
import type { ContinentMetadata } from '@/features/world-countries/geography/continentMetadata'
import type { SubregionMetadata } from '@/features/world-countries/geography/subregionMetadata'

export interface WorldCountriesReciteScope {
  countryIds: readonly CountryId[]
  totalCountries: number
}

/** Build a stable recitation scope from the shell-provided active population. */
export function createWorldCountriesReciteScope(
  countries: readonly Pick<{ id: CountryId }, 'id'>[],
): WorldCountriesReciteScope {
  const countryIds = [...new Set(countries.map(country => country.id))]
  return { countryIds, totalCountries: countryIds.length }
}

/** Resolve a Recite scope from Geography's effective hierarchy order. */
export function getCountriesForReciteSelectionInEffectiveOrder(
  continent: Continent,
  selectedSubregionIds: readonly SubregionId[],
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
  subregionMetadata: readonly Pick<SubregionMetadata, 'subregionId' | 'countryOrder'>[] = [],
): Country[] {
  const selected = new Set(selectedSubregionIds)
  const metadataBySubregionId = new Map(subregionMetadata.map(metadata => [metadata.subregionId, metadata]))
  const seen = new Set<CountryId>()
  const result: Country[] = []

  for (const subregion of getSubregionsForContinentInEffectiveOrder(continent, activeCountries, continentMetadata)) {
    if (!selected.has(subregion.id)) continue
    for (const country of getCountriesForSubregionInEffectiveOrder(
      subregion.id,
      activeCountries,
      metadataBySubregionId.get(subregion.id),
    )) {
      if (seen.has(country.id)) continue
      seen.add(country.id)
      result.push(country)
    }
  }

  return result
}

export function getReciteSubregionsInEffectiveOrder(
  continent: Continent,
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
): readonly SubregionDefinition[] {
  return getSubregionsForContinentInEffectiveOrder(continent, activeCountries, continentMetadata)
}

export function normalizeReciteSubregionSelection(
  continent: Continent,
  selectedSubregionIds: readonly SubregionId[],
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
): SubregionId[] {
  const selected = new Set(selectedSubregionIds)
  return getReciteSubregionsInEffectiveOrder(continent, activeCountries, continentMetadata)
    .map(subregion => subregion.id)
    .filter(id => selected.has(id))
}

export function isEntireContinentReciteSelection(
  continent: Continent,
  selectedSubregionIds: readonly SubregionId[],
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
): boolean {
  const allIds = getReciteSubregionsInEffectiveOrder(continent, activeCountries, continentMetadata).map(subregion => subregion.id)
  const selectedIds = normalizeReciteSubregionSelection(continent, selectedSubregionIds, activeCountries, continentMetadata)
  return allIds.length > 0 && allIds.length === selectedIds.length && allIds.every(id => selectedIds.includes(id))
}

export function toggleReciteSubregionSelection(
  continent: Continent,
  selectedSubregionIds: readonly SubregionId[],
  subregionId: SubregionId,
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
): SubregionId[] {
  const selected = new Set(normalizeReciteSubregionSelection(continent, selectedSubregionIds, activeCountries, continentMetadata))
  if (selected.has(subregionId)) selected.delete(subregionId)
  else selected.add(subregionId)
  return normalizeReciteSubregionSelection(continent, [...selected], activeCountries, continentMetadata)
}

export function toggleEntireContinentReciteSelection(
  continent: Continent,
  selectedSubregionIds: readonly SubregionId[],
  activeCountries: readonly Country[],
  continentMetadata?: Pick<ContinentMetadata, 'continentId' | 'subregionOrder'> | null,
): SubregionId[] {
  if (isEntireContinentReciteSelection(continent, selectedSubregionIds, activeCountries, continentMetadata)) return []
  return getReciteSubregionsInEffectiveOrder(continent, activeCountries, continentMetadata).map(subregion => subregion.id)
}
