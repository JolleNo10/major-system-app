import { describe, expect, it } from 'vitest'
import { createDrillCountryOrder, getWorldCountriesSessionOrder } from './drillOrder'

describe('World Countries Drill order', () => {
  it('keeps Practice random regardless of the Drill order preference', () => {
    expect(getWorldCountriesSessionOrder('drill', 'ordered')).toBe('ordered')
    expect(getWorldCountriesSessionOrder('drill', 'random')).toBe('random')
    expect(getWorldCountriesSessionOrder('practice', 'ordered')).toBe('random')
    expect(getWorldCountriesSessionOrder('practice', 'random')).toBe('random')
  })

  it('keeps the selected Countries in scope order', () => {
    expect(createDrillCountryOrder(['NO', 'SE', 'FI'], 'ordered')).toEqual(['NO', 'SE', 'FI'])
  })

  it('shuffles a fresh run without changing membership', () => {
    expect(createDrillCountryOrder(['NO', 'SE', 'FI', 'DK'], 'random', () => 0)).toEqual([
      'SE', 'FI', 'DK', 'NO',
    ])
  })

  it('removes duplicate Country IDs before ordering', () => {
    expect(createDrillCountryOrder(['NO', 'NO', 'SE'], 'ordered')).toEqual(['NO', 'SE'])
  })
})
