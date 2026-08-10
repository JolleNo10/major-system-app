import {
  countries,
  type Continent,
  type Country,
} from '@/features/world-countries/data/countries'
import {
  getSubregionDefinitionsForContinent,
  getSubregionIdsForContinent,
  getContinents,
} from '@/features/world-countries/geography/queries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'

export interface WorldCountriesDrillSelection {
  continent: Continent
  subregionIds: readonly SubregionId[]
}

export function isDrillContinent(value: unknown, entries: readonly Country[] = countries): value is Continent {
  return typeof value === 'string' && getContinents(entries).includes(value as Continent)
}

export function getDrillSubregions(
  continent: Continent,
  entries: readonly Country[] = countries,
): SubregionDefinition[] {
  return getSubregionDefinitionsForContinent(continent, entries)
}

export function getAllDrillSubregionIds(
  continent: Continent,
  entries: readonly Country[] = countries,
): SubregionId[] {
  return getSubregionIdsForContinent(continent, entries)
}

export function createDrillSelection(
  continent: Continent,
  subregionIds: readonly SubregionId[] = getAllDrillSubregionIds(continent),
  entries: readonly Country[] = countries,
): WorldCountriesDrillSelection {
  return normalizeDrillSelection({ continent, subregionIds }, entries)
}

/** Keep only current canonical Subregions belonging to the selected Continent. */
export function normalizeDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
): WorldCountriesDrillSelection {
  const currentIds = getAllDrillSubregionIds(selection.continent, entries)
  const selected = new Set(selection.subregionIds)
  return {
    continent: selection.continent,
    subregionIds: currentIds.filter(id => selected.has(id)),
  }
}

/** Derive membership from canonical Country geography; no flattened scope is stored. */
export function getCountriesForDrillSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
): Country[] {
  const normalized = normalizeDrillSelection(selection, entries)
  const selected = new Set(normalized.subregionIds)
  return entries.filter(country => country.continent === normalized.continent && selected.has(country.subregionId))
}

export function isEntireContinentSelection(
  selection: WorldCountriesDrillSelection,
  entries: readonly Country[] = countries,
): boolean {
  const allIds = getAllDrillSubregionIds(selection.continent, entries)
  const selectedIds = normalizeDrillSelection(selection, entries).subregionIds
  return allIds.length === selectedIds.length && allIds.every(id => selectedIds.includes(id))
}

export function withAllDrillSubregions(
  continent: Continent,
  entries: readonly Country[] = countries,
): WorldCountriesDrillSelection {
  return createDrillSelection(continent, getAllDrillSubregionIds(continent, entries), entries)
}

export function toggleDrillSubregion(
  selection: WorldCountriesDrillSelection,
  subregionId: SubregionId,
  entries: readonly Country[] = countries,
): WorldCountriesDrillSelection {
  const normalized = normalizeDrillSelection(selection, entries)
  const selected = new Set(normalized.subregionIds)
  if (selected.has(subregionId)) selected.delete(subregionId)
  else selected.add(subregionId)
  return createDrillSelection(normalized.continent, [...selected], entries)
}
