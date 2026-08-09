import type { Country } from '@/features/world-countries/data/countries'
import { reorderDraft } from '../reorderDraft'

/** Return a new draft with one country moved to another visible position. */
export function reorderCountryDraft(
  countries: readonly Country[],
  fromIndex: number,
  toIndex: number,
): Country[] {
  return reorderDraft(countries, fromIndex, toIndex)
}
