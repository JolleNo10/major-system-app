import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import {
  continentIdFor,
  isContinentId,
  type ContinentId,
} from '@/features/world-countries/data/subregions'

export interface WorldMetadata {
  continentOrder: ContinentId[]
  updatedAt: number
}

/** Return Continents in the canonical order of the country data. */
export function getCanonicalWorldContinents(
  currentCountries: readonly Country[] = countries,
): Continent[] {
  return [...new Set(currentCountries.map(country => country.continent))]
}

/**
 * Resolve the user-authored Continent order without changing metadata while
 * reading it. Stored IDs are filtered to current membership, then new
 * Continents are appended in canonical dataset order.
 */
export function resolveWorldContinentOrder(
  currentCountries: readonly Country[] = countries,
  metadata?: { continentOrder: readonly ContinentId[] } | null,
): Continent[] {
  const canonical = getCanonicalWorldContinents(currentCountries)
  if (!metadata) return canonical

  const currentById = new Map<ContinentId, Continent>()
  for (const continent of canonical) {
    const id = continentIdFor(continent)
    if (id) currentById.set(id, continent)
  }

  const ordered: Continent[] = []
  const included = new Set<ContinentId>()
  for (const storedId of metadata.continentOrder) {
    const continent = currentById.get(storedId)
    if (!continent || included.has(storedId)) continue
    ordered.push(continent)
    included.add(storedId)
  }
  for (const continent of canonical) {
    const id = continentIdFor(continent)
    if (!id || included.has(id)) continue
    ordered.push(continent)
    included.add(id)
  }
  return ordered
}

export function resolveWorldContinentIds(
  currentCountries: readonly Country[] = countries,
  metadata?: { continentOrder: readonly ContinentId[] } | null,
): ContinentId[] {
  return resolveWorldContinentOrder(currentCountries, metadata)
    .map(continentIdFor)
    .filter((id): id is ContinentId => id !== undefined)
}

export function isValidWorldMetadata(value: unknown): value is WorldMetadata {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Array.isArray(row.continentOrder)
    && row.continentOrder.every(id => typeof id === 'string' && isContinentId(id))
    && typeof row.updatedAt === 'number'
    && Number.isFinite(row.updatedAt)
}

/** Validate and normalize imported metadata without consulting current membership. */
export function normalizeWorldMetadata(value: unknown): WorldMetadata {
  if (!isValidWorldMetadata(value)) throw new Error('Invalid World metadata')
  const row = value as WorldMetadata
  return {
    continentOrder: [...new Set(row.continentOrder)],
    updatedAt: row.updatedAt,
  }
}
