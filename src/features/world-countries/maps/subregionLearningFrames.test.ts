// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { SUBREGION_DEFINITIONS } from '@/features/world-countries/data/subregions'
import { countryToSvgIds } from './countryMapIds'
import { getMapLearningAnchors } from './learningAnchors'
import { getMemoMapDefinition } from './mapDefinitions'
import africaSvg from './assets/MapChart_Map_Africa.svg?raw'
import americaSvg from './assets/MapChart_Map_America.svg?raw'
import asiaSvg from './assets/MapChart_Map_Asia.svg?raw'
import europeSvg from './assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from './assets/MapChart_Map_Oceania.svg?raw'
import { getSubregionLearningFrame, isValidSubregionLearningFrame, SUBREGION_LEARNING_FRAMES } from './subregionLearningFrames'
import { getMapSyntheticDots } from './syntheticDots'
import {
  getSvgBoundsCenter,
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

function transformBounds(bounds: SvgViewBoxRect, transform: SvgAffineTransform | null): SvgViewBoxRect {
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

function unionBounds(bounds: readonly SvgViewBoxRect[]): SvgViewBoxRect | null {
  if (bounds.length === 0) return null
  const minX = Math.min(...bounds.map(entry => entry.x))
  const minY = Math.min(...bounds.map(entry => entry.y))
  const maxX = Math.max(...bounds.map(entry => entry.x + entry.width))
  const maxY = Math.max(...bounds.map(entry => entry.y + entry.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const ORDINARY_COUNTRY_SAFE_MARGIN_RATIO = 0.08
const REPRESENTATIVE_TARGET_MARGIN_RATIO = 0.05
type TestSubregionId = Parameters<typeof getSubregionLearningFrame>[0]

function isInsideSafeArea(countryBounds: SvgViewBoxRect, frameBounds: SvgViewBoxRect, marginRatio: number) {
  const margin = Math.min(frameBounds.width, frameBounds.height) * marginRatio
  return countryBounds.x >= frameBounds.x + margin
    && countryBounds.y >= frameBounds.y + margin
    && countryBounds.x + countryBounds.width <= frameBounds.x + frameBounds.width - margin
    && countryBounds.y + countryBounds.height <= frameBounds.y + frameBounds.height - margin
}

function isPointInsideSafeArea(point: { x: number; y: number }, frameBounds: SvgViewBoxRect, marginRatio: number) {
  return isInsideSafeArea({ x: point.x, y: point.y, width: 0, height: 0 }, frameBounds, marginRatio)
}

function countrySourceBounds(mapId: string, countryId: string, visibleSource?: SvgViewBoxRect | null) {
  const markup = sourceSvgs.get(mapId)
  const country = countries.find(entry => entry.id === countryId)
  if (!markup || !country) return null
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const pathId = countryToSvgIds(country).find(candidate => document.getElementById(candidate))
  const path = pathId ? document.getElementById(pathId) : null
  const pathData = path?.getAttribute('d')
  if (!path || path.localName.toLowerCase() !== 'path' || !pathData) return null
  const transform = readSvgElementTransform(path as unknown as SVGGraphicsElement)
  const components = readSvgPathGeometryComponents(pathData)
    .map(component => transformBounds(component.bounds, transform))
    .filter(bounds => !visibleSource || (
      bounds.x < visibleSource.x + visibleSource.width
      && bounds.x + bounds.width > visibleSource.x
      && bounds.y < visibleSource.y + visibleSource.height
      && bounds.y + bounds.height > visibleSource.y
    ))
  return unionBounds(components)
}

function getEffectiveFrameBounds(subregionId: TestSubregionId) {
  const frame = getSubregionLearningFrame(subregionId)
  const source = frame ? sourceBounds(frame.mapDefinitionId) : null
  return {
    frame,
    source,
    cameraBounds: frame && source
      ? fitViewBoxToAspect(frame.bounds, source.width / source.height)
      : null,
  }
}

function isOrdinaryGeometryCountry(mapId: string, countryId: string) {
  return getMapLearningAnchors(mapId, [countryId]).length === 0
    && getMapSyntheticDots(mapId, [countryId]).length === 0
}

function expectCountryInsideSafeArea(subregionId: Parameters<typeof getSubregionLearningFrame>[0], countryId: string, countryName: string) {
  const { frame, source, cameraBounds } = getEffectiveFrameBounds(subregionId)
  const countryBounds = frame ? countrySourceBounds(frame.mapDefinitionId, countryId) : null

  expect(countryBounds, `${countryName} geometry should resolve from the authoritative SVG`).not.toBeNull()
  expect(cameraBounds).not.toBeNull()
  expect(isInsideSafeArea(countryBounds!, cameraBounds!, ORDINARY_COUNTRY_SAFE_MARGIN_RATIO)).toBe(true)
}

const ordinaryCompactCountrySafeAreaCases = (['central-europe', 'balkans'] as const).flatMap(subregionId => {
  const mapId = getMemoMapDefinition('Europe').id
  return countries
    .filter(country => country.subregionId === subregionId)
    .filter(country => isOrdinaryGeometryCountry(mapId, country.id))
    .map(country => [subregionId, country.id, country.country] as const)
})

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

  it.each(ordinaryCompactCountrySafeAreaCases)('%s keeps %s inside the ordinary-Country safe area', (subregionId, countryId, countryName) => {
    expectCountryInsideSafeArea(subregionId, countryId, countryName)
  })

  it.each([
    ['eastern-europe', 'RO', 'Romania'],
    ['eastern-europe', 'MD', 'Moldova'],
    ['eastern-europe', 'UA', 'Ukraine'],
    ['eastern-europe', 'BY', 'Belarus'],
  ] as const)('%s keeps %s inside the ordinary-Country safe area', (subregionId, countryId, countryName) => {
    expectCountryInsideSafeArea(subregionId, countryId, countryName)
  })

  it.each([
    ['australia-new-zealand', [
      ['AU', 'Australia', 'geometry'],
      ['NZ', 'New Zealand', 'geometry'],
    ]],
    ['melanesia', [
      ['PG', 'Papua New Guinea', 'geometry'],
      ['SB', 'Solomon Islands', 'synthetic dot'],
      ['VU', 'Vanuatu', 'synthetic dot'],
    ]],
    ['micronesia', [
      ['FM', 'Micronesia', 'learning anchor'],
      ['PW', 'Palau', 'geometry'],
    ]],
    ['polynesia', [
      ['WS', 'Samoa', 'synthetic dot'],
      ['TO', 'Tonga', 'geometry'],
      ['TV', 'Tuvalu', 'geometry'],
    ]],
  ] as const)('keeps %s representative targets in the effective learning frame', (subregionId, targets) => {
    const { frame, source, cameraBounds } = getEffectiveFrameBounds(subregionId)
    expect(frame && source && isValidSubregionLearningFrame(frame, source)).toBe(true)
    expect(cameraBounds).not.toBeNull()

    for (const [countryId, countryName, representation] of targets) {
      const anchors = getMapLearningAnchors('oceania', [countryId])
      const syntheticDots = getMapSyntheticDots('oceania', [countryId])

      if (representation === 'geometry') {
        expect(anchors, `${countryName} should use ordinary geometry in this regression`).toHaveLength(0)
        expect(syntheticDots, `${countryName} should use ordinary geometry in this regression`).toHaveLength(0)
        const geometry = frame ? countrySourceBounds(frame.mapDefinitionId, countryId, source) : null
        expect(geometry, `${countryName} geometry should resolve from the authoritative SVG`).not.toBeNull()
        expect(isInsideSafeArea(geometry!, cameraBounds!, 0), `${countryName} geometry should remain in view`).toBe(true)
        const geometryCenter = getSvgBoundsCenter(geometry!)
        expect(geometryCenter, `${countryName} geometry should have a representative center`).not.toBeNull()
        expect(isPointInsideSafeArea(geometryCenter!, cameraBounds!, REPRESENTATIVE_TARGET_MARGIN_RATIO)).toBe(true)
      } else {
        let points: readonly { x: number; y: number }[]
        if (representation === 'learning anchor') {
          expect(anchors, `${countryName} should use its learning anchor metadata`).toHaveLength(1)
          points = anchors.flatMap(anchor => anchor.point ? [anchor.point] : [])
        } else {
          expect(syntheticDots, `${countryName} should use its synthetic-dot metadata`).toHaveLength(1)
          points = syntheticDots.map(dot => dot.point)
        }
        expect(points).toHaveLength(1)
        expect(isPointInsideSafeArea(points[0]!, cameraBounds!, REPRESENTATIVE_TARGET_MARGIN_RATIO)).toBe(true)
      }
    }
  })

  it('does not widen Eastern Europe to fit the complete Russia geometry', () => {
    const frame = getSubregionLearningFrame('eastern-europe')
    const russiaBounds = frame ? countrySourceBounds(frame.mapDefinitionId, 'RU') : null
    expect(russiaBounds).not.toBeNull()
    expect(russiaBounds!.y < frame!.bounds.y || russiaBounds!.y + russiaBounds!.height > frame!.bounds.y + frame!.bounds.height)
      .toBe(true)
  })
})
