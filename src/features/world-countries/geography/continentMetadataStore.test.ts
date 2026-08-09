// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  getContinentMetadata,
  resetContinentSubregionOrder,
  setContinentSubregionOrder,
} from './continentMetadataStore'

afterEach(() => localStorage.clear())

describe('Continent metadata persistence', () => {
  it('persists Subregion ordering, dedupes it, and resets it', () => {
    setContinentSubregionOrder('Europe', ['western-europe', 'northern-europe', 'western-europe'])
    expect(getContinentMetadata('Europe')?.subregionOrder).toEqual(['western-europe', 'northern-europe'])
    resetContinentSubregionOrder('Europe')
    expect(getContinentMetadata('Europe')).toBeNull()
  })
})
