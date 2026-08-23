import { describe, expect, it } from 'vitest'
import {
  getCapitalAuthoringPlacementDeviation,
  registerCapitalAuthoringShape,
  type CapitalAuthoringGeographicBoundary,
  type CapitalAuthoringSvgBoundary,
} from './capitalAuthoringShapeRegistration'

type Point = readonly [number, number]

const geographicBoundary: CapitalAuthoringGeographicBoundary = {
  countryId: 'TEST',
  rings: [[
    [0, 0],
    [10, 0],
    [10, 8],
    [5, 7],
    [0, 10],
    [0, 0],
  ]],
}

const capital: Point = [2, 3]

function transform(point: { x: number; y: number }) {
  return {
    x: 2 * point.x - 0.5 * point.y + 100,
    y: 0.5 * point.x + 2 * point.y + 200,
  }
}

const svgBoundary: CapitalAuthoringSvgBoundary = {
  rings: [[
    transform({ x: -5, y: 5 }),
    transform({ x: 5, y: 5 }),
    transform({ x: 5, y: -3 }),
    transform({ x: 0, y: -2 }),
    transform({ x: -5, y: -5 }),
    transform({ x: -5, y: 5 }),
  ]],
}

describe('capital authoring shape registration', () => {
  it('recovers a known positive-determinant transform and capital point', () => {
    const result = registerCapitalAuthoringShape({ geographicBoundary, capital, svgBoundary })

    expect(result.status).toBe('ok')
    expect(result.quality).toBe('high')
    expect(result.estimatedCapital?.x).toBeCloseTo(transform({ x: -3, y: 2 }).x, 1)
    expect(result.estimatedCapital?.y).toBeCloseTo(transform({ x: -3, y: 2 }).y, 1)
    expect(result.normalizedFitError).toBeLessThan(0.05)
  })

  it('reports a deliberately mismatched outline as poor rather than trustworthy', () => {
    const result = registerCapitalAuthoringShape({
      geographicBoundary,
      capital,
      svgBoundary: {
        rings: [[
          { x: 100, y: 200 },
          { x: 130, y: 200 },
          { x: 115, y: 240 },
          { x: 100, y: 200 },
        ]],
      },
    })

    expect(result.status).toBe('ok')
    expect(['low', 'not-evaluable']).toContain(result.quality)
    expect(result.normalizedFitError).toBeGreaterThan(0.1)
  })

  it('does not accept a reflected registration as a high-quality fit', () => {
    const result = registerCapitalAuthoringShape({
      geographicBoundary: {
        countryId: 'TEST',
        rings: [[
          [0, 0],
          [12, 0],
          [8, 5],
          [3, 11],
          [0, 0],
        ]],
      },
      capital: [2, 3],
      svgBoundary: {
        rings: [[
          { x: 100, y: 200 },
          { x: 76, y: 200 },
          { x: 84, y: 190 },
          { x: 94, y: 178 },
          { x: 100, y: 200 },
        ]],
      },
    })

    expect(result.quality).not.toBe('high')
    expect(result.reflectionRejected).toBe(true)
  })

  it('normalizes placement deviation by the SVG Country size', () => {
    const result = registerCapitalAuthoringShape({ geographicBoundary, capital, svgBoundary })
    if (!result.estimatedCapital) throw new Error('Expected a registered capital')

    const deviation = getCapitalAuthoringPlacementDeviation(
      { x: result.estimatedCapital.x + 10, y: result.estimatedCapital.y },
      result.estimatedCapital,
      svgBoundary,
    )

    expect(deviation).toBeCloseTo(10 / Math.hypot(24, 25), 4)
  })

  it('keeps the normalized fit error stable when both shapes change absolute size', () => {
    const scaledBoundary: CapitalAuthoringSvgBoundary = {
      rings: svgBoundary.rings.map(ring => ring.map(point => ({ x: point.x * 10, y: point.y * 10 }))),
    }
    const result = registerCapitalAuthoringShape({ geographicBoundary, capital, svgBoundary })
    const scaledResult = registerCapitalAuthoringShape({ geographicBoundary, capital, svgBoundary: scaledBoundary })

    expect(scaledResult.normalizedFitError).toBeCloseTo(result.normalizedFitError ?? 1, 3)
  })
})
