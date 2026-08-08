import {
  decodeMnemonicEntry,
  exportMnemonics,
  parseMnemonicExport,
} from '@/core/mnemonics/backup'
import {
  deleteMnemonic,
  getMnemonic,
  getMnemonics,
  putMnemonic,
} from '@/core/mnemonics/mnemonicStore'
import type { Mnemonic, MnemonicRecord } from '@/core/mnemonics/types'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { countryId } from '@/features/world-countries/learning'
import {
  countryCapitalMnemonicId,
  isCountryCapitalMnemonicTargetId,
  isGeographyMnemonicTargetId,
  isSubregionMnemonicTargetId,
  subregionMnemonicId,
} from './geographyMnemonicIds'

export interface SubregionMnemonic extends Mnemonic {
  countryIds: string[]
}

export function getSubregionCountries(
  continent: Continent | string,
  subregion: string,
  entries: readonly Country[] = countries,
): Country[] {
  return entries.filter(entry => entry.continent === continent && entry.subregion === subregion)
}

export function getSubregionCountryIds(
  continent: Continent | string,
  subregion: string,
  entries: readonly Country[] = countries,
): string[] {
  return getSubregionCountries(continent, subregion, entries).map(countryId)
}

export function getCountryCapitalMnemonic(country: Country | string): Promise<Mnemonic | null> {
  return getMnemonic(countryCapitalMnemonicId(country))
}

export async function putCountryCapitalMnemonic(
  country: Country | string,
  data: { text: string; image: Blob | null },
): Promise<void> {
  const targetId = countryCapitalMnemonicId(country)
  if (!data.text.trim() && !data.image) return deleteMnemonic(targetId)
  await putMnemonic({ targetId, ...data, updatedAt: Date.now() })
}

export function deleteCountryCapitalMnemonic(country: Country | string): Promise<void> {
  return deleteMnemonic(countryCapitalMnemonicId(country))
}

export function getSubregionMnemonic(
  continent: Continent | string,
  subregion: string,
): Promise<SubregionMnemonic | null> {
  return getMnemonic(subregionMnemonicId(continent, subregion)) as Promise<SubregionMnemonic | null>
}

export async function putSubregionMnemonic(
  continent: Continent | string,
  subregion: string,
  countryIds: readonly string[],
  data: { text: string; image: Blob | null },
): Promise<void> {
  const targetId = subregionMnemonicId(continent, subregion)
  if (!data.text.trim() && !data.image) return deleteMnemonic(targetId)
  await putMnemonic({
    targetId,
    countryIds: [...countryIds],
    ...data,
    updatedAt: Date.now(),
  })
}

export function deleteSubregionMnemonic(
  continent: Continent | string,
  subregion: string,
): Promise<void> {
  return deleteMnemonic(subregionMnemonicId(continent, subregion))
}

export function isSubregionMnemonicStale(
  mnemonic: Pick<SubregionMnemonic, 'countryIds'> | null,
  currentCountryIds: readonly string[],
): boolean {
  if (!mnemonic) return false
  return mnemonic.countryIds.length !== currentCountryIds.length
    || mnemonic.countryIds.some((id, index) => id !== currentCountryIds[index])
}

export async function getGeographyMnemonics(): Promise<Mnemonic[]> {
  return (await getMnemonics()).filter(record => isGeographyMnemonicTargetId(record.targetId))
}

export async function exportGeographyMnemonics(): Promise<Blob> {
  return exportMnemonics(await getGeographyMnemonics())
}

function validateSubregionMetadata(row: Record<string, unknown>, targetId: string): void {
  if (!isSubregionMnemonicTargetId(targetId)) return
  if (!Array.isArray(row.countryIds) || !row.countryIds.every(id => typeof id === 'string')) {
    throw new Error('Subregion mnemonic is missing country IDs')
  }
}

/** Import only Geography namespaces and retain Subregion authoring order. */
export async function importGeographyMnemonics(json: string): Promise<number> {
  const rows = parseMnemonicExport(json)
  let count = 0
  for (const row of rows) {
    if (!isGeographyMnemonicTargetId(row.targetId)) {
      throw new Error('Invalid Geography mnemonic target')
    }
    validateSubregionMetadata(row, row.targetId)
    if (!row.text.trim() && !row.imageDataUrl) continue
    const decoded = decodeMnemonicEntry(row) as MnemonicRecord
    await putMnemonic(decoded)
    count++
  }
  return count
}

// Keep these imports in one module so feature callers can validate each
// namespace independently when a future Geography UI adds separate exports.
export { isCountryCapitalMnemonicTargetId }
