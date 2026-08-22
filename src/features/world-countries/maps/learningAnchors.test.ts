// @vitest-environment jsdom

import europeSvg from './assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from './assets/MapChart_Map_Oceania.svg?raw'
import { describe, expect, it } from 'vitest'
import { MAP_LEARNING_ANCHORS, validateMapLearningAnchors } from './learningAnchors'

function source(mapId: string, markup: string) {
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const svg = document.querySelector('svg[id="map"]') ?? document.documentElement
  return {
    mapId,
    viewBox: svg.getAttribute('viewBox') ?? '',
    paths: new Map([...document.querySelectorAll<SVGPathElement>('path[id]')].map(path => [path.id, path.getAttribute('d') ?? ''])),
  }
}

describe('map learning anchors', () => {
  it('validates the bundled single-dot and representative multi-dot decisions', () => {
    expect(() => validateMapLearningAnchors(MAP_LEARNING_ANCHORS, [
      source('europe', europeSvg),
      source('oceania', oceaniaSvg),
    ])).not.toThrow()
  })

  it('rejects stale representative data instead of choosing another component', () => {
    const stale = MAP_LEARNING_ANCHORS.map(anchor => anchor.countryId === 'FM'
      ? { ...anchor, sourceFingerprint: `${anchor.sourceFingerprint} changed` }
      : anchor)
    expect(() => validateMapLearningAnchors(stale, [
      source('europe', europeSvg),
      source('oceania', oceaniaSvg),
    ])).toThrow('Stale learning anchor source')
  })
})
