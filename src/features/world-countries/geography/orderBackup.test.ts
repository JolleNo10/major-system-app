// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exportWorldCountriesOrder,
  parseWorldCountriesOrder,
  restoreWorldCountriesOrder,
} from './orderBackup'
import { getAllContinentMetadata, setContinentMetadata } from './continentMetadataStore'
import { getAllSubregionMetadata, setSubregionMetadata } from './subregionMetadataStore'
import { getWorldMetadata, setWorldMetadata } from './worldMetadataStore'
import { subscribeToWorldCountriesGeography } from './geographyRefresh'

afterEach(() => localStorage.clear())

const emptyOrder = {
  version: 3,
  feature: 'world-countries',
  mnemonics: [],
  subregions: [],
  continents: [],
  world: null,
} as const

describe('World Countries order backup', () => {
  it('exports raw saved order metadata, including hidden Country IDs', async () => {
    setSubregionMetadata({
      subregionId: 'northern-america',
      countryOrder: ['GL', 'US'],
      updatedAt: 7,
    })
    setWorldMetadata({ continentOrder: ['north-america'], updatedAt: 8 })

    const payload = JSON.parse(await readBlob(exportWorldCountriesOrder()))

    expect(payload).toEqual({
      ...emptyOrder,
      subregions: [{ subregionId: 'northern-america', countryOrder: ['GL', 'US'], updatedAt: 7 }],
      world: { continentOrder: ['north-america'], updatedAt: 8 },
    })
  })

  it('exports an empty v3 envelope without materializing canonical rows', async () => {
    expect(JSON.parse(await readBlob(exportWorldCountriesOrder()))).toEqual(emptyOrder)
  })

  it('requires the complete v3 envelope and ignores mnemonic entries', () => {
    const parsed = parseWorldCountriesOrder(JSON.stringify({
      ...emptyOrder,
      mnemonics: [{ malformed: true }],
      continents: [{ continentId: 'europe', subregionOrder: ['northern-europe'], updatedAt: 9 }],
    }))

    expect(parsed).toEqual({
      subregions: [],
      continents: [{ continentId: 'europe', subregionOrder: ['northern-europe'], updatedAt: 9 }],
      world: null,
    })

    expect(() => parseWorldCountriesOrder(JSON.stringify({
      ...emptyOrder,
      version: 2,
    }))).toThrow()
    expect(() => parseWorldCountriesOrder(JSON.stringify({
      ...emptyOrder,
      world: undefined,
    }))).toThrow()
  })

  it('rejects duplicate owner rows before any restore writes', () => {
    setWorldMetadata({ continentOrder: ['europe'], updatedAt: 1 })
    expect(() => parseWorldCountriesOrder(JSON.stringify({
      ...emptyOrder,
      subregions: [
        { subregionId: 'northern-europe', countryOrder: ['NO'], updatedAt: 1 },
        { subregionId: 'northern-europe', countryOrder: ['SE'], updatedAt: 2 },
      ],
    }))).toThrow()
    expect(getWorldMetadata()).toMatchObject({ continentOrder: ['europe'] })
  })

  it('replaces complete saved state and emits one refresh notification', () => {
    setWorldMetadata({ continentOrder: ['europe'], updatedAt: 1 })
    setContinentMetadata({ continentId: 'europe', subregionOrder: ['northern-europe'], updatedAt: 2 })
    setSubregionMetadata({ subregionId: 'northern-europe', countryOrder: ['NO'], updatedAt: 3 })
    const listener = vi.fn()
    const unsubscribe = subscribeToWorldCountriesGeography(listener)

    restoreWorldCountriesOrder({
      subregions: [{ subregionId: 'western-europe', countryOrder: ['FR'], updatedAt: 30 }],
      continents: [{ continentId: 'asia', subregionOrder: ['east-asia'], updatedAt: 20 }],
      world: null,
    })

    unsubscribe()
    expect(getWorldMetadata()).toBeNull()
    expect(getAllContinentMetadata()).toEqual([{ continentId: 'asia', subregionOrder: ['east-asia'], updatedAt: 20 }])
    expect(getAllSubregionMetadata()).toEqual([{ subregionId: 'western-europe', countryOrder: ['FR'], updatedAt: 30 }])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reports an owner-store write failure without emitting success refresh', () => {
    setWorldMetadata({ continentOrder: ['europe'], updatedAt: 1 })
    const listener = vi.fn()
    const unsubscribe = subscribeToWorldCountriesGeography(listener)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota') })

    expect(() => restoreWorldCountriesOrder({ subregions: [], continents: [], world: { continentOrder: ['asia'], updatedAt: 2 } })).toThrow()

    unsubscribe()
    expect(getWorldMetadata()).toMatchObject({ continentOrder: ['europe'], updatedAt: 1 })
    expect(listener).not.toHaveBeenCalled()
  })
})

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}
