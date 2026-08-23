import { countryToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import type { Country } from '@/features/world-countries/data/countries'
import type {
  CapitalAuthoringCandidate,
  CapitalAuthoringDetection,
} from './capitalAuthoringTypes'

const COMPACT_DOT_MAX_DIMENSION = 12
const COMPACT_DOT_MAX_AREA = COMPACT_DOT_MAX_DIMENSION ** 2

interface Point {
  x: number
  y: number
}

interface BBox {
  x: number
  y: number
  width: number
  height: number
}

function isFiniteBox(value: Partial<BBox>): value is BBox {
  return [value.x, value.y, value.width, value.height].every(number => typeof number === 'number' && Number.isFinite(number))
    && value.width > 0
    && value.height > 0
}

function parseMovePoints(pathData: string): Point[] {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  const points: Point[] = []
  let command: string | null = null
  let numbers: number[] = []
  let lastPoint: Point = { x: 0, y: 0 }
  let hasDrawingSinceMove = false
  let previousCommandWasAbsoluteMove = false
  let relativeMoveIsCircleOffset = false

  const flush = () => {
    if (!command || !['m', 'M'].includes(command) || numbers.length < 2) {
      numbers = []
      return
    }

    const isRelative = command === 'm'
    const firstPoint = isRelative
      ? { x: lastPoint.x + numbers[0], y: lastPoint.y + numbers[1] }
      : { x: numbers[0], y: numbers[1] }

    // MapChart's circle paths use `M center m -radius 0 a ...`; the
    // relative move is the circle's edge, not another candidate. A relative
    // move after drawing has started does begin a new subpath.
    if (!isRelative || !relativeMoveIsCircleOffset) points.push(firstPoint)
    lastPoint = firstPoint

    // Extra coordinate pairs after the first moveto pair are implicit line
    // commands, not additional move candidates.
    for (let index = 2; index + 1 < numbers.length; index += 2) {
      lastPoint = isRelative
        ? { x: lastPoint.x + numbers[index], y: lastPoint.y + numbers[index + 1] }
        : { x: numbers[index], y: numbers[index + 1] }
    }
    numbers = []
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      flush()
      command = token
      if (token === 'M') {
        hasDrawingSinceMove = false
        previousCommandWasAbsoluteMove = true
        relativeMoveIsCircleOffset = false
      } else if (token === 'm') {
        relativeMoveIsCircleOffset = previousCommandWasAbsoluteMove && !hasDrawingSinceMove
        previousCommandWasAbsoluteMove = false
      } else {
        hasDrawingSinceMove = true
        previousCommandWasAbsoluteMove = false
      }
      continue
    }
    const number = Number(token)
    if (Number.isFinite(number)) numbers.push(number)
  }
  flush()
  return points
}

function isCircleStylePath(pathData: string): boolean {
  const commands = (pathData.match(/[a-zA-Z]/g) ?? []).map(command => command.toLowerCase())
  return commands.length > 0 && commands.every(command => ['m', 'a', 'z'].includes(command))
}

function readBBox(element: SVGGraphicsElement): BBox | null {
  try {
    const box = element.getBBox()
    return isFiniteBox(box) ? box : null
  } catch {
    return null
  }
}

function pointToRootSvg(
  element: SVGGraphicsElement,
  point: Point,
  root: SVGSVGElement,
): Point {
  try {
    const elementScreen = element.getScreenCTM?.()
    const rootScreen = root.getScreenCTM?.()
    if (elementScreen && rootScreen) {
      const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(elementScreen)
      const rootPoint = screenPoint.matrixTransform(rootScreen.inverse())
      return { x: rootPoint.x, y: rootPoint.y }
    }
  } catch {
    // The authoring editor can still use the local point in simple SVGs.
  }
  return point
}

