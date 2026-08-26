import type { Country } from '@/features/world-countries/data/countries'

const EXPLICIT_SVG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'Democratic Republic of the Congo': ['DR_Congo'],
  'Republic of the Congo': ['Congo'],
  Palestine: ['Palestinian_Territories'],
  'United States': ['United_States_of_America', 'United_States'],
  'United Kingdom': ['United_Kingdom', 'England', 'Northern_Ireland', 'Scotland', 'Wales'],
  'Saint Kitts and Nevis': ['St_Kitts_and_Nevis'],
  'Saint Lucia': ['St_Lucia'],
  'Saint Vincent and the Grenadines': ['St_Vincent_and_the_Grenadines'],
  'Vatican City': ['Vatican_City'],
  "C\u00f4te d'Ivoire": ['Cote_d_Ivoire'],
  'S\u00e3o Tom\u00e9 and Pr\u00edncipe': ['Sao_Tome_and_Principe'],
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function svgNameCandidates(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  const normalized = stripDiacritics(trimmed)
    .replace(/&/g, 'and')
    .replace(/[\u2019']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return [...new Set([trimmed.replace(/\s+/g, '_'), normalized].filter(Boolean))]
}

/** Return possible path IDs for a domain country, without requiring a map asset. */
export function countryToSvgIds(country: Country): string[] {
  const values = [
    ...(EXPLICIT_SVG_ALIASES[country.country] ?? []),
    country.country,
  ]
  return [...new Set(values.flatMap(svgNameCandidates))]
}

/** Return possible path IDs for multiple domain countries, preserving input order. */
export function countriesToSvgIds(entries: readonly Country[]): string[] {
  return [...new Set(entries.flatMap(countryToSvgIds))]
}
