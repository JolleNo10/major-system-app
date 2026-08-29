import type { Country, Continent } from '@/features/world-countries/data/countries'
import { getAllContinentMetadata } from './continentMetadataStore'
import { getAllSubregionMetadata } from './subregionMetadataStore'
import { getContinentsInEffectiveOrder } from './queries'
import { getWorldMetadata } from './worldMetadataStore'
import type { WorldCountriesSubregionScopeMetadata } from './subregionScope'

export interface WorldCountriesGeographyRead {
  metadata: WorldCountriesSubregionScopeMetadata
  worldOrder: readonly Continent[]
}

/** Read the live geography metadata shared by World Countries setup views. */
export function readWorldCountriesGeography(
  activeCountries: readonly Country[],
): WorldCountriesGeographyRead {
  const metadata: WorldCountriesSubregionScopeMetadata = {
    world: getWorldMetadata(),
    continents: getAllContinentMetadata(),
    subregions: getAllSubregionMetadata(),
  }
  return {
    metadata,
    worldOrder: getContinentsInEffectiveOrder(activeCountries, metadata.world),
  }
}
