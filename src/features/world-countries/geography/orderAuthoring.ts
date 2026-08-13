import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { ContinentId, SubregionId } from '@/features/world-countries/data/subregions'
import { setContinentSubregionOrder } from './continentMetadataStore'
import { setSubregionCountryOrder } from './subregionMetadataStore'
import { setWorldContinentOrder } from './worldMetadataStore'

/** Semantic persistence seam used by contextual order editors. */
export function saveWorldContinentOrder(continentIds: readonly ContinentId[]): void {
  setWorldContinentOrder(continentIds)
}

export function saveContinentSubregionOrder(continent: Continent, subregionIds: readonly SubregionId[]): void {
  setContinentSubregionOrder(continent, subregionIds)
}

export function saveSubregionCountryOrder(
  subregionId: SubregionId,
  countryIds: readonly CountryId[],
  visibleCountries: readonly Country[],
): void {
  setSubregionCountryOrder(subregionId, countryIds, visibleCountries)
}
