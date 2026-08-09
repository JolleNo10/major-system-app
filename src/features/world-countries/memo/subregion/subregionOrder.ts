import type { Country } from '@/features/world-countries/data/countries'

/** Return a new draft with one country moved to another visible position. */
export function reorderCountryDraft(
  countries: readonly Country[],
  fromIndex: number,
  toIndex: number,
): Country[] {
  if (
    fromIndex === toIndex
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= countries.length
    || toIndex >= countries.length
  ) {
    return [...countries]
  }

  const next = [...countries]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
