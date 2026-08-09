import { countries, type Country, type CountryId } from '@/features/world-countries/data/countries'
import {
  isSubregionId,
  type SubregionId,
} from '@/features/world-countries/data/subregions'

export interface SubregionMetadata {
  subregionId: SubregionId
  countryOrder: CountryId[]
  updatedAt: number
}

export function getCanonicalSubregionCountries(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
): Country[] {
  return currentCountries.filter(country => country.subregionId === subregionId)
}

/**
 * Resolve the user-authored order without changing metadata while reading it.
 * Stored IDs are filtered to current membership, then new members are appended
 * in the current canonical dataset order.
 */
export function resolveSubregionCountryOrder(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
  metadata?: Pick<SubregionMetadata, 'subregionId' | 'countryOrder'> | null,
): Country[] {
  const canonical = getCanonicalSubregionCountries(subregionId, currentCountries)
  if (!metadata || metadata.subregionId !== subregionId) return canonical

  const currentById = new Map(canonical.map(country => [country.id, country]))
  const ordered: Country[] = []
  const included = new Set<CountryId>()
  for (const storedId of metadata.countryOrder) {
    const country = currentById.get(storedId)
    if (!country || included.has(storedId)) continue
    ordered.push(country)
    included.add(storedId)
  }
  for (const country of canonical) {
    const id = country.id
    if (included.has(id)) continue
    ordered.push(country)
    included.add(id)
  }
  return ordered
}

export function resolveSubregionCountryIds(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
  metadata?: Pick<SubregionMetadata, 'subregionId' | 'countryOrder'> | null,
): CountryId[] {
  return resolveSubregionCountryOrder(subregionId, currentCountries, metadata).map(country => country.id)
}

export function isValidSubregionMetadata(value: unknown): value is SubregionMetadata {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.subregionId === 'string'
    && isSubregionId(row.subregionId)
    && Array.isArray(row.countryOrder)
    && row.countryOrder.every(id => typeof id === 'string' && id.trim().length > 0)
    && typeof row.updatedAt === 'number'
    && Number.isFinite(row.updatedAt)
}

/** Validate and normalize imported metadata without consulting current membership. */
export function normalizeSubregionMetadata(value: unknown): SubregionMetadata {
  if (!isValidSubregionMetadata(value)) throw new Error('Invalid Subregion metadata')
  const row = value as SubregionMetadata
  return {
    subregionId: row.subregionId,
    countryOrder: [...new Set(row.countryOrder)],
    updatedAt: row.updatedAt,
  }
}
