import { readJSON, safeSet } from '@/core/storage'
import { getCountryId } from '@/features/world-countries/domain/country'
import type { Country } from '@/features/world-countries/data/countries'

export const MEMO_STORAGE_KEY = 'world-countries-memo'

function validIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.trim() !== ''))]
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).filter(id => id.trim() !== '')
  }
  return []
}

export function loadMemoedCountryIds(): Set<string> {
  return new Set(validIds(readJSON<unknown>(MEMO_STORAGE_KEY, [])))
}

export function getMemoedCountryIds(): Set<string> {
  return loadMemoedCountryIds()
}

export function saveMemoedCountryIds(ids: Iterable<string>): Set<string> {
  const next = new Set([...ids].filter(id => id.trim() !== ''))
  safeSet(MEMO_STORAGE_KEY, JSON.stringify([...next]))
  return next
}

export function isCountryMemoed(
  country: Country | string,
  ids: ReadonlySet<string> = loadMemoedCountryIds(),
): boolean {
  return ids.has(getCountryId(country))
}

/** Mark one Country–Capital relationship as learned once. */
export function markCountryMemoed(country: Country | string): Set<string> {
  const next = loadMemoedCountryIds()
  next.add(getCountryId(country))
  return saveMemoedCountryIds(next)
}

export function unmarkCountryMemoed(country: Country | string): Set<string> {
  const next = loadMemoedCountryIds()
  next.delete(getCountryId(country))
  return saveMemoedCountryIds(next)
}
