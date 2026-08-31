import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import type { SvgMapHoverGroup } from '@/features/world-countries/maps/SvgMapController'
import { countryToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent } from '@/features/world-countries/geography/queries'

/** Return possible IDs without asserting that a given asset contains them. */
export const getCountrySvgIdCandidates = countryToSvgIds

function normalizeDiscoveredSvgIds(
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): ReadonlySet<string> {
  return discoveredSvgIds instanceof Set ? discoveredSvgIds : new Set(discoveredSvgIds)
}

export function resolveCountryToSvgIds(
  country: Country,
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  const discovered = normalizeDiscoveredSvgIds(discoveredSvgIds)
  return countryToSvgIds(country).filter(id => discovered.has(id))
}

export function resolveCountriesToSvgIds(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  return [...new Set(entries.flatMap(entry => resolveCountryToSvgIds(entry, discoveredSvgIds)))]
}

/** Hide discovered SVG geometry that is not represented by the supplied Country population. */
export function resolveSvgIdsOutsideCountryPopulation(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  const discovered = [...normalizeDiscoveredSvgIds(discoveredSvgIds)]
  const represented = new Set(resolveCountriesToSvgIds(entries, discovered))
  return discovered.filter(id => !represented.has(id))
}

/** Resolve a caller-owned Country-ID set through the canonical map adapter. */
export function resolveCountryIdsToSvgIds(
  countryIds: readonly CountryId[],
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): string[] {
  const selected = new Set(countryIds)
  return resolveCountriesToSvgIds(entries.filter(entry => selected.has(entry.id)), discoveredSvgIds)
}

/** Derive temporary SVG labels from the supplied effective Country order. */
export function createCountryOrderLabels(
  entries: readonly Country[],
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(entries.flatMap((entry, index) => (
    resolveCountryToSvgIds(entry, discoveredSvgIds)
      .map(svgId => [svgId, `${index + 1}. ${entry.country}`] as const)
  )))
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
    return ids.length ? [] : [{ country, candidates: countryToSvgIds(country) }]
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
    id: getContinentHoverGroupId(continent),
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
    const subregionLabel = getSubregionDefinition(entry.subregionId).label
    const group = groups.get(subregionLabel) ?? []
    group.push(...ids)
    groups.set(subregionLabel, group)
  }
  return [...groups.entries()].map(([subregion, ids]) => ({
    id: getSubregionHoverGroupId(subregion),
    countryIds: [...new Set(ids)],
  }))
}

export function getContinentHoverGroupId(continent: Continent | string): string {
  return `continent-${continentSlug(continent)}`
}

export function getSubregionHoverGroupId(subregion: string): string {
  return `subregion-${continentSlug(subregion)}`
}

export function getCountryForSvgId(
  svgId: string,
  entries: readonly Country[],
): Country | undefined {
  return entries.find(country => countryToSvgIds(country).includes(svgId))
}

export function createCountryColors(
  entries: readonly Country[],
  coloredCountryIds: ReadonlySet<CountryId> | Iterable<CountryId>,
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
  color: string,
): Array<readonly [string, string]> {
  const colored = coloredCountryIds instanceof Set
    ? coloredCountryIds
    : new Set(coloredCountryIds)
  return entries.flatMap(entry => colored.has(entry.id)
    ? resolveCountryToSvgIds(entry, discoveredSvgIds).map(id => [id, color] as const)
    : [])
}

/** Translate caller-owned per-Country presentation colors to SVG IDs. */
export function createCountryColorsById(
  entries: readonly Country[],
  colorsByCountryId: ReadonlyMap<CountryId, string>,
  discoveredSvgIds: ReadonlySet<string> | readonly string[],
): Array<readonly [string, string]> {
  return entries.flatMap(entry => {
    const color = colorsByCountryId.get(entry.id)
    return color === undefined
      ? []
      : resolveCountryToSvgIds(entry, discoveredSvgIds).map(id => [id, color] as const)
  })
}

/**
 * Best-effort visual ordering using the horizontal position of each map label.
 * Countries that cannot be paired with a labelled SVG path retain their
 * relative order after the positioned countries.
 */
export function sortCountriesByMapPosition(
  entries: readonly Country[],
  svgMarkup: string,
): Country[] {
  const document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  if (document.documentElement.localName.toLowerCase() !== 'svg' || document.querySelector('parsererror')) {
    return [...entries]
  }

  const positions = new Map<CountryId, number>()
  for (const entry of entries) {
    const position = findCountryLabelX(document, countryToSvgIds(entry))
    if (position !== null) positions.set(entry.id, position)
  }

  return entries
    .map((country, index) => ({ country, index, position: positions.get(country.id) }))
    .sort((left, right) => {
      if (left.position === undefined && right.position === undefined) return left.index - right.index
      if (left.position === undefined) return 1
      if (right.position === undefined) return -1
      return left.position - right.position || left.index - right.index
    })
    .map(entry => entry.country)
}

/**
 * Best-effort visual ordering of Subregions using the mean horizontal position
 * of their member Countries' map labels. Subregions without any positioned
 * member retain their relative order after the positioned ones.
 */
export function sortSubregionsByMapPosition(
  subregions: readonly SubregionDefinition[],
  svgMarkup: string,
  entries: readonly Country[] = countries,
): SubregionDefinition[] {
  const document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  if (document.documentElement.localName.toLowerCase() !== 'svg' || document.querySelector('parsererror')) {
    return [...subregions]
  }

  const totals = new Map<SubregionId, { sum: number; count: number }>()
  for (const entry of entries) {
    const position = findCountryLabelX(document, countryToSvgIds(entry))
    if (position === null) continue
    const bucket = totals.get(entry.subregionId) ?? { sum: 0, count: 0 }
    bucket.sum += position
    bucket.count += 1
    totals.set(entry.subregionId, bucket)
  }

  const positions = new Map<SubregionId, number>()
  for (const [id, { sum, count }] of totals) positions.set(id, sum / count)

  return subregions
    .map((subregion, index) => ({ subregion, index, position: positions.get(subregion.id) }))
    .sort((left, right) => {
      if (left.position === undefined && right.position === undefined) return left.index - right.index
      if (left.position === undefined) return 1
      if (right.position === undefined) return -1
      return left.position - right.position || left.index - right.index
    })
    .map(entry => entry.subregion)
}

function findCountryLabelX(document: Document, svgIds: readonly string[]): number | null {
  const candidates = new Set(svgIds)
  for (const path of document.querySelectorAll<SVGPathElement>('path[id]')) {
    if (!candidates.has(path.id) || !path.parentElement) continue
    const label = [...path.parentElement.children].find(element => (
      element.localName.toLowerCase() === 'text' && element.id.endsWith('_label')
    ))
    const x = Number.parseFloat(label?.getAttribute('x') ?? '')
    if (Number.isFinite(x)) return x
  }
  return null
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function continentSlug(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
