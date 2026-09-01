import { describe, expect, it } from 'vitest'
import {
  calculateRenderedSvgScale,
  countDrawnPathComponents,
  IDENTITY_TRANSFORM,
  invertTransform,
  isCompactUnambiguousSvgGeometry,
  isSvgPointWithinViewBox,
  multiplyTransforms,
  parseSvgTransform,
  projectClientPointToSvg,
  projectSvgPointToClient,
  readPathComponents,
  transformPoint,
} from './svgGeometry'

describe('SVG geometry utilities', () => {
  it('transforms and inverts points without controller state', () => {
    const transform = multiplyTransforms(
      { ...IDENTITY_TRANSFORM, e: 10, f: 5 },
      { ...IDENTITY_TRANSFORM, a: 2, d: 3 },
    )
    const point = transformPoint(transform, { x: 4, y: 2 })
    const inverse = invertTransform(transform)

    expect(point).toEqual({ x: 18, y: 11 })
    const recovered = inverse && transformPoint(inverse, point)
    expect(recovered?.x).toBeCloseTo(4)
    expect(recovered?.y).toBeCloseTo(2)
    expect(invertTransform({ ...IDENTITY_TRANSFORM, a: 0, d: 0 })).toBeNull()
  })

  it('parses supported SVG transforms in source order and ignores invalid fragments', () => {
    expect(parseSvgTransform('translate(10, 5) scale(2)')).toEqual({
      a: 2, b: 0, c: 0, d: 2, e: 10, f: 5,
    })
    expect(parseSvgTransform('rotate(20deg)')).toBeNull()
    expect(parseSvgTransform('translate(nope) scale(2)')).toEqual({
      a: 2, b: 0, c: 0, d: 2, e: 0, f: 0,
    })
  })

  it('counts drawn components and reads only compact arc components', () => {
    const pathData = 'M 10 10 m 2 2 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 L 45 25'
    expect(countDrawnPathComponents(pathData)).toBe(2)
    expect(isCompactUnambiguousSvgGeometry('M 10 10', { x: 10, y: 10, width: 2, height: 2 })).toBe(true)
    expect(isCompactUnambiguousSvgGeometry(pathData, { x: 9, y: 9, width: 33, height: 13 })).toBe(false)
    expect(readPathComponents(pathData)).toEqual([
      { start: { x: 10, y: 10 }, commands: ['m', 'a', 'a'] },
    ])
  })

  it('projects points through a letterboxed viewBox and inverts them', () => {
    const viewBox = { x: -10, y: 5, width: 100, height: 50 }
    const rect = { left: 10, top: 20, width: 300, height: 200 }
    const point = { x: 15, y: 15 }

    expect(projectSvgPointToClient(point, viewBox, rect, null)).toEqual({ x: 85, y: 75 })
    expect(projectClientPointToSvg({ x: 85, y: 75 }, viewBox, rect, null)).toEqual(point)
    expect(projectClientPointToSvg({ x: 20, y: 21 }, viewBox, rect, null)).toBeNull()
  })

  it('uses independent scales for preserveAspectRatio none', () => {
    const viewBox = { x: -10, y: 5, width: 100, height: 50 }
    const rect = { left: 10, top: 20, width: 300, height: 200 }
    const point = { x: 15, y: 15 }

    expect(projectSvgPointToClient(point, viewBox, rect, 'none')).toEqual({ x: 85, y: 60 })
    expect(projectClientPointToSvg({ x: 85, y: 60 }, viewBox, rect, 'none')).toEqual(point)
  })

  it('calculates CTM and rendered-rectangle scales, with safe unavailable fallbacks', () => {
    const viewBox = { x: 0, y: 0, width: 100, height: 50 }
    const rect = { left: 0, top: 0, width: 300, height: 200 }

    expect(calculateRenderedSvgScale({ a: 2, b: 0, c: 0, d: 3, e: 0, f: 0 }, viewBox, rect, null))
      .toEqual({ x: 2, y: 3 })
    expect(calculateRenderedSvgScale(null, viewBox, rect, null)).toEqual({ x: 3, y: 3 })
    expect(calculateRenderedSvgScale(null, viewBox, rect, 'none')).toEqual({ x: 3, y: 4 })
    expect(calculateRenderedSvgScale({ ...IDENTITY_TRANSFORM, a: 0, d: 0 }, viewBox, rect, null))
      .toEqual({ x: 3, y: 3 })
    expect(calculateRenderedSvgScale(null, null, null, null)).toEqual({ x: 1, y: 1 })
  })

  it('returns null for invalid projection inputs', () => {
    const rect = { left: 0, top: 0, width: 100, height: 50 }
    expect(projectSvgPointToClient({ x: 1, y: 1 }, null, rect, null)).toBeNull()
    expect(projectClientPointToSvg({ x: 1, y: 1 }, { x: 0, y: 0, width: 0, height: 50 }, rect, null)).toBeNull()
    expect(isSvgPointWithinViewBox({ x: 50, y: 25 }, { x: 0, y: 0, width: 100, height: 50 })).toBe(true)
    expect(isSvgPointWithinViewBox({ x: 101, y: 25 }, { x: 0, y: 0, width: 100, height: 50 })).toBe(false)
    expect(isSvgPointWithinViewBox({ x: Number.NaN, y: 25 }, { x: 0, y: 0, width: 100, height: 50 })).toBe(false)
  })
})
