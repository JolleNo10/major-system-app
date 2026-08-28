import {
  countries,
  type Continent,
  type Country,
  type CountryId,
} from '@/features/world-countries/data/countries'
import {
  continentIdFor,
  type ContinentId,
  type SubregionDefinition,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  getCountriesForSubregionInEffectiveOrder,
  getContinentsInEffectiveOrder,
  getSubregionsForContinentInEffectiveOrder,
} from '@/features/world-countries/geography/queries'

export interface WorldCountriesDrillSelection {
  subregionIds: readonly SubregionId[]
}

/** Metadata needed to resolve the effective World-wide Drill order. */
export interface DrillSelectionMetadata {
  world?: { continentOrder: readonly ContinentId[] } | null
  continents?: readonly { continentId: ContinentId; subregionOrder: readonly SubregionId[] }[]
  subregions?: readonly { subregionId: SubregionId; countryOrder: readonly CountryId[] }[]
}

export type DrillContinentSelectionState = 'none' | 'partial' | 'all'

export interface WorldCountriesDrillSelectionCounts {
  continents: number
  subregions: number
  countries: number
}

export function getDrillSubregions(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): SubregionDefinition[] {
  return getSubregionsForContinentInEffectiveOrder(
    continent,
    entries,
    getContinentMetadata(continent, metadata),
  )
}

export function getAllDrillSubregionIds(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): SubregionId[] {
  return getDrillSubregions(continent, entries, metadata).map(subregion => subregion.id)
}

export function createDrillSelection(
  subregionIds: readonly SubregionId[] = [],
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return normalizeDrillSelection({ subregionIds }, entries, metadata)
}

/** Keep only current canonical Subregions represented by the active Country population. */
export function normalizeDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  const currentIds = getContinentsInEffectiveOrder(entries, metadata?.world)
    .flatMap(continent => getAllDrillSubregionIds(continent, entries, metadata))
  const selected = new Set(selection.subregionIds)
  return { subregionIds: currentIds.filter(id => selected.has(id)) }
}

/** Derive the selected Country population in the active effective geography order. */
export function getCountriesForDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): Country[] {
  return getCountriesForDrillSelectionInEffectiveOrder(selection, entries, metadata)
}

/** Resolve selected Countries through effective World -> Continent -> Subregion order. */
export function getCountriesForDrillSelectionInEffectiveOrder(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): Country[] {
  const normalized = normalizeDrillSelection(selection, entries, metadata)
  const selected = new Set(normalized.subregionIds)
  const metadataBySubregionId = new Map((metadata?.subregions ?? []).map(row => [row.subregionId, row]))

  return getContinentsInEffectiveOrder(entries, metadata?.world)
    .flatMap(continent => getDrillSubregions(continent, entries, metadata))
    .filter(subregion => selected.has(subregion.id))
    .flatMap(subregion => getCountriesForSubregionInEffectiveOrder(
      subregion.id,
      entries,
      metadataBySubregionId.get(subregion.id),
    ))
}

export function getContinentSelectionState(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): DrillContinentSelectionState {
  const normalized = normalizeDrillSelection(selection, entries, metadata)
  const subregionIds = getAllDrillSubregionIds(continent, entries, metadata)
  const selected = new Set(normalized.subregionIds)
  const selectedCount = subregionIds.filter(id => selected.has(id)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === subregionIds.length) return 'all'
  return 'partial'
}

export function isEntireContinentSelection(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): boolean {
  return getContinentSelectionState(selection, continent, entries, metadata) === 'all'
}

/** Return a selection containing every current Subregion in one Continent. */
export function withAllDrillSubregions(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return createDrillSelection(getAllDrillSubregionIds(continent, entries, metadata), entries, metadata)
}

export function withoutDrillSubregions(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  const continentIds = new Set(getAllDrillSubregionIds(continent, entries, metadata))
  const normalized = normalizeDrillSelection(selection, entries, metadata)
  return createDrillSelection(
    normalized.subregionIds.filter(id => !continentIds.has(id)),
    entries,
    metadata,
  )
}

/** Select every current Subregion in one Continent while preserving other Continents. */
export function withAllDrillSubregionsForContinent(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return createDrillSelection(
    [...normalizeDrillSelection(selection, entries, metadata).subregionIds, ...getAllDrillSubregionIds(continent, entries, metadata)],
    entries,
    metadata,
  )
}

/** Clear only one Continent while preserving other Continents. */
export function withoutDrillSubregionsForContinent(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return withoutDrillSubregions(selection, continent, entries, metadata)
}

/** Partial and empty Continent selections select all; a full selection clears only that Continent. */
export function toggleEntireContinentSelection(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return isEntireContinentSelection(selection, continent, entries, metadata)
    ? withoutDrillSubregionsForContinent(selection, continent, entries, metadata)
    : withAllDrillSubregionsForContinent(selection, continent, entries, metadata)
}

export function toggleDrillSubregion(
  selection: WorldCountriesDrillSelection,
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  const normalized = normalizeDrillSelection(selection, entries, metadata)
  const selected = new Set(normalized.subregionIds)
  if (selected.has(subregionId)) selected.delete(subregionId)
  else selected.add(subregionId)
  return createDrillSelection([...selected], entries, metadata)
}

export function selectAllDrillSubregions(
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return createDrillSelection(
    getContinentsInEffectiveOrder(entries, metadata?.world)
      .flatMap(continent => getAllDrillSubregionIds(continent, entries, metadata)),
    entries,
    metadata,
  )
}

export function clearDrillSelection(): WorldCountriesDrillSelection {
  return { subregionIds: [] }
}

export function getDrillSelectionCounts(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelectionCounts {
  const normalized = normalizeDrillSelection(selection, entries, metadata)
  const continents = getContinentsInEffectiveOrder(entries, metadata?.world)
    .filter(continent => getContinentSelectionState(normalized, continent, entries, metadata) !== 'none')
    .length
  return {
    continents,
    subregions: normalized.subregionIds.length,
    countries: getCountriesForDrillSelectionInEffectiveOrder(normalized, entries, metadata).length,
  }
}

export function getSelectedContinentCount(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): number {
  return getDrillSelectionCounts(selection, entries, metadata).continents
}

export function getSelectedSubregionCount(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): number {
  return getDrillSelectionCounts(selection, entries, metadata).subregions
}

export function getSelectedCountryCount(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): number {
  return getDrillSelectionCounts(selection, entries, metadata).countries
}

/** Describe the actual Country population without assuming one navigation Continent. */
export function getDrillSelectionScopeLabel(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[],
): string {
  const continents = [...new Set(getCountriesForDrillSelection(selection, entries).map(country => country.continent))]
  return continents.length === 1 ? continents[0]! : 'World'
}

function getContinentMetadata(
  continent: Continent,
  metadata?: DrillSelectionMetadata,
): { continentId: ContinentId; subregionOrder: readonly SubregionId[] } | null {
  const continentId = continentIdFor(continent)
  return metadata?.continents?.find(row => row.continentId === continentId) ?? null
}