function uniqueCandidates(candidates: CapitalAuthoringCandidate[]): CapitalAuthoringCandidate[] {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    const key = `${candidate.x.toFixed(4)}:${candidate.y.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((candidate, index) => ({ ...candidate, id: `candidate-${index + 1}` }))
}

function classifyCandidates(candidates: CapitalAuthoringCandidate[]): Pick<CapitalAuthoringDetection, 'geometry' | 'candidates'> {
  const unique = uniqueCandidates(candidates)
  return { geometry: unique.length === 1 ? 'single-dot' : unique.length > 1 ? 'multi-dot' : 'normal', candidates: unique }
}

/**
 * Best-effort classification for authoring assistance. The returned geometry
 * is never authoritative: the editor always retains a manual-point escape.
 */
export function detectCapitalDotCandidates(
  root: SVGSVGElement,
  country: Country,
): CapitalAuthoringDetection {
  const candidateIds = countryToSvgIds(country)
  const candidateIdSet = new Set(candidateIds)
  const elements = [...root.querySelectorAll<SVGGraphicsElement>('[id]')]
    .filter(element => candidateIdSet.has(element.id))
  const mappedSvgIds = elements.map(element => element.id)
  if (!elements.length) {
    return { geometry: 'normal', candidates: [], mappedSvgIds, problem: 'missing-geometry' }
  }

  const candidates: CapitalAuthoringCandidate[] = []
  let measurable = false
  for (const element of elements) {
    const box = readBBox(element)
    if (!box) continue
    measurable = true
    const pathData = element.getAttribute('d') ?? ''
    const movePoints = isCircleStylePath(pathData) ? parseMovePoints(pathData) : []
    if (movePoints.length > 1) {
      for (const point of movePoints) {
        const rootPoint = pointToRootSvg(element, point, root)
        candidates.push({ id: '', x: rootPoint.x, y: rootPoint.y, sourceElementId: element.id })
      }
      continue
    }
    const isCompact = box.width <= COMPACT_DOT_MAX_DIMENSION
      && box.height <= COMPACT_DOT_MAX_DIMENSION
      && box.width * box.height <= COMPACT_DOT_MAX_AREA
    if (isCompact) {
      const rootPoint = pointToRootSvg(element, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, root)
      candidates.push({ id: '', x: rootPoint.x, y: rootPoint.y, sourceElementId: element.id })
    }
  }

  const classified = classifyCandidates(candidates)
  return {
    ...classified,
    mappedSvgIds,
    ...(measurable ? {} : { problem: 'unmeasurable-geometry' }),
  }
}

/** Pure descriptor seam used to test classification without browser SVG layout. */
export interface CapitalAuthoringDotDescriptor {
  sourceElementId: string
  bbox: BBox | null
  pathData?: string
  point?: Point
}

export function classifyCapitalDotDescriptors(
  descriptors: readonly CapitalAuthoringDotDescriptor[],
): Pick<CapitalAuthoringDetection, 'geometry' | 'candidates'> {
  const candidates: CapitalAuthoringCandidate[] = []
  for (const descriptor of descriptors) {
    const box = descriptor.bbox
    const moves = descriptor.pathData && isCircleStylePath(descriptor.pathData)
      ? parseMovePoints(descriptor.pathData)
      : []
    if (moves.length > 1) {
      candidates.push(...moves.map(point => ({ id: '', ...point, sourceElementId: descriptor.sourceElementId })))
      continue
    }
    if (descriptor.point) candidates.push({ id: '', ...descriptor.point, sourceElementId: descriptor.sourceElementId })
    else if (box && box.width <= COMPACT_DOT_MAX_DIMENSION && box.height <= COMPACT_DOT_MAX_DIMENSION && box.width * box.height <= COMPACT_DOT_MAX_AREA) {
      candidates.push({ id: '', x: box.x + box.width / 2, y: box.y + box.height / 2, sourceElementId: descriptor.sourceElementId })
    }
  }
  return classifyCandidates(candidates)
}
