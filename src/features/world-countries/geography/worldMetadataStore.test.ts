// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  getWorldMetadata,
  resetWorldContinentOrder,
  setWorldContinentOrder,
} from './worldMetadataStore'

afterEach(() => localStorage.clear())

describe('World metadata persistence', () => {
  it('persists, deduplicates, and resets the Continent order', () => {
    setWorldContinentOrder(['north-america', 'europe', 'north-america'])

    expect(getWorldMetadata()).toMatchObject({
      continentOrder: ['north-america', 'europe'],
    })

    resetWorldContinentOrder()
    expect(getWorldMetadata()).toBeNull()
  })
})
