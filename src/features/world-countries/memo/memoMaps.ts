import africaSvgUrl from '@/features/world-countries/assets/MapChart_Map_Africa.svg?url'
import americaSvgUrl from '@/features/world-countries/assets/MapChart_Map_America.svg?url'
import asiaSvgUrl from '@/features/world-countries/assets/MapChart_Map_Asia.svg?url'
import europeSvgUrl from '@/features/world-countries/assets/MapChart_Map_Europe_names.svg?url'
import oceaniaSvgUrl from '@/features/world-countries/assets/MapChart_Map_Oceania.svg?url'
import worldSvgUrl from '@/features/world-countries/assets/MapChart_Map_World.svg?url'
import { CONTINENT_MAP_IDS, type Continent } from '@/features/world-countries/data/countries'
import { getContinents } from './geographyMemo'

export interface MemoMapDefinition {
  id: string
  label: string
  svgUrl: string
  domainContinents: readonly Continent[]
  zoomPadding: number
}

export const ALL_CONTINENTS: readonly Continent[] = getContinents()

/** Explicit rendering configuration; geography membership remains data-driven. */
export const MEMO_MAP_DEFINITIONS: readonly MemoMapDefinition[] = [
  {
    id: 'world',
    label: 'World',
    svgUrl: worldSvgUrl,
    domainContinents: ALL_CONTINENTS,
    zoomPadding: 40,
  },
  {
    id: 'africa',
    label: 'Africa',
    svgUrl: africaSvgUrl,
    domainContinents: ['Africa'],
    zoomPadding: 32,
  },
  {
    id: 'asia',
    label: 'Asia',
    svgUrl: asiaSvgUrl,
    domainContinents: ['Asia'],
    zoomPadding: 32,
  },
  {
    id: 'europe',
    label: 'Europe',
    svgUrl: europeSvgUrl,
    domainContinents: ['Europe'],
    zoomPadding: 32,
  },
  {
    id: 'america',
    label: 'The Americas',
    svgUrl: americaSvgUrl,
    domainContinents: ['North America', 'South America'],
    zoomPadding: 32,
  },
  {
    id: 'oceania',
    label: 'Oceania',
    // The bundled Oceania asset is the local regional map for this Continent.
    svgUrl: oceaniaSvgUrl,
    domainContinents: ['Oceania'],
    zoomPadding: 32,
  },
]

export function getMemoMapDefinition(continent: Continent): MemoMapDefinition {
  const mapId = CONTINENT_MAP_IDS[continent]
  return MEMO_MAP_DEFINITIONS.find(definition => definition.id === mapId)
    ?? MEMO_MAP_DEFINITIONS[0]
}
