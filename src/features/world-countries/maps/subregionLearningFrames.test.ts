// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { SUBREGION_DEFINITIONS } from '@/features/world-countries/data/subregions'
import { countryToSvgIds } from './countryMapIds'
import { getMemoMapDefinition } from './mapDefinitions'
import africaSvg from './assets/MapChart_Map_Africa.svg?raw'
import americaSvg from './assets/MapChart_Map_America.svg?raw'
import asiaSvg from './assets/MapChart_Map_Asia.svg?raw'
import europeSvg from './assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from './assets/MapChart_Map_Oceania.svg?raw'
import { getSubregionLearningFrame, isValidSubregionLearningFrame, SUBREGION_LEARNING_FRAMES } from './subregionLearningFrames'
import {
  readSvgElementTransform,
  readSvgPathGeometryComponents,
  transformPoint,
  type SvgAffineTransform,
} from './svgGeometry'
import { fitViewBoxToAspect, parseViewBox, type SvgViewBoxRect } from './viewBoxFit'

const sourceSvgs = new Map([
  ['africa', africaSvg],
  ['america', americaSvg],
  ['asia', asiaSvg],
  ['europe', europeSvg],
  ['oceania', oceaniaSvg],
])

function sourceBounds(mapId: string) {
  const svg = sourceSvgs.get(mapId)
  const value = svg?.match(/\bviewBox="([^"]+)"/)?.[1]
  return value ? parseViewBox(value) : null
}

function transformBounds(bounds: { x: number; y: number; width: number; height: number }, transform: SvgAffineTransform | null) {
  if (!transform) return bounds
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ].map(point => transformPoint(transform, point))
  const minX = Math.min(...corners.map(point => point.x))
  const minY = Math.min(...corners.map(point => point.y))
  const maxX = Math.max(...corners.map(point => point.x))
  const maxY = Math.max(...corners.map(point => point.y))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function unionBounds(bounds: readonly { x: number; y: number; width: number; height: number }[]) {
  if (bounds.length === 0) return null
  const minX = Math.min(...bounds.map(entry => entry.x))
  const minY = Math.min(...bounds.map(entry => entry.y))
  const maxX = Math.max(...bounds.map(entry => entry.x + entry.width))
  const maxY = Math.max(...bounds.map(entry => entry.y + entry.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const ORDINARY_COUNTRY_SAFE_MARGIN_RATIO = 0.08

function isInsideSafeArea(countryBounds: SvgViewBoxRect, frameBounds: SvgViewBoxRect, marginRatio: number) {
  const margin = Math.min(frameBounds.width, frameBounds.height) * marginRatio
  return countryBounds.x >= frameBounds.x + margin
    && countryBounds.y >= frameBounds.y + margin
    && countryBounds.x + countryBounds.width <= frameBounds.x + frameBounds.width - margin
    && countryBounds.y + countryBounds.height <= frameBounds.y + frameBounds.height - margin
}

function countrySourceBounds(mapId: string, countryId: string) {
  const markup = sourceSvgs.get(mapId)
  const country = countries.find(entry => entry.id === countryId)
  if (!markup || !country) return null
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const pathId = countryToSvgIds(country).find(candidate => document.getElementById(candidate))
  const path = pathId ? document.getElementById(pathId) : null
  const pathData = path?.getAttribute('d')
  if (!path || path.localName.toLowerCase() !== 'path' || !pathData) return null
  const transform = readSvgElementTransform(path as unknown as SVGGraphicsElement)
  return unionBounds(readSvgPathGeometryComponents(pathData).map(component => transformBounds(component.bounds, transform)))
}

describe('Subregion learning frames', () => {
  it('covers each current Subregion exactly once', () => {
    expect(SUBREGION_LEARNING_FRAMES).toHaveLength(SUBREGION_DEFINITIONS.length)
    expect(new Set(SUBREGION_LEARNING_FRAMES.map(frame => frame.subregionId)).size)
      .toBe(SUBREGION_DEFINITIONS.length)
    expect(SUBREGION_LEARNING_FRAMES.map(frame => frame.subregionId))
      .toEqual(SUBREGION_DEFINITIONS.map(definition => definition.id))
  })

  it('uses each Subregion definition and its authoritative regional map', () => {
    for (const definition of SUBREGION_DEFINITIONS) {
      const frame = getSubregionLearningFrame(definition.id)
      expect(frame).toMatchObject({
        subregionId: definition.id,
        continent: definition.continent,
        mapDefinitionId: getMemoMapDefinition(definition.continent).id,
      })
    }
  })

  it('keeps every authored frame finite, positive, and inside its source coordinate system', () => {
    for (const frame of SUBREGION_LEARNING_FRAMES) {
      expect(isValidSubregionLearningFrame(frame, sourceBounds(frame.mapDefinitionId))).toBe(true)
    }
  })

  it('returns one stable frame for different Countries in one Subregion', () => {
    const norway = getSubregionLearningFrame('northern-europe')
    const sweden = getSubregionLearningFrame('northern-europe')
    expect(norway).toEqual(sweden)
    expect(norway?.mapDefinitionId).toBe('europe')
  })

  it.each([
    ['central-europe', 'PL', 'Poland'],
    ['balkans', 'RS', 'Serbia'],
    ['eastern-europe', 'RO', 'Romania'],
  ] as const)('%s keeps %s inside an ordinary-Country safe area', (subregionId, countryId, countryName) => {
    const frame = getSubregionLearningFrame(subregionId)
    const source = frame ? sourceBounds(frame.mapDefinitionId) : null
    const countryBounds = frame ? countrySourceBounds(frame.mapDefinitionId, countryId) : null
    const cameraBounds = frame && source
      ? fitViewBoxToAspect(frame.bounds, source.width / source.height)
      : null

    expect(countryBounds, `${countryName} geometry should resolve from the authoritative SVG`).not.toBeNull()
    expect(cameraBounds).not.toBeNull()
    expect(isInsideSafeArea(countryBounds!, cameraBounds!, ORDINARY_COUNTRY_SAFE_MARGIN_RATIO)).toBe(true)
  })

  it('keeps Oceania learning compositions broad enough for regional orientation', () => {
    expect(getSubregionLearningFrame('australia-new-zealand')?.bounds).toMatchObject({ width: 950, height: 650 })
    expect(getSubregionLearningFrame('melanesia')?.bounds).toMatchObject({ width: 950, height: 640 })
    expect(getSubregionLearningFrame('micronesia')?.bounds).toMatchObject({ width: 700, height: 260 })
    expect(getSubregionLearningFrame('polynesia')?.bounds).toMatchObject({ width: 650, height: 500 })
  })

  it('does not widen Eastern Europe to fit the complete Russia geometry', () => {
    const frame = getSubregionLearningFrame('eastern-europe')
    const russiaBounds = frame ? countrySourceBounds(frame.mapDefinitionId, 'RU') : null
    expect(russiaBounds).not.toBeNull()
    expect(russiaBounds!.y < frame!.bounds.y || russiaBounds!.y + russiaBounds!.height > frame!.bounds.y + frame!.bounds.height)
      .toBe(true)
  })
})
