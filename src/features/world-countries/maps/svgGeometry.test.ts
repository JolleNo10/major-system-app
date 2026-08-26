import { describe, expect, it } from 'vitest'
import {
  countDrawnPathComponents,
  IDENTITY_TRANSFORM,
  invertTransform,
  multiplyTransforms,
  parseSvgTransform,
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
    expect(readPathComponents(pathData)).toEqual([
      { start: { x: 10, y: 10 }, commands: ['m', 'a', 'a'] },
    ])
  })
})
