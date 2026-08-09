import { describe, expect, it } from 'vitest'
import { MAP_DEFINITIONS } from '@/features/world-countries/maps/mapDefinitions'
import { countries } from '@/features/world-countries/data/countries'
import { buildCountryHierarchy, mapCountryNamesToSvgIds } from '@/features/world-countries/maps/workarea/MapWorkarea'

describe('world map definitions', () => {
  const europe = MAP_DEFINITIONS[0]

  it('keeps the focused Workarea demo controls', () => {
    expect(europe.demoCountryIds).toEqual(['Germany', 'Italy', 'England', 'Andorra'])
  })

  it('defines the Scandinavian group-hover demonstration', () => {
    expect(europe.hoverGroups).toEqual([
      {
        id: 'scandinavia-demo',
        countryIds: ['Norway', 'Sweden', 'Denmark'],
      },
    ])
  })

  it('defines a padded Nordics zoom area', () => {
    expect(europe.zoomAreas).toEqual([
      {
        id: 'nordics',
        label: 'Nordics',
        countryIds: ['Denmark', 'Finland', 'Iceland', 'Norway', 'Sweden'],
        padding: 50,
      },
    ])
  })

  it('maps Europe dataset names to the SVG country IDs', () => {
    expect(mapCountryNamesToSvgIds([
      'Bosnia and Herzegovina',
      'North Macedonia',
      'United Kingdom',
      'France',
    ])).toEqual([
      'Bosnia_and_Herzegovina',
      'North_Macedonia',
      'England',
      'Northern_Ireland',
      'Scotland',
      'Wales',
      'France',
    ])
  })

  it('groups countries by continent and subregion in alphabetical order', () => {
    const hierarchy = buildCountryHierarchy([
      { country: 'Zulu', capital: '', continent: 'Asia', subregion: 'West Asia' },
      { country: 'Alpha', capital: '', continent: 'Europe', subregion: 'Balkans' },
      { country: 'Bravo', capital: '', continent: 'Asia', subregion: 'East Asia' },
      { country: 'Charlie', capital: '', continent: 'Europe', subregion: 'Balkans' },
    ])

    expect(hierarchy).toEqual([
      {
        continent: 'Asia',
        subregions: [
          { name: 'East Asia', countries: ['Bravo'] },
          { name: 'West Asia', countries: ['Zulu'] },
        ],
      },
      {
        continent: 'Europe',
        subregions: [
          { name: 'Balkans', countries: ['Alpha', 'Charlie'] },
        ],
      },
    ])

    expect(hierarchy[0].subregions.reduce((total, subregion) => total + subregion.countries.length, 0)).toBe(2)
    expect(hierarchy[0].subregions).toHaveLength(2)
    expect(hierarchy[1].subregions[0].countries).toHaveLength(2)
  })

  it('includes every dataset country exactly once', () => {
    const listedCountries = buildCountryHierarchy(countries)
      .flatMap(continent => continent.subregions)
      .flatMap(subregion => subregion.countries)

    expect(listedCountries).toHaveLength(countries.length)
    expect(new Set(listedCountries).size).toBe(countries.length)
    expect(listedCountries.sort()).toEqual(countries.map(country => country.country).sort())
  })
})
