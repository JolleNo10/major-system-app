import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import {
  addAllSubregionsForContinent,
  clearSubregionScope,
  getAllSubregionIdsForScopeContinent,
  getContinentScopeState,
  getCountriesForSubregionScopeInEffectiveOrder,
  getSubregionScopeCounts,
  getSubregionScopeLabel,
  getSubregionsForScopeContinent,
  normalizeSubregionScope,
  removeAllSubregionsForContinent,
  selectAllSubregions,
  toggleContinentInScope,
  toggleSubregionInScope,
  type ContinentScopeState,
  type WorldCountriesSubregionScope,
  type WorldCountriesSubregionScopeCounts,
  type WorldCountriesSubregionScopeMetadata,
} from '@/features/world-countries/geography/subregionScope'

export type WorldCountriesDrillSelection = WorldCountriesSubregionScope
export type DrillSelectionMetadata = WorldCountriesSubregionScopeMetadata
export type DrillContinentSelectionState = ContinentScopeState
export type WorldCountriesDrillSelectionCounts = WorldCountriesSubregionScopeCounts

export function getDrillSubregions(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): SubregionDefinition[] {
  return getSubregionsForScopeContinent(continent, entries, metadata)
}

export function getAllDrillSubregionIds(
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): SubregionId[] {
  return getAllSubregionIdsForScopeContinent(continent, entries, metadata)
}

export function createDrillSelection(
  subregionIds: readonly SubregionId[] = [],
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return normalizeDrillSelection({ subregionIds }, entries, metadata)
}

export function normalizeDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return normalizeSubregionScope(selection, entries, metadata)
}

export function getCountriesForDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): Country[] {
  return getCountriesForSubregionScopeInEffectiveOrder(selection, entries, metadata)
}

export function getCountriesForDrillSelectionInEffectiveOrder(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): Country[] {
  return getCountriesForSubregionScopeInEffectiveOrder(selection, entries, metadata)
}

export function getContinentSelectionState(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): DrillContinentSelectionState {
  return getContinentScopeState(selection, continent, entries, metadata)
}

export function isEntireContinentSelection(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): boolean {
  return getContinentSelectionState(selection, continent, entries, metadata) === 'all'
}

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
  return removeAllSubregionsForContinent(selection, continent, entries, metadata)
}

export function withAllDrillSubregionsForContinent(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return addAllSubregionsForContinent(selection, continent, entries, metadata)
}

export function withoutDrillSubregionsForContinent(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return removeAllSubregionsForContinent(selection, continent, entries, metadata)
}

export function toggleEntireContinentSelection(
  selection: WorldCountriesDrillSelection,
  continent: Continent,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return toggleContinentInScope(selection, continent, entries, metadata)
}

export function toggleDrillSubregion(
  selection: WorldCountriesDrillSelection,
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return toggleSubregionInScope(selection, subregionId, entries, metadata)
}

export function selectAllDrillSubregions(
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelection {
  return selectAllSubregions(entries, metadata)
}

export function clearDrillSelection(): WorldCountriesDrillSelection {
  return clearSubregionScope()
}

export function getDrillSelectionCounts(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): WorldCountriesDrillSelectionCounts {
  return getSubregionScopeCounts(selection, entries, metadata)
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

export function getDrillSelectionScopeLabel(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
  metadata?: DrillSelectionMetadata,
): string {
  return getSubregionScopeLabel(selection, entries, metadata)
}
