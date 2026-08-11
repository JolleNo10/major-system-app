import { readJSON, safeRemove, safeSet } from '@/core/storage'
import { isContinentId, type ContinentId } from '@/features/world-countries/data/subregions'
import {
  normalizeWorldMetadata,
  type WorldMetadata,
} from '@/features/world-countries/geography/worldMetadata'

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

export function getWorldMetadata(): WorldMetadata | null {
  const metadata = readStoredMetadata()
  return metadata ? { ...metadata, continentOrder: [...metadata.continentOrder] } : null
}

export function setWorldMetadata(metadata: WorldMetadata): void {
  writeMetadata(normalizeWorldMetadata(metadata))
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
}

export function importWorldMetadata(metadata: WorldMetadata): void {
  setWorldMetadata(metadata)
}
