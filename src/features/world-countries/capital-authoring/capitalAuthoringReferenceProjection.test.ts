import { describe, expect, it } from 'vitest'
import { predictCapitalAuthoringReference } from './capitalAuthoringReferenceProjection'

const reference = {
  countryId: 'TEST',
  capital: { lat: 12, lon: 11 },
  countryReference: { lat: 10, lon: 10 },
}

const calibrations = [
  { countryId: 'A', geographic: { lat: 0, lon: 0 }, svg: { x: 100, y: 200 } },
  { countryId: 'B', geographic: { lat: 10, lon: 0 }, svg: { x: 100, y: 230 } },
  { countryId: 'C', geographic: { lat: 0, lon: 10 }, svg: { x: 120, y: 200 } },
]

describe('capital authoring reference projection', () => {
  it('uses the fitted transform for a local capital delta', () => {
    expect(predictCapitalAuthoringReference({
      reference,
      countrySvgPoint: { x: 300, y: 300 },
      countrySvgBounds: { x: 250, y: 250, width: 100, height: 100 },
      calibrations,
    })).toMatchObject({
      target: { x: 302, y: 306 },
      clue: 'central area',
      confidence: 'rough',
      calibrationCount: 3,
    })
  })

  it('returns unavailable for missing or insufficient calibration input', () => {
    expect(predictCapitalAuthoringReference({
      reference: null,
      countrySvgPoint: { x: 10, y: 10 },
      countrySvgBounds: { x: 0, y: 0, width: 20, height: 20 },
      calibrations,
    })).toBeNull()
    expect(predictCapitalAuthoringReference({
      reference,
      countrySvgPoint: { x: 10, y: 10 },
      countrySvgBounds: { x: 0, y: 0, width: 20, height: 20 },
      calibrations: calibrations.slice(0, 2),
    })).toBeNull()
  })

  it('suppresses a prediction that is implausibly far outside the Country bounds', () => {
    expect(predictCapitalAuthoringReference({
      reference: {
        ...reference,
        capital: { lat: 90, lon: 90 },
      },
      countrySvgPoint: { x: 10, y: 10 },
      countrySvgBounds: { x: 0, y: 0, width: 20, height: 20 },
      calibrations,
    })).toBeNull()
  })

  it('classifies the full 3 by 3 grid relative to the measured Country bounds', async () => {
    const { classifyCapitalAuthoringReferencePosition } = await import('./capitalAuthoringReferenceProjection')
    const bounds = { x: 0, y: 0, width: 90, height: 90 }
    expect(classifyCapitalAuthoringReferencePosition({ x: 10, y: 10 }, bounds)).toBe('north-west area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 45, y: 10 }, bounds)).toBe('north area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 80, y: 10 }, bounds)).toBe('north-east area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 10, y: 45 }, bounds)).toBe('west area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 45, y: 45 }, bounds)).toBe('central area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 80, y: 45 }, bounds)).toBe('east area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 10, y: 80 }, bounds)).toBe('south-west area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 45, y: 80 }, bounds)).toBe('south area')
    expect(classifyCapitalAuthoringReferencePosition({ x: 80, y: 80 }, bounds)).toBe('south-east area')
  })
})
