import { describe, expect, it } from 'vitest'
import { createDrillCountryOrder } from './drillOrder'

describe('World Countries Drill order', () => {
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
