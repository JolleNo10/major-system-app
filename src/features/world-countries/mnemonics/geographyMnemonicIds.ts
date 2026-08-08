import { countryId } from '@/features/world-countries/learning'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { MnemonicTargetId } from '@/core/mnemonics'

export type ContinentId = string
export type SubregionId = string

function stableSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function continentId(continent: Continent | string): ContinentId {
  return stableSlug(continent)
}

export function subregionId(subregion: string): SubregionId {
  return stableSlug(subregion)
}

export function countryCapitalMnemonicId(country: Country | string): MnemonicTargetId {
  return `geo:country-capital:${countryId(country)}`
}

export function subregionMnemonicId(
  continent: Continent | string,
  subregion: string,
): MnemonicTargetId {
  return `geo:subregion:${continentId(continent)}:${subregionId(subregion)}`
}

export function isGeographyMnemonicTargetId(targetId: string): boolean {
  return /^geo:(?:country-capital:[A-Za-z0-9_-]+|subregion:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+)$/.test(targetId)
}

export function isCountryCapitalMnemonicTargetId(targetId: string): boolean {
  return /^geo:country-capital:[A-Za-z0-9_-]+$/.test(targetId)
}

export function isSubregionMnemonicTargetId(targetId: string): boolean {
  return /^geo:subregion:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(targetId)
}
