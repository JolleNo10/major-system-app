import { describe, expect, it } from 'vitest'
import { MAP_DEFINITIONS } from '@/features/world-countries/common/worldMap'

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
})
