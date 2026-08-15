import { readJSON, safeRemove, safeSet } from '@/core/storage'
import { isContinentId, type ContinentId } from '@/features/world-countries/data/subregions'
import {
  normalizeWorldMetadata,
  type WorldMetadata,
} from '@/features/world-countries/geography/worldMetadata'
import { notifyWorldCountriesGeographyChanged } from './geographyRefresh'

export const WORLD_METADATA_STORAGE_KEY = 'world-countries-world-metadata'

function readStoredMetadata(): WorldMetadata | null {
  const raw = readJSON<unknown>(WORLD_METADATA_STORAGE_KEY, null)
  if (raw === null) return null
  try {
    return normalizeWorldMetadata(raw)
  } catch {
    return null
  }
}

function writeMetadata(metadata: WorldMetadata): void {
  safeSet(WORLD_METADATA_STORAGE_KEY, JSON.stringify(metadata))
}

function writeMetadataAndVerify(metadata: WorldMetadata): void {
  writeMetadata(metadata)
  if (JSON.stringify(readStoredMetadata()) !== JSON.stringify(metadata)) {
    throw new Error('World geography order could not be saved')
  }
}

export function getWorldMetadata(): WorldMetadata | null {
  const metadata = readStoredMetadata()
  return metadata ? { ...metadata, continentOrder: [...metadata.continentOrder] } : null
}

export function setWorldMetadata(metadata: WorldMetadata): void {
  const normalized = normalizeWorldMetadata(metadata)
  writeMetadata(normalized)
  notifyWorldCountriesGeographyChanged()
}

export function setWorldContinentOrder(continentIds: readonly ContinentId[]): void {
  if (continentIds.some(id => !isContinentId(id))) throw new Error('Unknown Continent ID')
  setWorldMetadata({
    continentOrder: [...new Set(continentIds)],
    updatedAt: Date.now(),
  })
}

export function resetWorldContinentOrder(): void {
  safeRemove(WORLD_METADATA_STORAGE_KEY)
  if (getWorldMetadata() !== null) throw new Error('World geography order could not be reset')
  notifyWorldCountriesGeographyChanged()
}

export function importWorldMetadata(metadata: WorldMetadata): void {
  setWorldMetadata(metadata)
}

/** Replace the complete saved World order without emitting until the full restore succeeds. */
export function replaceWorldMetadata(metadata: WorldMetadata | null): void {
  if (metadata === null) {
    safeRemove(WORLD_METADATA_STORAGE_KEY)
    if (getWorldMetadata() !== null) throw new Error('World geography order could not be reset')
    return
  }
  writeMetadataAndVerify(normalizeWorldMetadata(metadata))
}
