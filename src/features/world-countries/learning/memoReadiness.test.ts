import { describe, expect, it } from 'vitest'
import {
  canEnterCapitalMemo,
  createWorldCountriesMemoReadinessByCountry,
  deriveWorldCountriesMemoReadiness,
  getMemoReadinessForCountry,
  WORLD_COUNTRIES_MEMO_READINESS_COLORS,
  WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES,
} from './memoReadiness'

describe('World Countries Memo readiness', () => {
  it('keeps the canonical three-state palette and accessible labels together', () => {
    expect(WORLD_COUNTRIES_MEMO_READINESS_LEGEND_ENTRIES).toEqual([
      { state: 'NOT_MEMOED', label: 'Not memoed', color: '#52525b' },
      { state: 'COUNTRIES_MEMOED', label: 'Countries memoed', color: '#7c3aed' },
      { state: 'COUNTRIES_AND_CAPITALS_MEMOED', label: 'Countries + Capitals memoed', color: '#c026d3' },
    ])
    expect(WORLD_COUNTRIES_MEMO_READINESS_COLORS).toEqual({
      NOT_MEMOED: '#52525b',
      COUNTRIES_MEMOED: '#7c3aed',
      COUNTRIES_AND_CAPITALS_MEMOED: '#c026d3',
    })
  })

  it.each([
    [undefined, undefined, 'NOT_MEMOED'],
    [123, undefined, 'COUNTRIES_MEMOED'],
    [123, 456, 'COUNTRIES_AND_CAPITALS_MEMOED'],
    [undefined, 456, 'NOT_MEMOED'],
  ] as const)('derives %s/%s as %s', (countriesLearnedAt, capitalsLearnedAt, expected) => {
    expect(deriveWorldCountriesMemoReadiness({
      subregionId: 'northern-europe',
      ...(countriesLearnedAt === undefined ? {} : { countriesLearnedAt }),
      ...(capitalsLearnedAt === undefined ? {} : { capitalsLearnedAt }),
    })).toBe(expected)
  })

  it('uses one readiness state for every Country in a Subregion', () => {
    const states = [{ subregionId: 'northern-europe' as const, countriesLearnedAt: 123 }]
    const countries = [
      { id: 'NO', subregionId: 'northern-europe' as const },
      { id: 'SE', subregionId: 'northern-europe' as const },
    ]

    expect(createWorldCountriesMemoReadinessByCountry(countries, states)).toEqual(new Map([
      ['NO', 'COUNTRIES_MEMOED'],
      ['SE', 'COUNTRIES_MEMOED'],
    ]))
  })

  it('does not unlock Capital Memo for a Capitals-only legacy row', () => {
    const state = { subregionId: 'northern-europe' as const, capitalsLearnedAt: 456 }
    expect(canEnterCapitalMemo(state)).toBe(false)
    expect(getMemoReadinessForCountry({ subregionId: 'northern-europe' }, new Map([
      ['northern-europe', state],
    ]))).toBe('NOT_MEMOED')
  })
})
