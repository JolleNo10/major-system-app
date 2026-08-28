import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import {
  continentIdFor,
  getSubregionDefinition,
  isContinentId,
  type ContinentId,
  type SubregionDefinition,
  type SubregionId,
} from '@/features/world-countries/data/subregions'

export interface ContinentMetadata {
  continentId: ContinentId
  subregionOrder: SubregionId[]
  updatedAt: number
}

/** Return the Continent's Subregions in the canonical order of the country data. */
export function getCanonicalContinentSubregions(
  continent: Continent | string,
  availableCountries: readonly Country[] = countries,
): SubregionDefinition[] {
  const seen = new Set<SubregionId>()
  const result: SubregionDefinition[] = []
  for (const country of availableCountries) {
    if (country.continent !== continent || seen.has(country.subregionId)) continue
    seen.add(country.subregionId)
    result.push(getSubregionDefinition(country.subregionId))
  }
  return result
}

/**
 * Resolve the user-authored Subregion order without changing metadata while
 * reading it. Stored IDs are filtered to current membership, then new members
 * are appended in the current canonical dataset order.
 */
export function resolveContinentSubregionOrder(
  continent: Continent | string,
  availableCountries: readonly Country[] = countries,
  metadata?: { continentId: ContinentId; subregionOrder: readonly SubregionId[] } | null,
): SubregionDefinition[] {
  const canonical = getCanonicalContinentSubregions(continent, availableCountries)
  const continentId = continentIdFor(continent)
  if (!metadata || !continentId || metadata.continentId !== continentId) return canonical

  const currentById = new Map(canonical.map(subregion => [subregion.id, subregion]))
  const ordered: SubregionDefinition[] = []
  const included = new Set<SubregionId>()
  for (const storedId of metadata.subregionOrder) {
    const subregion = currentById.get(storedId)
    if (!subregion || included.has(storedId)) continue
    ordered.push(subregion)
    included.add(storedId)
  }
  for (const subregion of canonical) {
    if (included.has(subregion.id)) continue
    ordered.push(subregion)
    included.add(subregion.id)
  }
  return ordered
}

export function resolveContinentSubregionIds(
  continent: Continent | string,
  availableCountries: readonly Country[] = countries,
  metadata?: { continentId: ContinentId; subregionOrder: readonly SubregionId[] } | null,
): SubregionId[] {
  return resolveContinentSubregionOrder(continent, availableCountries, metadata).map(subregion => subregion.id)
}

export function isValidContinentMetadata(value: unknown): value is ContinentMetadata {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.continentId === 'string'
    && isContinentId(row.continentId)
    && Array.isArray(row.subregionOrder)
    && row.subregionOrder.every(id => typeof id === 'string' && id.trim().length > 0)
    && typeof row.updatedAt === 'number'
    && Number.isFinite(row.updatedAt)
}

/** Validate and normalize imported metadata without consulting current membership. */
export function normalizeContinentMetadata(value: unknown): ContinentMetadata {
  if (!isValidContinentMetadata(value)) throw new Error('Invalid Continent metadata')
  const row = value as ContinentMetadata
  return {
    continentId: row.continentId,
    subregionOrder: [...new Set(row.subregionOrder)],
    updatedAt: row.updatedAt,
  }
}
