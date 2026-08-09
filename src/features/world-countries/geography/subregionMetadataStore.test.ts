// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  getSubregionMetadata,
  resetSubregionCountryOrder,
  setSubregionCountryOrder,
} from './subregionMetadataStore'

afterEach(() => localStorage.clear())

describe('Subregion metadata persistence', () => {
  it('persists ordering separately from mnemonic content and resets it', () => {
    setSubregionCountryOrder('northern-europe', ['DK', 'NO', 'DK'])
    expect(getSubregionMetadata('northern-europe')?.countryOrder).toEqual(['DK', 'NO'])
    resetSubregionCountryOrder('northern-europe')
    expect(getSubregionMetadata('northern-europe')).toBeNull()
  })
})
