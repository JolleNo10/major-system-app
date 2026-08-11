import { readJSON, safeSet } from '@/core/storage'
import { countries, type Country, type CountryId } from '@/features/world-countries/data/countries'
import {
  isSubregionId,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import {
  normalizeSubregionMetadata,
  type SubregionMetadata,
} from '@/features/world-countries/geography/subregionMetadata'

export const SUBREGION_METADATA_STORAGE_KEY = 'world-countries-subregion-metadata'

function readStoredMetadata(): SubregionMetadata[] {
  const raw = readJSON<unknown>(SUBREGION_METADATA_STORAGE_KEY, [])
  if (!Array.isArray(raw)) return []
  const rows: SubregionMetadata[] = []
  const seen = new Set<SubregionId>()
  for (const value of raw) {
    try {
      const row = normalizeSubregionMetadata(value)
      if (seen.has(row.subregionId)) continue
      seen.add(row.subregionId)
      rows.push(row)
    } catch {
      // Ignore malformed persisted rows so one bad record cannot hide the rest.
    }
  }
  return rows
}

function writeMetadata(rows: readonly SubregionMetadata[]): void {
  safeSet(SUBREGION_METADATA_STORAGE_KEY, JSON.stringify(rows))
}

export function getAllSubregionMetadata(): SubregionMetadata[] {
  return readStoredMetadata().map(row => ({ ...row, countryOrder: [...row.countryOrder] }))
}

export function getSubregionMetadata(subregionId: SubregionId): SubregionMetadata | null {
  const row = readStoredMetadata().find(candidate => candidate.subregionId === subregionId)
  return row ? { ...row, countryOrder: [...row.countryOrder] } : null
}

export function setSubregionMetadata(metadata: SubregionMetadata): void {
  const normalized = normalizeSubregionMetadata(metadata)
  const rows = readStoredMetadata().filter(row => row.subregionId !== normalized.subregionId)
  rows.push(normalized)
  writeMetadata(rows)
}

export function setSubregionCountryOrder(
  subregionId: SubregionId,
  countryIds: readonly CountryId[],
  visibleCountries: readonly Country[] = countries,
): void {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  const orderedIds = [...new Set(countryIds.filter(id => id.trim().length > 0))]
  const canonicalIds = countries
    .filter(country => country.subregionId === subregionId)
    .map(country => country.id)
  const visibleIds = new Set(visibleCountries
    .filter(country => country.subregionId === subregionId)
    .map(country => country.id))
  const isFullMembership = canonicalIds.every(id => visibleIds.has(id))
  const existing = getSubregionMetadata(subregionId)?.countryOrder ?? canonicalIds
  const persistedIds = isFullMembership
    ? orderedIds
    : mergeVisibleCountryOrder(existing, orderedIds, visibleIds, canonicalIds)
  setSubregionMetadata({
    subregionId,
    countryOrder: persistedIds,
    updatedAt: Date.now(),
  })
}

function mergeVisibleCountryOrder(
  previousOrder: readonly CountryId[],
  visibleOrder: readonly CountryId[],
  visibleIds: ReadonlySet<CountryId>,
  canonicalIds: readonly CountryId[],
): CountryId[] {
  const nextVisible = [...visibleOrder]
  const result: CountryId[] = []
  let visibleIndex = 0
  for (const id of previousOrder) {
    if (visibleIds.has(id)) {
      const replacement = nextVisible[visibleIndex++]
      if (replacement !== undefined && !result.includes(replacement)) result.push(replacement)
    } else if (!result.includes(id)) {
      result.push(id)
    }
  }
  for (const id of nextVisible.slice(visibleIndex)) {
    if (!result.includes(id)) result.push(id)
  }
  for (const id of canonicalIds) {
    if (!result.includes(id)) result.push(id)
  }
  return result
}

export function resetSubregionCountryOrder(subregionId: SubregionId): void {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  writeMetadata(readStoredMetadata().filter(row => row.subregionId !== subregionId))
}

/** Apply already-validated import rows deterministically, with last row winning. */
export function importSubregionMetadata(rows: readonly SubregionMetadata[]): number {
  const existing = new Map(readStoredMetadata().map(row => [row.subregionId, row]))
  for (const row of rows) existing.set(row.subregionId, normalizeSubregionMetadata(row))
  writeMetadata([...existing.values()])
  return rows.length
}
