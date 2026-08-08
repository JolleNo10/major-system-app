import europeSvgUrl from '@/features/world-countries/assets/MapChart_Map_Europe_names.svg?url'
import type { SvgMapHoverGroup, SvgMapZoomArea } from '@/features/world-countries/common/SvgMapController'

export interface MapDefinition {
  id: string
  label: string
  svgUrl: string
  demoCountryIds: readonly string[]
  hoverGroups: readonly SvgMapHoverGroup[]
  zoomAreas: readonly SvgMapZoomArea[]
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
    zoomAreas: [
      {
        id: 'nordics',
        label: 'Nordics',
        countryIds: ['Denmark', 'Finland', 'Iceland', 'Norway', 'Sweden'],
        padding: 50,
      },
    ],
  },
]
