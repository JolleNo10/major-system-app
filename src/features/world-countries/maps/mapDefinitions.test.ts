// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import africaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Africa.svg?raw'
import americaSvg from '@/features/world-countries/maps/assets/MapChart_Map_America.svg?raw'
import asiaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Asia.svg?raw'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe_names.svg?raw'
import oceaniaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Oceania.svg?raw'
import { SvgMapController } from '@/features/world-countries/maps/SvgMapController'
import { CONTINENT_MAP_IDS, countries } from '@/features/world-countries/data/countries'
import { getContinents, getCountriesForContinent } from '@/features/world-countries/geography/queries'
import { findUnresolvedCountries } from './geographyMapAdapter'
import { getMemoMapDefinition, MEMO_MAP_DEFINITIONS } from './mapDefinitions'

const controllers: SvgMapController[] = []

afterEach(() => {
  while (controllers.length) controllers.pop()?.destroy()
  document.body.replaceChildren()
})

describe('Memo map registry', () => {
  it('keeps the world registry explicit and maps its domain continents', () => {
    const world = MEMO_MAP_DEFINITIONS.find(definition => definition.id === 'world')
    expect(world?.domainContinents).toEqual(getContinents())
    expect(CONTINENT_MAP_IDS).toEqual({
      Africa: 'africa',
      Asia: 'asia',
      Europe: 'europe',
      'North America': 'america',
      'South America': 'america',
      Oceania: 'oceania',
    })
    expect(getMemoMapDefinition('Oceania').id).toBe('oceania')
  })

  it.each([
    ['Africa', africaSvg],
    ['Asia', asiaSvg],
    ['Europe', europeSvg],
    ['North America', americaSvg],
    ['South America', americaSvg],
    ['Oceania', oceaniaSvg],
  ] as const)('resolves every %s domain record against its registered asset', async (continent, markup) => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const controller = new SvgMapController(mount)
    controllers.push(controller)
    const discovered = await controller.load({ markup })
    const unresolved = findUnresolvedCountries(
      getCountriesForContinent(continent),
      discovered.map(country => country.id),
    )
    const unresolvedNames = unresolved.map(item => item.country.country)
    expect(unresolved, unresolvedNames.join(', ')).toEqual([])

    const highlighted = controller.setHighlighted(discovered.map(country => country.id))
    expect(highlighted).toEqual({
      activeIds: discovered.map(country => country.id),
      unknownIds: [],
    })
    for (const country of discovered) {
      const path = mount.querySelector<SVGPathElement>(`path[id="${country.pathId}"]`)
      expect(path?.getAttribute('id')).toBe(country.pathId)
      expect(path?.style.getPropertyValue('fill')).toBe('#0891b2')
    }
  })
})
