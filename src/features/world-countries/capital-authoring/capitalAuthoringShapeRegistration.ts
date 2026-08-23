import type { Country } from '@/features/world-countries/data/countries'
import { countryToSvgIds } from '@/features/world-countries/maps/countryMapIds'

export type CapitalAuthoringSvgPoint = Readonly<{ x: number; y: number }>
export type CapitalAuthoringGeographicPoint = readonly [longitude: number, latitude: number]

export interface CapitalAuthoringGeographicBoundary {
  countryId: string
  rings: readonly (readonly CapitalAuthoringGeographicPoint[])[]
}

export interface CapitalAuthoringSvgBoundary {
  rings: readonly (readonly CapitalAuthoringSvgPoint[])[]
}

export type CapitalAuthoringShapeQuality = 'high' | 'medium' | 'low' | 'not-evaluable'

export interface CapitalAuthoringShapeRegistrationResult {
  status: 'ok' | 'not-evaluable'
  quality: CapitalAuthoringShapeQuality
  estimatedCapital?: CapitalAuthoringSvgPoint
  transformedRings?: readonly (readonly CapitalAuthoringSvgPoint[])[]
  normalizedFitError?: number
  reason?: string
  reflectionRejected?: boolean
}

interface Point {
  x: number
  y: number
}

interface AffineTransform {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const MAX_BOUNDARY_POINTS = 160
const INITIAL_ROTATION_COUNT = 32
const ICP_ITERATIONS = 12

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function flattenRings(rings: readonly (readonly Point[])[]): Point[] {
  return rings.flatMap(ring => ring.filter(isFinitePoint).map(point => ({ ...point })))
}

function getBounds(points: readonly Point[]): Bounds | null {
  if (!points.length) return null
  return points.reduce<Bounds>((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxX: Math.max(bounds.maxX, point.x),
    maxY: Math.max(bounds.maxY, point.y),
  }), {
    minX: points[0].x,
    minY: points[0].y,
    maxX: points[0].x,
    maxY: points[0].y,
  })
}

function getBoundsDiagonal(points: readonly Point[]): number {
  const bounds = getBounds(points)
  return bounds ? Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) : 0
}

