import type { Country, CountryId } from '@/features/world-countries/data/countries'

/** Snapshot unique Country records while keeping their answer aliases isolated. */
export function snapshotPracticeCountries(entries: readonly Country[]): Country[] {
  const seen = new Set<CountryId>()
  return entries.flatMap(country => {
    if (seen.has(country.id)) return []
    seen.add(country.id)
    return [{
      ...country,
      ...(country.countryAliases ? { countryAliases: [...country.countryAliases] } : {}),
      ...(country.capitalAliases ? { capitalAliases: [...country.capitalAliases] } : {}),
    }]
  })
}

/** Shuffle a Practice collection with the existing injected Fisher–Yates semantics. */
export function shufflePracticeItems<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = Math.max(0, Math.min(0.999999999, random()))
    const swapWith = Math.floor(value * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith], result[index]]
  }
  return result
}
