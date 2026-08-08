import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { countriesToSvgIds, countryToSvgIds } from './countryMapIds'

describe('World Countries SVG ID mapping', () => {
  it('maps domain records to SVG IDs without using persisted country IDs', () => {
    const bosnia = countries.find(country => country.country === 'Bosnia and Herzegovina')
    const norway = countries.find(country => country.country === 'Norway')
    if (!bosnia || !norway) throw new Error('Expected fixture countries are missing')

    expect(countryToSvgIds(bosnia)).toContain('Bosnia_and_Herzegovina')
    expect(countriesToSvgIds([norway])).toEqual(['Norway'])
    expect(countriesToSvgIds([norway])).not.toContain(norway.id)
  })
})
