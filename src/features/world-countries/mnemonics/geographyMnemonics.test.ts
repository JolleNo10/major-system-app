// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  countryCapitalMnemonicId,
  isGeographyMnemonicTargetId,
  subregionMnemonicId,
} from './geographyMnemonicIds'
import {
  exportGeographyMnemonics,
  getSubregionCountryIds,
  importGeographyMnemonics,
  isSubregionMnemonicStale,
} from './geographyMnemonics'
import { getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { setSubregionCountryOrder } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'

afterEach(() => localStorage.clear())

const sample: Country[] = [
  { id: 'DK', country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'EE', country: 'Estonia', capital: 'Tallinn', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

describe('Geography mnemonic adapters', () => {
  it('uses one relationship target for both recall directions', () => {
    expect(countryCapitalMnemonicId(sample[2])).toBe('geo:country-capital:NO')
    expect(subregionMnemonicId('Europe', 'Northern Europe')).toBe('geo:subregion:europe:northern-europe')
  })

  it('records and compares canonical subregion order', () => {
    const ids = getSubregionCountryIds('northern-europe', sample)
    expect(ids).toEqual(['DK', 'EE', 'NO'])
    expect(isSubregionMnemonicStale({ countryIds: ids }, ids)).toBe(false)
    expect(isSubregionMnemonicStale({ countryIds: ['EE', 'DK', 'NO'] }, ids)).toBe(true)
  })

  it('uses explicit Subregion identity without changing existing target keys', () => {
    expect(subregionMnemonicId('northern-europe')).toBe('geo:subregion:europe:northern-europe')
    expect(subregionMnemonicId('Europe', 'northern-europe')).toBe('geo:subregion:europe:northern-europe')
  })

  it('validates Geography exports and rejects Pi targets', async () => {
    expect(isGeographyMnemonicTargetId('geo:country-capital:NO')).toBe(true)
    await expect(importGeographyMnemonics(JSON.stringify({
      version: 1,
      mnemonics: [{ targetId: 'pi:segment:4', text: 'wrong', imageDataUrl: null }],
    }))).rejects.toThrow()
    await expect(importGeographyMnemonics(JSON.stringify({
      version: 1,
      mnemonics: [{ targetId: 'geo:subregion:europe:northern-europe', text: 'missing metadata', imageDataUrl: null }],
    }))).rejects.toThrow()
  })

  it('imports v2 metadata and accepts historic non-member country IDs', async () => {
    const count = await importGeographyMnemonics(JSON.stringify({
      version: 2,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [{
        subregionId: 'northern-europe',
        countryOrder: ['NO', 'HISTORIC'],
        updatedAt: 123,
      }],
    }))
    expect(count).toBe(0)
    expect(getSubregionMetadata('northern-europe')).toMatchObject({
      countryOrder: ['NO', 'HISTORIC'],
      updatedAt: 123,
    })
  })

  it('exports custom order even when no mnemonic exists', async () => {
    setSubregionCountryOrder('northern-europe', ['NO', 'SE'])
    const blob = await exportGeographyMnemonics()
    const json = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    const payload = JSON.parse(json)
    expect(payload).toMatchObject({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [{ subregionId: 'northern-europe', countryOrder: ['NO', 'SE'] }],
      continents: [],
    })
  })

  it('imports v3 Continent Subregion order', async () => {
    const count = await importGeographyMnemonics(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [],
      continents: [{
        continentId: 'europe',
        subregionOrder: ['western-europe', 'northern-europe'],
        updatedAt: 123,
      }],
    }))
    expect(count).toBe(0)
    expect(getContinentMetadata('Europe')).toMatchObject({
      subregionOrder: ['western-europe', 'northern-europe'],
      updatedAt: 123,
    })
  })

  it('rejects malformed Continent metadata before importing mnemonic content', async () => {
    await expect(importGeographyMnemonics(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [{ targetId: 'geo:country-capital:NO', text: 'kept', imageDataUrl: null }],
      subregions: [],
      continents: [{ continentId: 'not-a-continent', subregionOrder: [], updatedAt: 1 }],
    }))).rejects.toThrow()
    expect(getContinentMetadata('Europe')).toBeNull()
  })

  it('rejects malformed v2 metadata before importing mnemonic content', async () => {
    await expect(importGeographyMnemonics(JSON.stringify({
      version: 2,
      feature: 'world-countries',
      mnemonics: [{ targetId: 'geo:country-capital:NO', text: 'kept', imageDataUrl: null }],
      subregions: [{ subregionId: 'not-a-subregion', countryOrder: [], updatedAt: 1 }],
    }))).rejects.toThrow()
    expect(getSubregionMetadata('northern-europe')).toBeNull()
  })
})
