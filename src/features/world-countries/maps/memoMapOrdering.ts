import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition } from '@/features/world-countries/data/subregions'
import { getCountriesForContinent } from '@/features/world-countries/geography/queries'
import {
  sortCountriesByMapPosition,
  sortSubregionsByMapPosition as sortSubregionsFromMarkup,
} from './geographyMapAdapter'
import { getMemoMapDefinition } from './mapDefinitions'

/** Order Countries from the Memo map's horizontal positions. */
export async function sortCountriesByMemoMapPosition(
  continent: Continent,
  entries: readonly Country[],
): Promise<readonly Country[]> {
  const svgMarkup = await loadMemoMapMarkup(continent)
  return sortCountriesByMapPosition(entries, svgMarkup)
}

/** Order Subregions from the horizontal positions of their mapped Countries. */
export async function sortSubregionsByMemoMapPosition(
  continent: Continent,
  entries: readonly SubregionDefinition[],
): Promise<readonly SubregionDefinition[]> {
  const svgMarkup = await loadMemoMapMarkup(continent)
  return sortSubregionsFromMarkup(entries, svgMarkup, getCountriesForContinent(continent))
}

async function loadMemoMapMarkup(continent: Continent): Promise<string> {
  const definition = getMemoMapDefinition(continent)
  const response = await fetch(definition.svgUrl)
  if (!response.ok) throw new Error(`Map request failed with ${response.status}`)
  return response.text()
}
