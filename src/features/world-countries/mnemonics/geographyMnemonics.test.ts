import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  countryCapitalMnemonicId,
  isGeographyMnemonicTargetId,
  subregionMnemonicId,
} from './geographyMnemonicIds'
import {
  getSubregionCountryIds,
  importGeographyMnemonics,
  isSubregionMnemonicStale,
} from './geographyMnemonics'

const sample: Country[] = [
  { country: 'Denmark', capital: 'Copenhagen', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'Estonia', capital: 'Tallinn', continent: 'Europe', subregion: 'Northern Europe' },
  { country: 'Norway', capital: 'Oslo', continent: 'Europe', subregion: 'Northern Europe' },
]

describe('Geography mnemonic adapters', () => {
  it('uses one relationship target for both quiz directions', () => {
    expect(countryCapitalMnemonicId(sample[2])).toBe('geo:country-capital:NO')
    expect(subregionMnemonicId('Europe', 'Northern Europe')).toBe('geo:subregion:europe:northern-europe')
  })

  it('records and compares canonical subregion order', () => {
    const ids = getSubregionCountryIds('Europe', 'Northern Europe', sample)
    expect(ids).toEqual(['DK', 'EE', 'NO'])
    expect(isSubregionMnemonicStale({ countryIds: ids }, ids)).toBe(false)
    expect(isSubregionMnemonicStale({ countryIds: ['EE', 'DK', 'NO'] }, ids)).toBe(true)
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
})
