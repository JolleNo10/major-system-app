import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { reorderCountryDraft } from './subregionOrder'

const sample: Country[] = [
  { id: 'ES', country: 'Spain', capital: 'Madrid', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
  { id: 'PT', country: 'Portugal', capital: 'Lisbon', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
  { id: 'IT', country: 'Italy', capital: 'Rome', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
  { id: 'GR', country: 'Greece', capital: 'Athens', continent: 'Europe', subregionId: 'southern-europe', subregion: 'Southern Europe' },
]

describe('Subregion order draft', () => {
  it('moves a country directly to its requested position', () => {
    const next = reorderCountryDraft(sample, 3, 1)

    expect(next.map(country => country.id)).toEqual(['ES', 'GR', 'PT', 'IT'])
    expect(sample.map(country => country.id)).toEqual(['ES', 'PT', 'IT', 'GR'])
  })

  it('leaves the draft unchanged for an invalid or no-op move', () => {
    expect(reorderCountryDraft(sample, 1, 1)).toEqual(sample)
    expect(reorderCountryDraft(sample, -1, 1)).toEqual(sample)
    expect(reorderCountryDraft(sample, 1, sample.length)).toEqual(sample)
  })
})
