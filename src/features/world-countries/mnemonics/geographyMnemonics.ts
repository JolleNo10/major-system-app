import {
  decodeMnemonicEntry,
  encodeMnemonicEntries,
  parseMnemonicExport,
} from '@/core/mnemonics/backup'
import type { MnemonicExportEntry } from '@/core/mnemonics/backup'
import {
  deleteMnemonic,
  getMnemonic,
  getMnemonics,
  putMnemonic,
} from '@/core/mnemonics/mnemonicStore'
import type { Mnemonic, MnemonicRecord, MnemonicTargetId } from '@/core/mnemonics/types'
import { countries, type Continent, type Country, type CountryId } from '@/features/world-countries/data/countries'
import {
  subregionIdFor,
  type SubregionId,
} from '@/features/world-countries/data/subregions'
import { countryId } from '@/features/world-countries/learning'
import {
  getCountriesForSubregion,
  getCountriesForSubregionInEffectiveOrder,
} from '@/features/world-countries/memo/geographyMemo'
import {
  getAllSubregionMetadata,
  importSubregionMetadata,
} from '@/features/world-countries/subregions/subregionMetadataStore'
import {
  normalizeSubregionMetadata,
  type SubregionMetadata,
} from '@/features/world-countries/subregions/subregionMetadata'
import {
  countryCapitalMnemonicId,
  isCountryCapitalMnemonicTargetId,
  isGeographyMnemonicTargetId,
  isSubregionMnemonicTargetId,
  subregionMnemonicId,
} from './geographyMnemonicIds'

export interface SubregionMnemonic extends Mnemonic {
  countryIds: CountryId[]
}

export interface GeographyExportV2 {
  version: 2
  feature: 'world-countries'
  mnemonics: MnemonicExportEntry[]
  subregions: SubregionMetadata[]
}

export function getSubregionCountries(
  subregionId: SubregionId,
  entries?: readonly Country[],
): Country[]
export function getSubregionCountries(
  continent: Continent | string,
  subregion: SubregionId | string,
  entries?: readonly Country[],
): Country[]
export function getSubregionCountries(
  first: Continent | SubregionId | string,
  second?: SubregionId | string | readonly Country[],
  third: readonly Country[] = countries,
): Country[] {
  if (second === undefined) {
    const id = subregionIdFor(first)
    if (!id) throw new Error(`Unknown Subregion: ${first}`)
    return getCountriesForSubregionInEffectiveOrder(id, countries)
  }
  if (Array.isArray(second)) {
    const id = subregionIdFor(first)
    if (!id) throw new Error(`Unknown Subregion: ${first}`)
    return getCountriesForSubregionInEffectiveOrder(id, second)
  }
  const subregion = second as SubregionId | string
  const id = subregionIdFor(subregion)
  if (id && third === countries) return getCountriesForSubregionInEffectiveOrder(id, third)
  return getCountriesForSubregion(first, subregion, third)
}

