import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SvgMapHoverGroup } from '@/features/world-countries/common/SvgMapController'
import { countryId } from '@/features/world-countries/learning'
import { getCountriesForContinent, getCountriesForSubregion } from './geographyMemo'
import type { MemoedCountryIds } from './memoProgress'

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
  "Côte d'Ivoire": ['Cote_d_Ivoire'],
  'São Tomé and Príncipe': ['Sao_Tome_and_Principe'],
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function svgNameCandidates(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  const normalized = stripDiacritics(trimmed)
    .replace(/&/g, 'and')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return [...new Set([trimmed.replace(/\s+/g, '_'), normalized].filter(Boolean))]
}

/** Return possible IDs without asserting that a given asset contains them. */
export function getCountrySvgIdCandidates(country: Country): string[] {
  const values = [
    ...(EXPLICIT_SVG_ALIASES[country.country] ?? []),
    country.country,
    ...(country.aliases ?? []),
  ]
  return [...new Set(values.flatMap(svgNameCandidates))]
}

export function resolveCountryToSvgIds(
  country: Country,
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  const discovered = discoveredSvgIds instanceof Set
    ? discoveredSvgIds
    : new Set(discoveredSvgIds)
  return getCountrySvgIdCandidates(country).filter(id => discovered.has(id))
}

export function resolveCountriesToSvgIds(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  return [...new Set(entries.flatMap(entry => resolveCountryToSvgIds(entry, discoveredSvgIds)))]
}

export interface UnresolvedCountry {
  country: Country
  candidates: readonly string[]
}

export function findUnresolvedCountries(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): UnresolvedCountry[] {
  return entries.flatMap(country => {
    const ids = resolveCountryToSvgIds(country, discoveredSvgIds)
    return ids.length ? [] : [{ country, candidates: getCountrySvgIdCandidates(country) }]
  })
}

export function createContinentHoverGroups(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): SvgMapHoverGroup[] {
  const groups = new Map<Continent, string[]>()
  for (const entry of entries) {
    const ids = resolveCountryToSvgIds(entry, discoveredSvgIds)
    const group = groups.get(entry.continent) ?? []
    group.push(...ids)
    groups.set(entry.continent, group)
  }
  return [...groups.entries()].map(([continent, ids]) => ({
    id: `continent-${continentSlug(continent)}`,
    countryIds: [...new Set(ids)],
  }))
}

export function createSubregionHoverGroups(
  continent: Continent | string,
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): SvgMapHoverGroup[] {
  const groups = new Map<string, string[]>()
  for (const entry of getCountriesForContinent(continent, entries)) {
    const ids = resolveCountryToSvgIds(entry, discoveredSvgIds)
    const group = groups.get(entry.subregion) ?? []
    group.push(...ids)
    groups.set(entry.subregion, group)
  }
  return [...groups.entries()].map(([subregion, ids]) => ({
    id: `subregion-${continentSlug(subregion)}`,
    countryIds: [...new Set(ids)],
  }))
}

export function getCountryForSvgId(
  svgId: string,
  entries: readonly Country[],
): Country | undefined {
  return entries.find(country => getCountrySvgIdCandidates(country).includes(svgId))
}

export function getCountriesForSvgGroup(
  continent: Continent | string,
  subregion: string,
  entries: readonly Country[],
): Country[] {
  return getCountriesForSubregion(continent, subregion, entries)
}

export const MEMO_LEARNED_COLOR = '#22c55e'

export function createMemoCountryColors(
  entries: readonly Country[],
  memoedCountryIds: MemoedCountryIds,
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
  learnedColor = MEMO_LEARNED_COLOR,
): Array<readonly [string, string]> {
  const memoed = memoedCountryIds instanceof Set
    ? memoedCountryIds
    : new Set(memoedCountryIds)
  return entries.flatMap(entry => memoed.has(countryId(entry))
    ? resolveCountryToSvgIds(entry, discoveredSvgIds).map(id => [id, learnedColor] as const)
    : [])
}

function continentSlug(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
