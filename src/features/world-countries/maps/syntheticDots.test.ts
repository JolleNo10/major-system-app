// @vitest-environment jsdom

import oceaniaSvg from './assets/MapChart_Map_Oceania.svg?raw'
import { describe, expect, it } from 'vitest'
import {
  getMapSyntheticDots,
  getSyntheticDotSourceFingerprint,
  MAP_SYNTHETIC_DOTS,
  validateMapSyntheticDots,
} from './syntheticDots'

function source(markup: string) {
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = document.querySelector('svg[id="map"]') ?? document.documentElement
  return {
    mapId: 'oceania',
    viewBox: svg.getAttribute('viewBox') ?? '',
    paths: new Map([...document.querySelectorAll<SVGPathElement>('path[id]')]
      .map(path => [path.id, path.getAttribute('d') ?? ''])),
  }
}

describe('Oceania synthetic task dots', () => {
  it('defines exactly one validated dot for Samoa, Solomon Islands, and Vanuatu', () => {
    expect(getMapSyntheticDots('oceania', ['WS'])).toHaveLength(1)
    expect(getMapSyntheticDots('oceania', ['SB'])).toHaveLength(1)
    expect(getMapSyntheticDots('oceania', ['VU'])).toHaveLength(1)
    expect(MAP_SYNTHETIC_DOTS.map(dot => dot.countryId)).toEqual(['WS', 'SB', 'VU'])
    expect(() => validateMapSyntheticDots(MAP_SYNTHETIC_DOTS, [source(oceaniaSvg)])).not.toThrow()
  })

  it('rejects stale, missing, duplicate, and out-of-bounds authored decisions', () => {
    const current = source(oceaniaSvg)
    const stale = MAP_SYNTHETIC_DOTS.map(dot => dot.countryId === 'SB'
      ? { ...dot, sourceFingerprint: getSyntheticDotSourceFingerprint('changed') }
      : dot)
    expect(() => validateMapSyntheticDots(stale, [current])).toThrow('Stale synthetic dot source')

    expect(() => validateMapSyntheticDots([
      ...MAP_SYNTHETIC_DOTS,
      { ...MAP_SYNTHETIC_DOTS[0] },
    ], [current])).toThrow('Duplicate synthetic dot')

    expect(() => validateMapSyntheticDots([
      { ...MAP_SYNTHETIC_DOTS[0], sourceSvgId: 'Missing' },
    ], [current])).toThrow('Unknown source SVG path')

    expect(() => validateMapSyntheticDots([
      { ...MAP_SYNTHETIC_DOTS[0], point: { x: 1101, y: 327 } },
    ], [current])).toThrow('outside its map viewBox')
  })

  it('allows multiple explicit points for one Country when each point is distinct', () => {
    const multiple = [
      { ...MAP_SYNTHETIC_DOTS[0], point: { x: 915.82, y: 327.45 } },
      { ...MAP_SYNTHETIC_DOTS[0], point: { x: 916.82, y: 328.45 } },
    ]

    expect(getMapSyntheticDots('oceania', ['WS'])).toHaveLength(1)
    expect(() => validateMapSyntheticDots(multiple, [source(oceaniaSvg)])).not.toThrow()
  })
})