export function getSubregionCountryIds(
  subregionId: SubregionId,
  entries?: readonly Country[],
): CountryId[]
export function getSubregionCountryIds(
  continent: Continent | string,
  subregion: SubregionId | string,
  entries?: readonly Country[],
): CountryId[]
export function getSubregionCountryIds(
  first: Continent | SubregionId | string,
  second?: SubregionId | string | readonly Country[],
  third: readonly Country[] = countries,
): CountryId[] {
  if (second === undefined) return getSubregionCountries(first as SubregionId).map(countryId)
  if (Array.isArray(second)) return getSubregionCountries(first as SubregionId, second).map(countryId)
  return getSubregionCountries(first as Continent, second as SubregionId | string, third).map(countryId)
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

export function getSubregionMnemonic(subregion: SubregionId): Promise<SubregionMnemonic | null>
export function getSubregionMnemonic(
  continent: Continent | string,
  subregion: SubregionId | string,
): Promise<SubregionMnemonic | null>
export function getSubregionMnemonic(
  continentOrSubregion: Continent | SubregionId | string,
  subregion?: SubregionId | string,
): Promise<SubregionMnemonic | null> {
  const targetId = subregion === undefined
    ? subregionMnemonicId(continentOrSubregion as SubregionId)
    : subregionMnemonicId(continentOrSubregion as Continent, subregion)
  return getMnemonic(targetId) as Promise<SubregionMnemonic | null>
}

export async function putSubregionMnemonic(
  subregion: SubregionId,
  countryIds: readonly CountryId[],
  data: { text: string; image: Blob | null },
): Promise<void>
export async function putSubregionMnemonic(
  continent: Continent | string,
  subregion: SubregionId | string,
  countryIds: readonly CountryId[],
  data: { text: string; image: Blob | null },
): Promise<void>
export async function putSubregionMnemonic(
  first: Continent | SubregionId | string,
  second: readonly CountryId[] | SubregionId | string,
  third: { text: string; image: Blob | null } | readonly CountryId[],
  fourth?: { text: string; image: Blob | null },
): Promise<void> {
  const isShortForm = Array.isArray(second)
  const targetId = isShortForm
    ? subregionMnemonicId(first as SubregionId)
    : subregionMnemonicId(first as Continent, second as SubregionId | string)
  const countryIds = (isShortForm ? second : third) as readonly CountryId[]
  const data = (isShortForm ? third : fourth) as { text: string; image: Blob | null }
  if (!data.text.trim() && !data.image) return deleteMnemonic(targetId)
  await putMnemonic({
    targetId,
    countryIds: [...new Set(countryIds)],
    ...data,
    updatedAt: Date.now(),
  })
}

export function deleteSubregionMnemonic(subregion: SubregionId): Promise<void>
export function deleteSubregionMnemonic(
  continent: Continent | string,
  subregion: SubregionId | string,
): Promise<void>
export function deleteSubregionMnemonic(
  continentOrSubregion: Continent | SubregionId | string,
  subregion?: SubregionId | string,
): Promise<void> {
  const targetId = subregion === undefined
    ? subregionMnemonicId(continentOrSubregion as SubregionId)
    : subregionMnemonicId(continentOrSubregion as Continent, subregion)
  return deleteMnemonic(targetId)
}

export function isSubregionMnemonicStale(
  mnemonic: Pick<SubregionMnemonic, 'countryIds'> | null,
  currentCountryIds: readonly CountryId[],
): boolean {
  if (!mnemonic) return false
  return mnemonic.countryIds.length !== currentCountryIds.length
    || mnemonic.countryIds.some((id, index) => id !== currentCountryIds[index])
}

export async function getGeographyMnemonics(): Promise<Mnemonic[]> {
  return (await getMnemonics()).filter(record => isGeographyMnemonicTargetId(record.targetId))
}

/** Export the complete user-authored Geography state in the feature envelope. */
export async function exportGeographyMnemonics(): Promise<Blob> {
  const [mnemonics, subregions] = await Promise.all([
    getGeographyMnemonics(),
    Promise.resolve(getAllSubregionMetadata()),
  ])
  const payload: GeographyExportV2 = {
    version: 2,
    feature: 'world-countries',
    mnemonics: await encodeMnemonicEntries(mnemonics),
    subregions,
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

function validateSubregionMnemonicEntry(row: Record<string, unknown>, targetId: string): void {
  if (!isSubregionMnemonicTargetId(targetId)) return
  if (!Array.isArray(row.countryIds) || !row.countryIds.every(id => typeof id === 'string' && id.trim())) {
    throw new Error('Subregion mnemonic is missing country IDs')
  }
}

function parseFeatureMnemonicRows(rows: unknown): MnemonicRecord[] {
  const normalizedRows = parseMnemonicExport(JSON.stringify({ version: 1, mnemonics: rows }))
  const decoded: MnemonicRecord[] = []
  for (const row of normalizedRows) {
    if (!isGeographyMnemonicTargetId(row.targetId)) {
      throw new Error('Invalid Geography mnemonic target')
    }
    validateSubregionMnemonicEntry(row, row.targetId)
    if (!row.text.trim() && !row.imageDataUrl) continue
    const entry = isSubregionMnemonicTargetId(row.targetId) && Array.isArray(row.countryIds)
      ? { ...row, countryIds: [...new Set(row.countryIds as string[])] }
      : row
    decoded.push(decodeMnemonicEntry(entry) as MnemonicRecord)
  }
  return decoded
}

function parseGeographyExport(json: string): {
  mnemonics: MnemonicRecord[]
  subregions: SubregionMetadata[]
} {
  const parsed: unknown = JSON.parse(json.replace(/^\uFEFF/, ''))
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid Geography export')
  const envelope = parsed as Record<string, unknown>
  if (envelope.version === 1) {
    return { mnemonics: parseFeatureMnemonicRows(envelope.mnemonics), subregions: [] }
  }
  if (envelope.version !== 2 || envelope.feature !== 'world-countries') {
    throw new Error('Expected a version 1 or 2 Geography export')
  }
  if (!Array.isArray(envelope.mnemonics) || !Array.isArray(envelope.subregions)) {
    throw new Error('Invalid Geography export sections')
  }
  const subregions = envelope.subregions.map(normalizeSubregionMetadata)
  return {
    mnemonics: parseFeatureMnemonicRows(envelope.mnemonics),
    subregions,
  }
}

/** Import v1 mnemonic-only files and v2 Geography envelopes without creating inferred order metadata. */
export async function importGeographyMnemonics(json: string): Promise<number> {
  const parsed = parseGeographyExport(json)
  // Parse and decode the entire payload before writing anything. This keeps a
  // malformed metadata row from partially importing mnemonic content.
  for (const mnemonic of parsed.mnemonics) await putMnemonic(mnemonic)
  if (parsed.subregions.length) importSubregionMetadata(parsed.subregions)
  return parsed.mnemonics.length
}

// Keep this export available to callers that validate each Geography namespace.
export { isCountryCapitalMnemonicTargetId }
