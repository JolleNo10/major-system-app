import { describe, expect, it } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { getCountryById, getCountryId } from './country'

describe('World Countries domain identity', () => {
  it('uses stable IDs from canonical records and resolves them back', () => {
    const norway = countries.find(country => country.country === 'Norway')!
    expect(getCountryId(norway)).toBe('NO')
    expect(getCountryById('NO')).toBe(norway)
  })

  it('supports fixture records without coupling identity to a workflow', () => {
    const fixture: Country = {
      country: 'Testland Republic',
      capital: 'Test City',
      continent: 'Africa',
      subregion: 'Middle Africa',
    }
    expect(getCountryId(fixture)).toBe('testland-republic')
  })
})
