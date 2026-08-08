import { countryId } from '@/features/world-countries/learning'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { getCountriesForContinent, getCountriesForSubregion } from './geographyMemo'

export type MemoProgressStatus = 'not-started' | 'partial' | 'complete'

export interface MemoProgress {
  memoedCount: number
  totalCount: number
  remainingCount: number
  ratio: number
  status: MemoProgressStatus
}
export type MemoedCountryIds = ReadonlySet<string> | Iterable<string>

function asMemoedIds(ids: MemoedCountryIds): Set<string> {
  return ids instanceof Set ? ids : new Set(ids)
}

export function getMemoProgress(
  entries: readonly Country[],
  memoedCountryIds: MemoedCountryIds,
): MemoProgress {
  const memoed = asMemoedIds(memoedCountryIds)
  const memoedCount = entries.reduce(
    (count, entry) => count + (memoed.has(countryId(entry)) ? 1 : 0),
    0,
  )
  const totalCount = entries.length
  const ratio = totalCount === 0 ? 0 : memoedCount / totalCount
  const status: MemoProgressStatus = memoedCount === 0
    ? 'not-started'
    : memoedCount === totalCount
      ? 'complete'
      : 'partial'
  return {
    memoedCount,
    totalCount,
    remainingCount: totalCount - memoedCount,
    ratio,
    status,
  }
}

export function getCountryMemoProgress(
  country: Country,
  memoedCountryIds: MemoedCountryIds,
): MemoProgress {
  return getMemoProgress([country], memoedCountryIds)
}

export function getSubregionMemoProgress(
  continent: Continent | string,
  subregion: string,
  memoedCountryIds: MemoedCountryIds,
  entries: readonly Country[] = countries,
): MemoProgress {
  return getMemoProgress(
    getCountriesForSubregion(continent, subregion, entries),
    memoedCountryIds,
  )
}

export function getContinentMemoProgress(
  continent: Continent | string,
  memoedCountryIds: MemoedCountryIds,
  entries: readonly Country[] = countries,
): MemoProgress {
  return getMemoProgress(getCountriesForContinent(continent, entries), memoedCountryIds)
}

export function getWorldMemoProgress(
  memoedCountryIds: MemoedCountryIds,
  entries: readonly Country[] = countries,
): MemoProgress {
  return getMemoProgress(entries, memoedCountryIds)
}
