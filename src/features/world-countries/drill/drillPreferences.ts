import { readJSON, safeSet } from '@/core/storage'
import { countries } from '@/features/world-countries/data/countries'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getAllContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  createDrillSelection,
  normalizeDrillSelection,
  type DrillSelectionMetadata,
  type WorldCountriesDrillSelection,
} from './drillSelection'
import {
  isWorldCountriesDrillMode,
  type WorldCountriesDrillMode,
} from './drillModes'
import {
  isWorldCountriesDrillOrder,
  type WorldCountriesDrillOrder,
} from './drillOrder'

export const DRILL_PREFERENCES_STORAGE_KEY = 'world-countries-drill-preferences'

export interface WorldCountriesDrillPreferences extends WorldCountriesDrillSelection {
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
}

function defaultPreferences(): WorldCountriesDrillPreferences {
  return { ...createDrillSelection(), mode: 'countries-capitals', order: 'ordered' }
}

function getSelectionMetadata(): DrillSelectionMetadata {
  return {
    world: getWorldMetadata(),
    continents: getAllContinentMetadata(),
    subregions: getAllSubregionMetadata(),
  }
}

export function loadDrillPreferences(): WorldCountriesDrillPreferences {
  const fallback = defaultPreferences()
  const raw = readJSON<unknown>(DRILL_PREFERENCES_STORAGE_KEY, null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
  const row = raw as Record<string, unknown>
  const subregionIds: readonly SubregionId[] = Array.isArray(row.subregionIds)
    ? row.subregionIds.filter((id): id is SubregionId => typeof id === 'string' && isSubregionId(id))
    : []
  const mode = typeof row.mode === 'string' && isWorldCountriesDrillMode(row.mode)
    ? row.mode
    : fallback.mode
  const order = typeof row.order === 'string' && isWorldCountriesDrillOrder(row.order)
    ? row.order
    : fallback.order
  const selection = normalizeDrillSelection({ subregionIds }, countries, getSelectionMetadata())
  return { ...selection, mode, order }
}

export function saveDrillPreferences(preferences: WorldCountriesDrillPreferences): void {
  const selection = normalizeDrillSelection(preferences, countries, getSelectionMetadata())
  safeSet(DRILL_PREFERENCES_STORAGE_KEY, JSON.stringify({
    subregionIds: [...selection.subregionIds],
    mode: preferences.mode,
    order: preferences.order,
  }))
}
