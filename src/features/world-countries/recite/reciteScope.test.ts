import { describe, expect, it } from 'vitest'
import { createWorldCountriesReciteScope } from './reciteScope'

describe('World Countries Recite scope', () => {
  it('keeps the active population in supplied order', () => {
    expect(createWorldCountriesReciteScope([
      { id: 'GL' },
      { id: 'NO' },
      { id: 'GL' },
    ])).toEqual({
      countryIds: ['GL', 'NO'],
      totalCountries: 2,
    })
  })
})