function getCentroid(points: readonly Point[]): Point {
  const sum = points.reduce((result, point) => ({
    x: result.x + point.x,
    y: result.y + point.y,
  }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function getGeographicOrigin(boundary: CapitalAuthoringGeographicBoundary): CapitalAuthoringGeographicPoint {
  const points = boundary.rings.flatMap(ring => {
    const first = ring[0]
    const last = ring[ring.length - 1]
    return first && last && first[0] === last[0] && first[1] === last[1]
      ? ring.slice(0, -1)
      : ring
  })
  const longitude = Math.atan2(
    points.reduce((sum, point) => sum + Math.sin(point[0] * Math.PI / 180), 0),
    points.reduce((sum, point) => sum + Math.cos(point[0] * Math.PI / 180), 0),
  ) * 180 / Math.PI
  const latitude = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return [longitude, latitude]
}

function projectGeographicPoint(
  point: CapitalAuthoringGeographicPoint,
  origin: CapitalAuthoringGeographicPoint,
): Point {
  const latitudeScale = Math.cos(origin[1] * Math.PI / 180)
  let longitudeDelta = point[0] - origin[0]
  if (longitudeDelta > 180) longitudeDelta -= 360
  if (longitudeDelta < -180) longitudeDelta += 360
  return {
    x: longitudeDelta * latitudeScale,
    y: -(point[1] - origin[1]),
  }
}

function applyTransform(transform: AffineTransform, point: Point): Point {
  return {
    x: transform.a * point.x + transform.b * point.y + transform.tx,
    y: transform.c * point.x + transform.d * point.y + transform.ty,
  }
}

function determinant(transform: AffineTransform): number {
  return transform.a * transform.d - transform.b * transform.c
}

function nearestPoint(point: Point, candidates: readonly Point[]): Point {
  return candidates.reduce((nearest, candidate) => (
    distance(point, candidate) < distance(point, nearest) ? candidate : nearest
  ), candidates[0])
}

function solveThreeByThree(matrix: number[][], values: number[]): [number, number, number] | null {
  const augmented = matrix.map((row, index) => [...row, values[index]])
  for (let column = 0; column < 3; column += 1) {
    let pivot = column
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null
    ;[augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]]
    const divisor = augmented[column][column]
    for (let value = column; value < 4; value += 1) augmented[column][value] /= divisor
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue
      const multiplier = augmented[row][column]
      for (let value = column; value < 4; value += 1) {
        augmented[row][value] -= multiplier * augmented[column][value]
      }
    }
  }
  return [augmented[0][3], augmented[1][3], augmented[2][3]]
}

function fitAffine(source: readonly Point[], target: readonly Point[]): AffineTransform | null {
  if (source.length !== target.length || source.length < 3) return null
  const matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  const xValues = [0, 0, 0]
  const yValues = [0, 0, 0]
  for (let index = 0; index < source.length; index += 1) {
    const point = source[index]
    const result = target[index]
    const row = [point.x, point.y, 1]
    for (let left = 0; left < 3; left += 1) {
      for (let right = 0; right < 3; right += 1) matrix[left][right] += row[left] * row[right]
      xValues[left] += row[left] * result.x
      yValues[left] += row[left] * result.y
    }
  }
  const x = solveThreeByThree(matrix, xValues)
  const y = solveThreeByThree(matrix, yValues)
  if (!x || !y) return null
  return { a: x[0], b: x[1], tx: x[2], c: y[0], d: y[1], ty: y[2] }
}

function getInitialTransform(source: readonly Point[], target: readonly Point[], angle: number): AffineTransform {
  const sourceCenter = getCentroid(source)
  const targetCenter = getCentroid(target)
  const sourceSize = getBoundsDiagonal(source)
  const targetSize = getBoundsDiagonal(target)
  const scale = targetSize / sourceSize
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return {
    a: scale * cosine,
    b: -scale * sine,
    c: scale * sine,
    d: scale * cosine,
    tx: targetCenter.x - scale * (cosine * sourceCenter.x - sine * sourceCenter.y),
    ty: targetCenter.y - scale * (sine * sourceCenter.x + cosine * sourceCenter.y),
  }
}

function registrationError(
  transformed: readonly Point[],
  target: readonly Point[],
): number {
  if (!transformed.length || !target.length) return Number.POSITIVE_INFINITY
  const forward = transformed.reduce((sum, point) => sum + distance(point, nearestPoint(point, target)), 0) / transformed.length
  const reverse = target.reduce((sum, point) => sum + distance(point, nearestPoint(point, transformed)), 0) / target.length
  const targetSize = getBoundsDiagonal(target)
  return targetSize > 0 ? ((forward + reverse) / 2) / targetSize : Number.POSITIVE_INFINITY
}

function runIcp(
  source: readonly Point[],
  target: readonly Point[],
  initial: AffineTransform,
  allowReflection = false,
): { transform: AffineTransform; error: number; isReflected: boolean } | null {
  let transform = initial
  for (let iteration = 0; iteration < ICP_ITERATIONS; iteration += 1) {
    const transformed = source.map(point => applyTransform(transform, point))
    const correspondences = transformed.map(point => nearestPoint(point, target))
    const nextTransform = fitAffine(source, correspondences)
    if (!nextTransform) return null
    if (!allowReflection && determinant(nextTransform) <= 0) return null
    transform = nextTransform
  }
  return {
    transform,
    error: registrationError(source.map(point => applyTransform(transform, point)), target),
    isReflected: determinant(transform) <= 0,
  }
}

function qualityForError(error: number): CapitalAuthoringShapeQuality {
  if (error <= 0.04) return 'high'
  if (error <= 0.09) return 'medium'
  if (error <= 0.18) return 'low'
  return 'not-evaluable'
}

function notEvaluable(reason: string, reflectionRejected = false): CapitalAuthoringShapeRegistrationResult {
  return { status: 'not-evaluable', quality: 'not-evaluable', reason, reflectionRejected }
}

export function registerCapitalAuthoringShape(input: {
  geographicBoundary: CapitalAuthoringGeographicBoundary
  capital: CapitalAuthoringGeographicPoint
  svgBoundary: CapitalAuthoringSvgBoundary
}): CapitalAuthoringShapeRegistrationResult {
  const geographicPoints = input.geographicBoundary.rings.flatMap(ring => ring)
  if (geographicPoints.length < 3) return notEvaluable('The geographic boundary has too few points.')
  const sourceRings = input.geographicBoundary.rings.map(ring => ring.map(point => projectGeographicPoint(point, getGeographicOrigin(input.geographicBoundary))))
  const source = flattenRings(sourceRings)
  const targetRings = input.svgBoundary.rings.map(ring => ring.map(point => ({ ...point })))
  const target = flattenRings(targetRings)
  if (source.length < 3 || target.length < 3) return notEvaluable('Both country outlines need at least three measurable points.')
  if (getBoundsDiagonal(source) <= 0 || getBoundsDiagonal(target) <= 0) return notEvaluable('The country outlines have no measurable size.')

  let best: { transform: AffineTransform; error: number } | null = null
  let bestReflected: { transform: AffineTransform; error: number } | null = null
  let reflectionRejected = false
  const directTransform = sourceRings.length === targetRings.length
    && sourceRings.every((ring, index) => ring.length === targetRings[index].length)
    ? fitAffine(source, target)
    : null
  if (directTransform) {
    const directCandidate = {
      transform: directTransform,
      error: registrationError(source.map(point => applyTransform(directTransform, point)), target),
    }
    if (determinant(directTransform) > 0) best = directCandidate
    else {
      bestReflected = directCandidate
      reflectionRejected = true
    }
  }
  for (let index = 0; index < INITIAL_ROTATION_COUNT; index += 1) {
    const initial = getInitialTransform(source, target, (index / INITIAL_ROTATION_COUNT) * Math.PI * 2)
    const unconstrained = runIcp(source, target, initial, true)
    if (unconstrained?.isReflected) {
      reflectionRejected = true
      if (!bestReflected || unconstrained.error < bestReflected.error) {
        bestReflected = { transform: unconstrained.transform, error: unconstrained.error }
      }
    }
    const registration = runIcp(source, target, initial)
    if (!registration) {
      continue
    }
    if (!best || registration.error < best.error) best = registration
  }
  if (!best) return notEvaluable('No non-reflected boundary registration could be found.', reflectionRejected)

  const origin = getGeographicOrigin(input.geographicBoundary)
  const capitalPoint = projectGeographicPoint(input.capital, origin)
  const estimatedCapital = applyTransform(best.transform, capitalPoint)
  const reflectedFitDominates = bestReflected !== null && bestReflected.error + 0.01 < best.error
  const quality = reflectedFitDominates ? 'not-evaluable' : qualityForError(best.error)
  return {
    status: 'ok',
    quality,
    estimatedCapital,
    transformedRings: sourceRings.map(ring => ring.map(point => applyTransform(best.transform, point))),
    normalizedFitError: best.error,
    reason: quality === 'high' || quality === 'medium'
      ? undefined
      : 'The registered outline differs materially from the SVG country shape.',
    reflectionRejected,
  }
}

export function getCapitalAuthoringPlacementDeviation(
  anchor: CapitalAuthoringSvgPoint,
  estimatedCapital: CapitalAuthoringSvgPoint,
  svgBoundary: CapitalAuthoringSvgBoundary,
): number | null {
  const boundaryPoints = flattenRings(svgBoundary.rings)
  const diagonal = getBoundsDiagonal(boundaryPoints)
  return diagonal > 0 ? distance(anchor, estimatedCapital) / diagonal : null
}

function samplePathElement(element: Element): Point[] {
  const geometry = element as SVGGeometryElement & { getTotalLength?: () => number; getPointAtLength?: (length: number) => DOMPoint }
  if (geometry.getTotalLength && geometry.getPointAtLength) {
    try {
      const length = geometry.getTotalLength()
      if (Number.isFinite(length) && length > 0) {
        const count = Math.min(MAX_BOUNDARY_POINTS, Math.max(24, Math.ceil(length / 12)))
        return Array.from({ length: count }, (_, index) => {
          const point = geometry.getPointAtLength((length * index) / (count - 1))
          return { x: point.x, y: point.y }
        })
      }
    } catch {
      // Fall through to the small path-data parser used by jsdom and imports.
    }
  }

  const data = element.getAttribute('d') ?? ''
  const numbers = data.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? []
  const points: Point[] = []
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] })
  }
  return points
}

function toRootPoint(element: Element, point: Point, root: SVGSVGElement): Point {
  const elementCtm = (element as SVGGraphicsElement).getCTM?.()
  const rootCtm = root.getCTM?.()
  if (elementCtm && rootCtm) {
    try {
      const inverse = rootCtm.inverse()
      const transformed = new DOMPoint(point.x, point.y).matrixTransform(elementCtm).matrixTransform(inverse)
      return { x: transformed.x, y: transformed.y }
    } catch {
      // Keep the source point when the browser cannot expose SVG matrices.
    }
  }
  return point
}

export function extractCapitalAuthoringSvgBoundary(
  root: SVGSVGElement,
  country: Country,
): CapitalAuthoringSvgBoundary | null {
  const ids = new Set(countryToSvgIds(country))
  const rings = Array.from(root.querySelectorAll<SVGGraphicsElement>('[id]'))
    .filter(element => ids.has(element.id))
    .map(element => samplePathElement(element).map(point => toRootPoint(element, point, root)))
    .filter(ring => ring.length >= 3)
  return rings.length ? { rings } : null
}
