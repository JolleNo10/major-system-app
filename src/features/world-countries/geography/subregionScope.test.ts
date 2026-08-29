import { describe, expect, it } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import {
  clearSubregionScope,
  getContinentScopeState,
  getCountriesForSubregionScopeInEffectiveOrder,
  getSubregionScopeCounts,
  getSubregionScopeLabel,
  normalizeSubregionScope,
  selectAllSubregions,
  toggleContinentInScope,
  toggleSubregionInScope,
  type WorldCountriesSubregionScope,
  type WorldCountriesSubregionScopeMetadata,
} from './subregionScope'

const entries: readonly Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'IN', country: 'India', capital: 'New Delhi', continent: 'Asia', subregionId: 'south-asia', subregion: 'South Asia' },
  { id: 'JP', country: 'Japan', capital: 'Tokyo', continent: 'Asia', subregionId: 'east-asia', subregion: 'East Asia' },
  { id: 'IN', country: 'India', capital: 'New Delhi', continent: 'Asia', subregionId: 'south-asia', subregion: 'South Asia' },
]

const metadata: WorldCountriesSubregionScopeMetadata = {
  world: { continentOrder: ['asia', 'europe'] },
  continents: [
    { continentId: 'asia', subregionOrder: ['south-asia', 'east-asia'] },
    { continentId: 'europe', subregionOrder: ['northern-europe'] },
  ],
  subregions: [
    { subregionId: 'south-asia', countryOrder: ['IN'] },
    { subregionId: 'east-asia', countryOrder: ['JP'] },
    { subregionId: 'northern-europe', countryOrder: ['SE', 'NO'] },
  ],
}

describe('World Countries shared Subregion scope', () => {
  it('normalizes selected Subregions across the World in effective order', () => {
    expect(normalizeSubregionScope({ subregionIds: ['northern-europe', 'stale' as never, 'south-asia', 'south-asia'] }, entries, metadata))
      .toEqual({ subregionIds: ['south-asia', 'northern-europe'] })
  })

  it('derives none, partial, and all Continent state', () => {
    const empty = clearSubregionScope()
    expect(getContinentScopeState(empty, 'Asia', entries, metadata)).toBe('none')
    expect(getContinentScopeState({ subregionIds: ['south-asia'] }, 'Asia', entries, metadata)).toBe('partial')
    expect(getContinentScopeState({ subregionIds: ['south-asia', 'east-asia'] }, 'Asia', entries, metadata)).toBe('all')
  })

  it('toggles a full Continent without clearing other Continents', () => {
    const partial: WorldCountriesSubregionScope = { subregionIds: ['south-asia', 'northern-europe'] }
    expect(toggleContinentInScope(partial, 'Asia', entries, metadata)).toEqual({
      subregionIds: ['south-asia', 'east-asia', 'northern-europe'],
    })
    expect(toggleContinentInScope({ subregionIds: ['south-asia', 'east-asia', 'northern-europe'] }, 'Asia', entries, metadata))
      .toEqual({ subregionIds: ['northern-europe'] })
  })

  it('toggles one Subregion while preserving selections elsewhere', () => {
    expect(toggleSubregionInScope({ subregionIds: ['northern-europe'] }, 'east-asia', entries, metadata))
      .toEqual({ subregionIds: ['east-asia', 'northern-europe'] })
    expect(toggleSubregionInScope({ subregionIds: ['east-asia', 'northern-europe'] }, 'east-asia', entries, metadata))
      .toEqual({ subregionIds: ['northern-europe'] })
  })

  it('selects all active Subregions and clears the whole scope', () => {
    expect(selectAllSubregions(entries, metadata)).toEqual({
      subregionIds: ['south-asia', 'east-asia', 'northern-europe'],
    })
    expect(clearSubregionScope()).toEqual({ subregionIds: [] })
  })

  it('reports selected Continent, Subregion, and Country counts', () => {
    expect(getSubregionScopeCounts({ subregionIds: ['south-asia', 'northern-europe'] }, entries, metadata)).toEqual({
      continents: 2,
      subregions: 2,
      countries: 3,
    })
  })

  it('resolves effective World -> Continent -> Subregion -> Country order and deduplicates Countries', () => {
    const scope: WorldCountriesSubregionScope = { subregionIds: ['northern-europe', 'south-asia'] }
    expect(getCountriesForSubregionScopeInEffectiveOrder(scope, entries, metadata).map(country => country.id))
      .toEqual(['IN', 'SE', 'NO'])
    expect(getSubregionScopeLabel(scope, entries, metadata)).toBe('World')
    expect(getSubregionScopeLabel({ subregionIds: ['northern-europe'] }, entries, metadata)).toBe('Europe')
  })
})
