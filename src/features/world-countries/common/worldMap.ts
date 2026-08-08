import europeSvgUrl from '@/features/world-countries/assets/MapChart_Map_Europe_names.svg?url'
import type { SvgMapHoverGroup } from '@/features/world-countries/common/SvgMapController'

export interface MapDefinition {
  id: string
  label: string
  svgUrl: string
  demoCountryIds: readonly string[]
  hoverGroups: readonly SvgMapHoverGroup[]
}

export const MAP_DEFINITIONS: readonly MapDefinition[] = [
  {
    id: 'europe',
    label: 'Europe',
    svgUrl: europeSvgUrl,
    demoCountryIds: ['Germany', 'Italy', 'England', 'Andorra'],
    hoverGroups: [
      {
        id: 'scandinavia-demo',
        countryIds: ['Norway', 'Sweden', 'Denmark'],
      },
    ],
  },
]
