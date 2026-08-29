import { describe, expect, it } from 'vitest'
import { countries } from './countries'
import {
  getEffectiveLandBorderNeighbourIds,
  getLandBorderNeighbourIds,
  LAND_BORDER_PAIRS,
} from './landBorders'

const countryIds = new Set(countries.map(country => country.id))

function pairKey(left: string, right: string): string {
  return [left, right].sort().join('::')
}

describe('World Countries land-border graph', () => {
  it('contains the reviewed 315 unique pairs over canonical Countries', () => {
    expect(LAND_BORDER_PAIRS).toHaveLength(315)
    expect(LAND_BORDER_PAIRS.every(([left, right]) => countryIds.has(left) && countryIds.has(right))).toBe(true)
    expect(LAND_BORDER_PAIRS.some(([left, right]) => left === right)).toBe(false)
    expect(new Set(LAND_BORDER_PAIRS.map(([left, right]) => pairKey(left, right))).size).toBe(LAND_BORDER_PAIRS.length)
  })

  it('derives symmetric adjacency and representative border sets', () => {
    for (const [left, right] of LAND_BORDER_PAIRS) {
      expect(getLandBorderNeighbourIds(left)).toContain(right)
      expect(getLandBorderNeighbourIds(right)).toContain(left)
    }
    expect(new Set(getLandBorderNeighbourIds('DE'))).toEqual(new Set(['AT', 'BE', 'CH', 'CZ', 'DK', 'FR', 'LU', 'NL', 'PL']))
    expect(new Set(getLandBorderNeighbourIds('XK'))).toEqual(new Set(['AL', 'ME', 'MK', 'RS']))
    expect(getLandBorderNeighbourIds('IS')).toEqual([])
    expect(getLandBorderNeighbourIds('AU')).toEqual([])
  })

  it('filters inactive Countries without contracting the graph', () => {
    expect(new Set(getEffectiveLandBorderNeighbourIds('DE', ['DE', 'PL', 'AT']))).toEqual(new Set(['AT', 'PL']))
    expect(new Set(getEffectiveLandBorderNeighbourIds('XK', ['XK', 'AL', 'ME', 'MK', 'RS']))).toEqual(new Set(['AL', 'ME', 'MK', 'RS']))
    expect(new Set(getEffectiveLandBorderNeighbourIds('RS', ['XK', 'AL', 'ME', 'MK', 'RS']))).toEqual(new Set(['ME', 'MK', 'XK']))
    expect(getEffectiveLandBorderNeighbourIds('RS', countries.map(country => country.id))).toContain('XK')
    expect(getEffectiveLandBorderNeighbourIds('RS', countries.map(country => country.id))).not.toContain('AL')
    expect(getEffectiveLandBorderNeighbourIds('RS', ['AL', 'RS'])).toEqual([])
    expect(getEffectiveLandBorderNeighbourIds('RS', ['RS', 'AL'])).toEqual([])
    expect(getEffectiveLandBorderNeighbourIds('AL', ['AL', 'RS'])).toEqual([])
  })

  it('applies the optional entity filter to observer states and retains reviewed special cases', () => {
    expect(getEffectiveLandBorderNeighbourIds('EG', ['EG', 'IL', 'PS'])).toEqual(['IL', 'PS'])
    expect(getEffectiveLandBorderNeighbourIds('EG', ['EG', 'IL'])).toEqual(['IL'])
    expect(getEffectiveLandBorderNeighbourIds('IT', ['IT', 'VA'])).toContain('VA')
    expect(getEffectiveLandBorderNeighbourIds('IT', ['IT'])).not.toContain('VA')
    expect(getLandBorderNeighbourIds('ES')).toContain('MA')
    expect(getLandBorderNeighbourIds('MA')).toContain('ES')
    expect(getLandBorderNeighbourIds('RS')).not.toContain('AL')
    expect(getLandBorderNeighbourIds('FR')).not.toContain('BR')
    expect(getLandBorderNeighbourIds('FR')).not.toContain('SR')
    expect(getLandBorderNeighbourIds('MA')).not.toContain('MR')
    expect(getLandBorderNeighbourIds('CA')).not.toContain('GL')
  })
})
