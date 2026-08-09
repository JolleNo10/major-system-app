import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import {
  continentIdFor,
  getSubregionDefinition,
  isContinentId,
  isSubregionId,
  subregionIdFor,
  type ContinentId,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import type { MnemonicTargetId } from '@/core/mnemonics'

export function continentId(continent: Continent | string): ContinentId {
  const id = isContinentId(continent)
    ? continent
    : continentIdFor(continent)
  if (!id) throw new Error(`Unknown Continent: ${continent}`)
  return id
}

export function subregionId(subregion: SubregionId | string): SubregionId {
  const id = subregionIdFor(subregion)
  if (!id) throw new Error(`Unknown Subregion: ${subregion}`)
  return id
}

export function countryCapitalMnemonicId(country: Country | CountryId): MnemonicTargetId {
  const countryId = typeof country === 'string' ? country : country.id
  return `geo:country-capital:${countryId}`
}

export function subregionMnemonicId(subregion: SubregionId): MnemonicTargetId
export function subregionMnemonicId(
  continent: Continent | string,
  subregion: SubregionId | string,
): MnemonicTargetId
export function subregionMnemonicId(
  continentOrSubregion: Continent | SubregionId | string,
  subregion?: SubregionId | string,
): MnemonicTargetId {
  if (subregion === undefined) {
    const definition = getSubregionDefinition(subregionId(continentOrSubregion))
    return `geo:subregion:${continentId(definition.continent)}:${definition.id}`
  }
  const definition = getSubregionDefinition(subregionId(subregion))
  if (continentId(definition.continent) !== continentId(continentOrSubregion)) {
    throw new Error(`Subregion ${definition.id} does not belong to ${continentOrSubregion}`)
  }
  return `geo:subregion:${continentId(continentOrSubregion)}:${definition.id}`
}

export function isGeographyMnemonicTargetId(targetId: string): boolean {
  return isCountryCapitalMnemonicTargetId(targetId) || isSubregionMnemonicTargetId(targetId)
}

export function isCountryCapitalMnemonicTargetId(targetId: string): boolean {
  return /^geo:country-capital:[A-Za-z0-9_-]+$/.test(targetId)
}

export function isSubregionMnemonicTargetId(targetId: string): boolean {
  const match = /^geo:subregion:([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/.exec(targetId)
  if (!match || !isContinentId(match[1]) || !isSubregionId(match[2])) return false
  return continentIdFor(getSubregionDefinition(match[2]).continent) === match[1]
}

export type { ContinentId, SubregionId }
