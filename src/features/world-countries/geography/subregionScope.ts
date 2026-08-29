import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import { continentIdFor, type ContinentId, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder, getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from './queries'

export interface WorldCountriesSubregionScope {
  subregionIds: readonly SubregionId[]
}

/** Metadata required to resolve effective World-wide geography order. */
export interface WorldCountriesSubregionScopeMetadata {
  world?: { continentOrder: readonly ContinentId[] } | null
  continents?: readonly { continentId: ContinentId; subregionOrder: readonly SubregionId[] }[]
  subregions?: readonly { subregionId: SubregionId; countryOrder: readonly CountryId[] }[]
}

export type ContinentScopeState = 'none' | 'partial' | 'all'

export interface WorldCountriesSubregionScopeCounts {
  continents: number
  subregions: number
  countries: number
}

export interface WorldCountriesContinentSubregionScopeCounts {
  selectedSubregions: number
  totalSubregions: number
  countries: number
}

export function getSubregionsForScopeContinent(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): SubregionDefinition[] {
  return getSubregionsForContinentInEffectiveOrder(continent, entries, getContinentMetadata(continent, metadata))
}

export function getAllSubregionIdsForScopeContinent(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): SubregionId[] {
  return getSubregionsForScopeContinent(continent, entries, metadata).map(subregion => subregion.id)
}

/** Keep only active Subregions and return their membership in effective World order. */
export function normalizeSubregionScope(
  scope: WorldCountriesSubregionScope,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  const currentIds = getContinentsInEffectiveOrder(entries, metadata?.world)
    .flatMap(continent => getAllSubregionIdsForScopeContinent(continent, entries, metadata))
  const selected = new Set(scope.subregionIds)
  return { subregionIds: currentIds.filter(id => selected.has(id)) }
}

export function getCountriesForSubregionScopeInEffectiveOrder(
  scope: WorldCountriesSubregionScope,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): Country[] {
  const normalized = normalizeSubregionScope(scope, entries, metadata)
  const selected = new Set(normalized.subregionIds)
  const metadataBySubregionId = new Map((metadata?.subregions ?? []).map(row => [row.subregionId, row]))
  const seen = new Set<CountryId>()
  const result: Country[] = []

  for (const continent of getContinentsInEffectiveOrder(entries, metadata?.world)) {
    for (const subregion of getSubregionsForScopeContinent(continent, entries, metadata)) {
      if (!selected.has(subregion.id)) continue
      for (const country of getCountriesForSubregionInEffectiveOrder(
        subregion.id,
        entries,
        metadataBySubregionId.get(subregion.id),
      )) {
        if (seen.has(country.id)) continue
        seen.add(country.id)
        result.push(country)
      }
    }
  }

  return result
}

export function getContinentScopeState(
  scope: WorldCountriesSubregionScope,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): ContinentScopeState {
  const continentIds = getAllSubregionIdsForScopeContinent(continent, entries, metadata)
  if (continentIds.length === 0) return 'none'
  const selected = new Set(normalizeSubregionScope(scope, entries, metadata).subregionIds)
  const selectedCount = continentIds.filter(id => selected.has(id)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === continentIds.length) return 'all'
  return 'partial'
}

export function getContinentSubregionScopeCounts(
  scope: WorldCountriesSubregionScope,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesContinentSubregionScopeCounts {
  const subregionIds = getAllSubregionIdsForScopeContinent(continent, entries, metadata)
  const selected = new Set(normalizeSubregionScope(scope, entries, metadata).subregionIds)
  return {
    selectedSubregions: subregionIds.filter(id => selected.has(id)).length,
    totalSubregions: subregionIds.length,
    countries: getCountriesForSubregionScopeInEffectiveOrder(
      { subregionIds: subregionIds.filter(id => selected.has(id)) },
      entries,
      metadata,
    ).length,
  }
}

/** Select all active Subregions in a Continent, preserving the rest of the World scope. */
export function addAllSubregionsForContinent(
  scope: WorldCountriesSubregionScope,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  return normalizeSubregionScope({
    subregionIds: [
      ...normalizeSubregionScope(scope, entries, metadata).subregionIds,
      ...getAllSubregionIdsForScopeContinent(continent, entries, metadata),
    ],
  }, entries, metadata)
}

/** Clear only one Continent while preserving the rest of the World scope. */
export function removeAllSubregionsForContinent(
  scope: WorldCountriesSubregionScope,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  const continentIds = new Set(getAllSubregionIdsForScopeContinent(continent, entries, metadata))
  return normalizeSubregionScope({
    subregionIds: normalizeSubregionScope(scope, entries, metadata).subregionIds.filter(id => !continentIds.has(id)),
  }, entries, metadata)
}

/** Empty and partial Continents select all; a full Continent clears only itself. */
export function toggleContinentInScope(
  scope: WorldCountriesSubregionScope,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  return getContinentScopeState(scope, continent, entries, metadata) === 'all'
    ? removeAllSubregionsForContinent(scope, continent, entries, metadata)
    : addAllSubregionsForContinent(scope, continent, entries, metadata)
}

export function toggleSubregionInScope(
  scope: WorldCountriesSubregionScope,
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  const normalized = normalizeSubregionScope(scope, entries, metadata)
  const selected = new Set(normalized.subregionIds)
  if (selected.has(subregionId)) selected.delete(subregionId)
  else selected.add(subregionId)
  return normalizeSubregionScope({ subregionIds: [...selected] }, entries, metadata)
}

export function selectAllSubregions(
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScope {
  return {
    subregionIds: getContinentsInEffectiveOrder(entries, metadata?.world)
      .flatMap(continent => getAllSubregionIdsForScopeContinent(continent, entries, metadata)),
  }
}

export function clearSubregionScope(): WorldCountriesSubregionScope {
  return { subregionIds: [] }
}

export function getSubregionScopeCounts(
  scope: WorldCountriesSubregionScope,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): WorldCountriesSubregionScopeCounts {
  const normalized = normalizeSubregionScope(scope, entries, metadata)
  const continents = getContinentsInEffectiveOrder(entries, metadata?.world)
    .filter(continent => getContinentScopeState(normalized, continent, entries, metadata) !== 'none')
    .length
  return {
    continents,
    subregions: normalized.subregionIds.length,
    countries: getCountriesForSubregionScopeInEffectiveOrder(normalized, entries, metadata).length,
  }
}

export function getSubregionScopeLabel(
  scope: WorldCountriesSubregionScope,
  entries: readonly Country[] = countries,
  metadata?: WorldCountriesSubregionScopeMetadata,
): string {
  const continents = [...new Set(getCountriesForSubregionScopeInEffectiveOrder(scope, entries, metadata).map(country => country.continent))]
  return continents.length === 1 ? continents[0]! : 'World'
}

function getContinentMetadata(
  continent: Continent,
  metadata?: WorldCountriesSubregionScopeMetadata,
): { continentId: ContinentId; subregionOrder: readonly SubregionId[] } | null {
  const continentId = continentIdFor(continent)
  return metadata?.continents?.find(row => row.continentId === continentId) ?? null
}
