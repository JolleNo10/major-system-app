import type {
  CapitalAuthoringGeoPoint,
  CapitalAuthoringGeoReference,
} from './capitalAuthoringReferenceData'

export interface CapitalAuthoringSvgPoint {
  x: number
  y: number
}

export interface CapitalAuthoringSvgBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CapitalAuthoringReferenceCalibration {
  countryId: string
  geographic: CapitalAuthoringGeoPoint
  svg: CapitalAuthoringSvgPoint
}

export type CapitalAuthoringReferenceClue =
  | 'north-west area'
  | 'north area'
  | 'north-east area'
  | 'west area'
  | 'central area'
  | 'east area'
  | 'south-west area'
  | 'south area'
  | 'south-east area'

export interface CapitalAuthoringReferencePrediction {
  target: CapitalAuthoringSvgPoint
  clue: CapitalAuthoringReferenceClue
  confidence: 'good' | 'rough'
  calibrationCount: number
}

interface AffineAxis {
  lon: number
  lat: number
  offset: number
}

export interface CapitalAuthoringAffineTransform {
  x: AffineAxis
  y: AffineAxis
}

interface PredictionInput {
  reference: CapitalAuthoringGeoReference | null | undefined
  countrySvgPoint: CapitalAuthoringSvgPoint
  countrySvgBounds: CapitalAuthoringSvgBounds
  calibrations: readonly CapitalAuthoringReferenceCalibration[]
}

function isFinitePoint(point: CapitalAuthoringSvgPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function isFiniteGeoPoint(point: CapitalAuthoringGeoPoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon)
}

function solveThreeByThree(matrix: number[][], values: number[]): number[] | null {
  const augmented = matrix.map((row, index) => [...row, values[index]])

  for (let column = 0; column < 3; column += 1) {
    let pivotRow = column
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) pivotRow = row
    }
    const pivot = augmented[pivotRow][column]
    if (!Number.isFinite(pivot) || Math.abs(pivot) < 1e-9) return null
    if (pivotRow !== column) [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]]

    for (let row = column + 1; row < 3; row += 1) {
      const factor = augmented[row][column] / augmented[column][column]
      for (let valueColumn = column; valueColumn <= 3; valueColumn += 1) {
        augmented[row][valueColumn] -= factor * augmented[column][valueColumn]
      }
    }
  }

  const solution = Array.from({ length: 3 }, () => 0)
  for (let row = 2; row >= 0; row -= 1) {
    const remainder = augmented[row][3] - augmented[row]
      .slice(row + 1, 3)
      .reduce((sum, value, index) => sum + value * solution[row + 1 + index], 0)
    solution[row] = remainder / augmented[row][row]
  }
  return solution.every(Number.isFinite) ? solution : null
}

/** Fit an affine geographic-to-SVG transform from measurable Country pairs. */
export function fitCapitalAuthoringAffineTransform(
  calibrations: readonly CapitalAuthoringReferenceCalibration[],
): CapitalAuthoringAffineTransform | null {
  const pairs = calibrations.filter(calibration =>
    isFiniteGeoPoint(calibration.geographic) && isFinitePoint(calibration.svg))
  if (pairs.length < 3) return null

  const normal = Array.from({ length: 3 }, () => [0, 0, 0])
  const xValues = [0, 0, 0]
  const yValues = [0, 0, 0]

  for (const pair of pairs) {
    const features = [pair.geographic.lon, pair.geographic.lat, 1]
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        normal[row][column] += features[row] * features[column]
      }
      xValues[row] += features[row] * pair.svg.x
      yValues[row] += features[row] * pair.svg.y
    }
  }

  const x = solveThreeByThree(normal.map(row => [...row]), xValues)
  const y = solveThreeByThree(normal, yValues)
  if (!x || !y) return null

  return {
    x: { lon: x[0], lat: x[1], offset: x[2] },
    y: { lon: y[0], lat: y[1], offset: y[2] },
  }
}

export function classifyCapitalAuthoringReferencePosition(
  point: CapitalAuthoringSvgPoint,
  bounds: CapitalAuthoringSvgBounds,
): CapitalAuthoringReferenceClue {
  const horizontal = point.x < bounds.x + bounds.width / 3
    ? 'west'
    : point.x > bounds.x + bounds.width * 2 / 3
      ? 'east'
      : 'central'
  const vertical = point.y < bounds.y + bounds.height / 3
    ? 'north'
    : point.y > bounds.y + bounds.height * 2 / 3
      ? 'south'
      : 'central'

  if (vertical === 'central' && horizontal === 'central') return 'central area'
  if (vertical === 'central') return `${horizontal} area` as CapitalAuthoringReferenceClue
  if (horizontal === 'central') return `${vertical} area` as CapitalAuthoringReferenceClue
  return `${vertical}-${horizontal} area` as CapitalAuthoringReferenceClue
}

function isValidBounds(bounds: CapitalAuthoringSvgBounds): boolean {
  return Number.isFinite(bounds.x)
    && Number.isFinite(bounds.y)
    && Number.isFinite(bounds.width)
    && Number.isFinite(bounds.height)
    && bounds.width > 0
    && bounds.height > 0
}

/**
 * Predict a capital using a fitted transform only for the local geographic
 * delta. The Country's measured SVG point remains the prediction anchor.
 */
export function predictCapitalAuthoringReference(
  input: PredictionInput,
): CapitalAuthoringReferencePrediction | null {
  const { reference, countrySvgPoint, countrySvgBounds, calibrations } = input
  if (!reference) return null
  if (!isFiniteGeoPoint(reference.capital)
    || !isFiniteGeoPoint(reference.countryReference)
    || !isFinitePoint(countrySvgPoint)
    || !isValidBounds(countrySvgBounds)) return null

  const transform = fitCapitalAuthoringAffineTransform(calibrations)
  if (!transform) return null

  const deltaLon = reference.capital.lon - reference.countryReference.lon
  const deltaLat = reference.capital.lat - reference.countryReference.lat
  const target = {
    x: countrySvgPoint.x + transform.x.lon * deltaLon + transform.x.lat * deltaLat,
    y: countrySvgPoint.y + transform.y.lon * deltaLon + transform.y.lat * deltaLat,
  }
  if (!isFinitePoint(target)) return null

  const padding = Math.max(6, Math.max(countrySvgBounds.width, countrySvgBounds.height) * 2)
  const withinPlausibleBounds = target.x >= countrySvgBounds.x - padding
    && target.x <= countrySvgBounds.x + countrySvgBounds.width + padding
    && target.y >= countrySvgBounds.y - padding
    && target.y <= countrySvgBounds.y + countrySvgBounds.height + padding
  if (!withinPlausibleBounds) return null

  return {
    target,
    clue: classifyCapitalAuthoringReferencePosition(target, countrySvgBounds),
    confidence: calibrations.length >= 8 ? 'good' : 'rough',
    calibrationCount: calibrations.length,
  }
}
