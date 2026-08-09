import { readJSON, safeSet } from '@/core/storage'
import type { Continent } from '@/features/world-countries/data/countries'
import {
  continentIdFor,
  type ContinentId,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  normalizeContinentMetadata,
  type ContinentMetadata,
} from '@/features/world-countries/geography/continentMetadata'

export const CONTINENT_METADATA_STORAGE_KEY = 'world-countries-continent-metadata'

function readStoredMetadata(): ContinentMetadata[] {
  const raw = readJSON<unknown>(CONTINENT_METADATA_STORAGE_KEY, [])
  if (!Array.isArray(raw)) return []
  const rows: ContinentMetadata[] = []
  const seen = new Set<ContinentId>()
  for (const value of raw) {
    try {
      const row = normalizeContinentMetadata(value)
      if (seen.has(row.continentId)) continue
      seen.add(row.continentId)
      rows.push(row)
    } catch {
      // Ignore malformed persisted rows so one bad record cannot hide the rest.
    }
  }
  return rows
}

function writeMetadata(rows: readonly ContinentMetadata[]): void {
  safeSet(CONTINENT_METADATA_STORAGE_KEY, JSON.stringify(rows))
}

export function getAllContinentMetadata(): ContinentMetadata[] {
  return readStoredMetadata().map(row => ({ ...row, subregionOrder: [...row.subregionOrder] }))
}

export function getContinentMetadata(continent: Continent | string): ContinentMetadata | null {
  const continentId = continentIdFor(continent)
  if (!continentId) return null
  const row = readStoredMetadata().find(candidate => candidate.continentId === continentId)
  return row ? { ...row, subregionOrder: [...row.subregionOrder] } : null
}

export function setContinentMetadata(metadata: ContinentMetadata): void {
  const normalized = normalizeContinentMetadata(metadata)
  const rows = readStoredMetadata().filter(row => row.continentId !== normalized.continentId)
  rows.push(normalized)
  writeMetadata(rows)
}

export function setContinentSubregionOrder(
  continent: Continent | string,
  subregionIds: readonly SubregionId[],
): void {
  const continentId = continentIdFor(continent)
  if (!continentId) throw new Error(`Unknown Continent: ${continent}`)
  setContinentMetadata({
    continentId,
    subregionOrder: [...new Set(subregionIds.filter(id => id.trim().length > 0))],
    updatedAt: Date.now(),
  })
}

export function resetContinentSubregionOrder(continent: Continent | string): void {
  const continentId = continentIdFor(continent)
  if (!continentId) throw new Error(`Unknown Continent: ${continent}`)
  writeMetadata(readStoredMetadata().filter(row => row.continentId !== continentId))
}

/** Apply already-validated import rows deterministically, with last row winning. */
export function importContinentMetadata(rows: readonly ContinentMetadata[]): number {
  const existing = new Map(readStoredMetadata().map(row => [row.continentId, row]))
  for (const row of rows) existing.set(row.continentId, normalizeContinentMetadata(row))
  writeMetadata([...existing.values()])
  return rows.length
}
