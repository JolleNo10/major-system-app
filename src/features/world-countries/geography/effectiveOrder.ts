import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentMetadata } from './continentMetadataStore'
import { getCountriesForSubregionInEffectiveOrder, getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from './queries'
import { getSubregionMetadata } from './subregionMetadataStore'
import { getWorldMetadata } from './worldMetadataStore'

export interface WorldCountriesEffectiveOrder {
  countries: Country[]
  subregionIds: SubregionId[]
}

/** Resolve the active World population in effective authored geography order. */
export function getWorldCountriesInEffectiveOrder(
  activeCountries: readonly Country[],
): WorldCountriesEffectiveOrder {
  const countriesInOrder: Country[] = []
  const subregionIds: SubregionId[] = []
  const seenCountries = new Set<string>()
  const seenSubregions = new Set<SubregionId>()
  const continents = getContinentsInEffectiveOrder(activeCountries, getWorldMetadata())

  for (const continent of continents) {
    const subregions = getSubregionsForContinentInEffectiveOrder(
      continent,
      activeCountries,
      getContinentMetadata(continent),
    )
    for (const subregion of subregions) {
      const entries = getCountriesForSubregionInEffectiveOrder(
        subregion.id,
        activeCountries,
        getSubregionMetadata(subregion.id),
      )
      const currentEntries = entries.filter(country => country.continent === continent)
      if (!currentEntries.length) continue
      if (!seenSubregions.has(subregion.id)) {
        seenSubregions.add(subregion.id)
        subregionIds.push(subregion.id)
      }
      for (const country of currentEntries) {
        if (seenCountries.has(country.id)) continue
        seenCountries.add(country.id)
        countriesInOrder.push(country)
      }
    }
  }

  for (const country of activeCountries) {
    if (seenCountries.has(country.id)) continue
    seenCountries.add(country.id)
    countriesInOrder.push(country)
    if (!seenSubregions.has(country.subregionId)) {
      seenSubregions.add(country.subregionId)
      subregionIds.push(country.subregionId)
    }
  }
  return { countries: countriesInOrder, subregionIds }
}
