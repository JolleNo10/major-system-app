import { countryToSvgIds } from '@/features/world-countries/maps/countryMapIds'
import { getMapSyntheticDots } from '@/features/world-countries/maps/syntheticDots'
import type { Country } from '@/features/world-countries/data/countries'
import type {
  CapitalAuthoringCandidate,
  CapitalAuthoringDetection,
  CapitalAuthoringDetectionCandidate,
  CapitalAuthoringGeometry,
  CapitalAuthoringRepresentation,
} from './capitalAuthoringTypes'

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

interface Matrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

interface GeometryComponent {
  sourceElementId: string
  bbox: BBox
  point: Point
  area?: number
}

export interface CapitalAuthoringDotDescriptor {
  sourceElementId: string
  bbox: BBox | null
  pathData?: string
  point?: Point
  area?: number
  origin?: 'native' | 'synthetic'
}

export interface CapitalAuthoringSyntheticDot {
  x: number
  y: number
}

export interface CapitalAuthoringSvgViewBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CapitalAuthoringComponentClassification {
  geometry: CapitalAuthoringGeometry
  classification: CapitalAuthoringRepresentation
  candidates: readonly CapitalAuthoringDetectionCandidate[]
  nativeDrawableComponentCount: number
  nativeDotCandidateCount: number
  syntheticDotCandidateCount: number
}

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
const DRAWABLE_TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline'])
const TOKEN_PATTERN = /[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
const COMMAND_ARITY: Readonly<Record<string, number>> = {
  m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7,
}

function isFiniteBox(value: Partial<BBox>): value is BBox {
  const coordinates = [value.x, value.y, value.width, value.height]
  return coordinates.every(number =>
    typeof number === 'number' && Number.isFinite(number),
  ) && typeof value.width === 'number' && value.width > 0
    && typeof value.height === 'number' && value.height > 0
}

function parseViewBox(value: string | null): CapitalAuthoringSvgViewBox | null {
  const values = value?.trim().split(/[\s,]+/).map(Number) ?? []
  if (values.length !== 4 || values.some(number => !Number.isFinite(number))) return null
  const [x, y, width, height] = values
  return width > 0 && height > 0 ? { x, y, width, height } : null
}

function applyMatrix(matrix: Matrix, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

function rotateMatrix(angle: number, cx: number, cy: number): Matrix {
  const radians = angle * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return multiplyMatrices(
    multiplyMatrices({ a: 1, b: 0, c: 0, d: 1, e: cx, f: cy }, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }),
    { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy },
  )
}

function parseTransform(value: string | null): Matrix {
  if (!value?.trim()) return IDENTITY
  let result = IDENTITY
  for (const match of value.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\(([^)]+)\)/g)) {
    const numbers = match[2].split(/[\s,]+/).map(Number)
    if (numbers.some(number => !Number.isFinite(number))) continue
    const transform = match[1] === 'matrix' && numbers.length >= 6
      ? { a: numbers[0], b: numbers[1], c: numbers[2], d: numbers[3], e: numbers[4], f: numbers[5] }
      : match[1] === 'translate' && numbers.length >= 1
        ? { a: 1, b: 0, c: 0, d: 1, e: numbers[0], f: numbers[1] ?? 0 }
        : match[1] === 'scale' && numbers.length >= 1
          ? { a: numbers[0], b: 0, c: 0, d: numbers.length > 1 ? numbers[1] : numbers[0], e: 0, f: 0 }
          : match[1] === 'rotate' && numbers.length >= 1
            ? rotateMatrix(numbers[0], numbers[1] ?? 0, numbers[2] ?? 0)
            : match[1] === 'skewX' && numbers.length >= 1
              ? { a: 1, b: 0, c: Math.tan(numbers[0] * Math.PI / 180), d: 1, e: 0, f: 0 }
              : match[1] === 'skewY' && numbers.length >= 1
                ? { a: 1, b: Math.tan(numbers[0] * Math.PI / 180), c: 0, d: 1, e: 0, f: 0 }
                : null
    if (transform) result = multiplyMatrices(result, transform)
  }
  return result
}

function invertMatrix(matrix: Matrix): Matrix | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c
  if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) return null
  return {
    a: matrix.d / determinant,
    b: -matrix.b / determinant,
    c: -matrix.c / determinant,
    d: matrix.a / determinant,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  }
}

function rootSpaceMatrix(element: SVGGraphicsElement, root: SVGSVGElement): Matrix {
  try {
    const elementScreen = element.getScreenCTM?.()
    const rootScreen = root.getScreenCTM?.()
    if (elementScreen && rootScreen) {
      const rootInverse = invertMatrix({
        a: rootScreen.a,
        b: rootScreen.b,
        c: rootScreen.c,
        d: rootScreen.d,
        e: rootScreen.e,
        f: rootScreen.f,
      })
      if (rootInverse) {
        return multiplyMatrices(rootInverse, {
          a: elementScreen.a,
          b: elementScreen.b,
          c: elementScreen.c,
          d: elementScreen.d,
          e: elementScreen.e,
          f: elementScreen.f,
        })
      }
    }
  } catch {
    // Test DOMs and detached SVGs commonly do not expose screen CTMs.
  }

  const ancestors: SVGElement[] = []
  let current: Element | null = element
  while (current && current !== root) {
    if (current instanceof SVGElement) ancestors.push(current)
    current = current.parentElement
  }
  let result = IDENTITY
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    result = multiplyMatrices(result, parseTransform(ancestors[index].getAttribute('transform')))
  }
  return result
}

function transformBox(box: BBox, matrix: Matrix): BBox {
  const points = [
    applyMatrix(matrix, { x: box.x, y: box.y }),
    applyMatrix(matrix, { x: box.x + box.width, y: box.y }),
    applyMatrix(matrix, { x: box.x, y: box.y + box.height }),
    applyMatrix(matrix, { x: box.x + box.width, y: box.y + box.height }),
  ]
  const minX = Math.min(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y))
  const maxX = Math.max(...points.map(point => point.x))
  const maxY = Math.max(...points.map(point => point.y))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function mergeBox(box: BBox | null, point: Point): BBox {
  if (!box) return { x: point.x, y: point.y, width: 0, height: 0 }
  const minX = Math.min(box.x, point.x)
  const minY = Math.min(box.y, point.y)
  const maxX = Math.max(box.x + box.width, point.x)
  const maxY = Math.max(box.y + box.height, point.y)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function areaOfPoints(points: readonly Point[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return Math.abs(area) / 2
}

interface MutablePathComponent {
  bbox: BBox | null
  points: Point[]
  start: Point | null
  current: Point
  hasDrawing: boolean
  circleCenter: Point | null
  circleArea: number | null
}

function createPathComponent(start?: Point): MutablePathComponent {
  return {
    bbox: start ? { x: start.x, y: start.y, width: 0, height: 0 } : null,
    points: start ? [start] : [],
    start: start ?? null,
    current: start ?? { x: 0, y: 0 },
    hasDrawing: false,
    circleCenter: null,
    circleArea: null,
  }
}

function addComponentPoint(component: MutablePathComponent, point: Point): void {
  component.points.push(point)
  component.bbox = mergeBox(component.bbox, point)
}

function finishPathComponent(component: MutablePathComponent | null): GeometryComponent | null {
  if (!component?.hasDrawing || !component.bbox || component.bbox.width <= 0 || component.bbox.height <= 0) return null
  const bbox = component.bbox
  return {
    sourceElementId: '',
    bbox,
    point: component.circleCenter ?? { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
    area: component.circleArea ?? areaOfPoints(component.points),
  }
}

function parsePathComponents(pathData: string): GeometryComponent[] {
  const tokens = pathData.match(TOKEN_PATTERN) ?? []
  const components: GeometryComponent[] = []
  let component: MutablePathComponent | null = null
  let command: string | null = null
  let tokenIndex = 0

  const finish = () => {
    const finished = finishPathComponent(component)
    if (finished) components.push(finished)
    component = null
  }
  const ensureComponent = (point?: Point) => {
    if (!component) component = createPathComponent(point)
    return component
  }
  const isCommand = (token: string): boolean => /^[a-zA-Z]$/.test(token)
  const readNumbers = (count: number): number[] | null => {
    if (tokenIndex + count > tokens.length) return null
    const numbers = tokens.slice(tokenIndex, tokenIndex + count)
    if (numbers.some(isCommand)) return null
    tokenIndex += count
    return numbers.map(Number)
  }

  while (tokenIndex < tokens.length) {
    if (isCommand(tokens[tokenIndex])) {
      command = tokens[tokenIndex++]
      if (command.toLowerCase() === 'z') {
        if (component?.start) {
          addComponentPoint(component, component.start)
          component.hasDrawing = true
          component.current = component.start
        }
        command = null
      }
    }
    if (!command) continue

    const arity = COMMAND_ARITY[command.toLowerCase()]
    if (!arity) {
      command = null
      continue
    }
    const values = readNumbers(arity)
    if (!values) {
      command = null
      continue
    }

    const relative = command === command.toLowerCase()
    const previous = component?.current ?? { x: 0, y: 0 }
    const point = (x: number, y: number): Point => relative ? { x: previous.x + x, y: previous.y + y } : { x, y }
    const lower = command.toLowerCase()

    if (lower === 'm') {
      const next = point(values[0], values[1])
      if (command === 'm' && component && !component.hasDrawing && component.start) {
        component.circleCenter = component.start
        component.current = next
      } else {
        finish()
        component = createPathComponent(next)
      }
      command = relative ? 'l' : 'L'
      continue
    }

    const currentComponent = ensureComponent(previous)
    if (lower === 'l' || lower === 't') {
      const next = point(values[0], values[1])
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
    } else if (lower === 'h') {
      const next = { x: relative ? previous.x + values[0] : values[0], y: previous.y }
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
    } else if (lower === 'v') {
      const next = { x: previous.x, y: relative ? previous.y + values[0] : values[0] }
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
    } else if (lower === 'c') {
      const controls = [point(values[0], values[1]), point(values[2], values[3])]
      const next = point(values[4], values[5])
      controls.forEach(control => addComponentPoint(currentComponent, control))
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
    } else if (lower === 's' || lower === 'q') {
      const controls = [point(values[0], values[1])]
      const next = point(values[2], values[3])
      controls.forEach(control => addComponentPoint(currentComponent, control))
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
    } else if (lower === 'a') {
      const [rx, ry, , , , dx, dy] = values
      const next = point(dx, dy)
      if (!currentComponent.circleCenter && currentComponent.points.length === 1 && currentComponent.start) {
        currentComponent.circleCenter = currentComponent.start
      }
      if (currentComponent.circleCenter) {
        currentComponent.circleArea = Math.PI * Math.abs(rx * ry)
        addComponentPoint(currentComponent, { x: currentComponent.circleCenter.x - Math.abs(rx), y: currentComponent.circleCenter.y - Math.abs(ry) })
        addComponentPoint(currentComponent, { x: currentComponent.circleCenter.x + Math.abs(rx), y: currentComponent.circleCenter.y + Math.abs(ry) })
      } else {
        addComponentPoint(currentComponent, { x: previous.x - Math.abs(rx), y: previous.y - Math.abs(ry) })
        addComponentPoint(currentComponent, { x: previous.x + Math.abs(rx), y: previous.y + Math.abs(ry) })
      }
      addComponentPoint(currentComponent, next)
      currentComponent.current = next
      currentComponent.hasDrawing = true
    }
    currentComponent.hasDrawing = true
  }

  finish()
  return components
}

function readElementBBox(element: SVGGraphicsElement): BBox | null {
  try {
    const box = element.getBBox?.()
    if (box && isFiniteBox(box)) return box
  } catch {
    // Fall back to attribute geometry in test DOMs and detached SVGs.
  }
  const tag = element.localName.toLowerCase()
  const number = (attribute: string, fallback = 0) => Number(element.getAttribute(attribute) ?? fallback)
  if (tag === 'circle') {
    const cx = number('cx')
    const cy = number('cy')
    const r = Math.abs(number('r'))
    return r > 0 ? { x: cx - r, y: cy - r, width: r * 2, height: r * 2 } : null
  }
  if (tag === 'ellipse') {
    const cx = number('cx')
    const cy = number('cy')
    const rx = Math.abs(number('rx'))
    const ry = Math.abs(number('ry'))
    return rx > 0 && ry > 0 ? { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 } : null
  }
  if (tag === 'rect') {
    const x = number('x')
    const y = number('y')
    const width = Math.abs(number('width'))
    const height = Math.abs(number('height'))
    return width > 0 && height > 0 ? { x, y, width, height } : null
  }
  const points = (element.getAttribute('points') ?? '').match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? []
  if (['polygon', 'polyline'].includes(tag) && points.length >= 4) {
    const xValues = points.filter((_, index) => index % 2 === 0)
    const yValues = points.filter((_, index) => index % 2 === 1)
    const minX = Math.min(...xValues)
    const minY = Math.min(...yValues)
    const maxX = Math.max(...xValues)
    const maxY = Math.max(...yValues)
    return maxX > minX && maxY > minY ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null
  }
  const pathData = element.getAttribute('d') ?? ''
  const parsed = pathData ? parsePathComponents(pathData) : []
  if (parsed.length) {
    return parsed.reduce<BBox | null>((box, component) => {
      if (!box) return component.bbox
      const minX = Math.min(box.x, component.bbox.x)
      const minY = Math.min(box.y, component.bbox.y)
      const maxX = Math.max(box.x + box.width, component.bbox.x + component.bbox.width)
      const maxY = Math.max(box.y + box.height, component.bbox.y + component.bbox.height)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }, null)
  }
  return null
}

function primitiveComponent(element: SVGGraphicsElement): GeometryComponent | null {
  const bbox = readElementBBox(element)
  if (!bbox) return null
  const tag = element.localName.toLowerCase()
  const number = (attribute: string, fallback = 0) => Number(element.getAttribute(attribute) ?? fallback)
  const point = ['circle', 'ellipse'].includes(tag)
    ? { x: number('cx'), y: number('cy') }
    : { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }
  const area = tag === 'circle'
    ? Math.PI * Math.abs(number('r')) ** 2
    : tag === 'ellipse'
      ? Math.PI * Math.abs(number('rx')) * Math.abs(number('ry'))
      : tag === 'rect'
        ? bbox.width * bbox.height
        : undefined
  return { sourceElementId: element.id, bbox, point, area }
}

function elementComponents(element: SVGGraphicsElement): GeometryComponent[] {
  if (element.localName.toLowerCase() === 'path') {
    const parsed = parsePathComponents(element.getAttribute('d') ?? '')
    if (parsed.length) {
      if (parsed.length === 1) {
        const measured = readElementBBox(element)
        if (measured) return [{ ...parsed[0], sourceElementId: element.id, bbox: measured }]
      }
      return parsed.map(component => ({ ...component, sourceElementId: element.id }))
    }
  }
  const component = primitiveComponent(element)
  return component ? [component] : []
}

function transformedComponents(
  root: SVGSVGElement,
  elements: readonly SVGGraphicsElement[],
): GeometryComponent[] {
  return elements.flatMap(element => {
    const matrix = rootSpaceMatrix(element, root)
    return elementComponents(element).flatMap(component => {
      const bbox = transformBox(component.bbox, matrix)
      const point = applyMatrix(matrix, component.point)
      const scale = Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)
      return isFiniteBox(bbox) && Number.isFinite(point.x) && Number.isFinite(point.y)
        ? [{ ...component, bbox, point, area: component.area === undefined ? undefined : component.area * scale }]
        : []
    })
  })
}

function candidateGeometry(candidates: readonly CapitalAuthoringCandidate[]): CapitalAuthoringGeometry {
  return candidates.length === 1 ? 'single-dot' : candidates.length > 1 ? 'multi-dot' : 'normal'
}

function dotLimits(viewBox: CapitalAuthoringSvgViewBox): { maxDimension: number; maxArea: number } {
  // The limits scale with the actual map, avoiding the old fixed 12-unit
  // cutoff that failed on the larger regional assets. A minimum preserves
  // usability on the compact World view while the area cap rejects ordinary
  // country outlines that happen to be narrow.
  const maxDimension = Math.max(12, Math.min(viewBox.width, viewBox.height) * 0.02)
  const maxArea = viewBox.width * viewBox.height * 0.0004
  return { maxDimension, maxArea }
}

function isCompactComponent(component: GeometryComponent, viewBox: CapitalAuthoringSvgViewBox): boolean {
  const { maxDimension, maxArea } = dotLimits(viewBox)
  const area = component.area ?? component.bbox.width * component.bbox.height
  return Math.max(component.bbox.width, component.bbox.height) <= maxDimension
    && component.bbox.width * component.bbox.height <= maxArea
    && area > 0
}

function uniqueCandidates(candidates: readonly CapitalAuthoringDetectionCandidate[]): CapitalAuthoringDetectionCandidate[] {
  const seen = new Set<string>()
  return candidates.filter(candidate => {
    const key = `${candidate.x.toFixed(4)}:${candidate.y.toFixed(4)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((candidate, index) => ({ ...candidate, id: `candidate-${index + 1}` }))
}

function classifyNativeComponents(
  components: readonly GeometryComponent[],
  viewBox: CapitalAuthoringSvgViewBox,
): CapitalAuthoringComponentClassification {
  if (!components.length) {
    return {
      geometry: 'normal',
      classification: 'missing-or-unresolved',
      candidates: [],
      nativeDrawableComponentCount: 0,
      nativeDotCandidateCount: 0,
      syntheticDotCandidateCount: 0,
    }
  }
  const compact = components.filter(component => isCompactComponent(component, viewBox))
  const nativeCandidates = compact.length === components.length
    ? uniqueCandidates(components.map(component => ({
      id: '',
      x: component.point.x,
      y: component.point.y,
      sourceElementId: component.sourceElementId,
      origin: 'native' as const,
    })))
    : []
  const classification: CapitalAuthoringRepresentation = compact.length === components.length
    ? nativeCandidates.length === 1 ? 'native-single-dot' : 'native-multi-dot'
    : compact.length > 0 ? 'mixed-or-ambiguous' : 'normal'
  return {
    geometry: candidateGeometry(nativeCandidates),
    classification,
    candidates: nativeCandidates,
    nativeDrawableComponentCount: components.length,
    nativeDotCandidateCount: nativeCandidates.length,
    syntheticDotCandidateCount: 0,
  }
}

function applySyntheticPrecedence(
  native: CapitalAuthoringComponentClassification,
  syntheticDots: readonly CapitalAuthoringSyntheticDot[],
  mapId: string,
  countryId: string,
): CapitalAuthoringComponentClassification {
  if (native.classification === 'native-single-dot' || native.classification === 'native-multi-dot') {
    return { ...native, syntheticDotCandidateCount: syntheticDots.length }
  }
  if (syntheticDots.length === 0) return native
  const candidates = uniqueCandidates(syntheticDots.map((point, index) => ({
    id: `synthetic-candidate-${index + 1}`,
    x: point.x,
    y: point.y,
    sourceElementId: `synthetic:${mapId}:${countryId}`,
    origin: 'synthetic' as const,
  })))
  return {
    ...native,
    geometry: candidateGeometry(candidates),
    classification: candidates.length === 1 ? 'synthetic-single-dot' : 'synthetic-multi-dot',
    candidates,
    syntheticDotCandidateCount: candidates.length,
  }
}

function getCapitalAuthoringSyntheticDots(mapId: string, countryId: string): readonly CapitalAuthoringSyntheticDot[] {
  return getMapSyntheticDots(mapId, [countryId as Country['id']]).map(({ point }) => point)
}

function matchingCountryElements(root: SVGSVGElement, country: Country): SVGGraphicsElement[] {
  const candidateIds = new Set(countryToSvgIds(country))
  return [...root.querySelectorAll<SVGGraphicsElement>('[id]')]
    .filter(element => candidateIds.has(element.id))
}

function drawableDescendants(element: SVGGraphicsElement): SVGGraphicsElement[] {
  const descendants = element.localName.toLowerCase() !== 'g' && DRAWABLE_TAGS.has(element.localName.toLowerCase())
    ? [element]
    : []
  descendants.push(...[...element.querySelectorAll<SVGGraphicsElement>('path,circle,ellipse,rect,polygon,polyline')])
  return descendants
}

/**
 * Detect actual country representation geometry in final root SVG space.
 * Synthetic points are optional map metadata and are only used when native
 * geometry is not a reliable single/multiple-dot representation.
 */
export function detectCapitalDotCandidates(
  root: SVGSVGElement,
  country: Country,
  mapId?: string,
  referenceViewBox?: CapitalAuthoringSvgViewBox,
): CapitalAuthoringDetection {
  const viewBox = referenceViewBox ?? parseViewBox(root.getAttribute('viewBox'))
  const elements = matchingCountryElements(root, country)
  const mappedSvgIds = elements.map(element => element.id)
  if (!viewBox) {
    return {
      geometry: 'normal',
      classification: 'missing-or-unresolved',
      candidates: [],
      mappedSvgIds,
      nativeDrawableComponentCount: 0,
      nativeDotCandidateCount: 0,
      syntheticDotCandidateCount: 0,
      problem: 'unmeasurable-geometry',
    }
  }
  if (!elements.length) {
    const native = classifyNativeComponents([], viewBox)
    const result = applySyntheticPrecedence(native, mapId ? getCapitalAuthoringSyntheticDots(mapId, country.id) : [], mapId ?? 'unknown', country.id)
    return { ...result, mappedSvgIds, problem: 'missing-geometry' }
  }

  const drawable = [...new Set(elements.flatMap(drawableDescendants))]
  const components = transformedComponents(root, drawable)
  const native = classifyNativeComponents(components, viewBox)
  const result = applySyntheticPrecedence(native, mapId ? getCapitalAuthoringSyntheticDots(mapId, country.id) : [], mapId ?? 'unknown', country.id)
  return {
    ...result,
    mappedSvgIds,
    ...(components.length ? {} : { problem: 'unmeasurable-geometry' as const }),
  }
}

/** Pure descriptor seam used by geometry and synthetic-dot tests. */
export function classifyCapitalAuthoringComponents(
  descriptors: readonly CapitalAuthoringDotDescriptor[],
  viewBox: CapitalAuthoringSvgViewBox = { x: 0, y: 0, width: 1000, height: 1000 },
  syntheticDots: readonly CapitalAuthoringSyntheticDot[] = [],
  mapId = 'test',
  countryId = 'test',
): CapitalAuthoringComponentClassification {
  const components = descriptors.flatMap(descriptor => {
    if (!descriptor.bbox) return []
    if (descriptor.pathData) {
      const parsed = parsePathComponents(descriptor.pathData)
      if (parsed.length) return parsed.map(component => ({
        ...component,
        sourceElementId: descriptor.sourceElementId,
        point: descriptor.point ?? component.point,
        area: descriptor.area ?? component.area,
      }))
    }
    return [{
      sourceElementId: descriptor.sourceElementId,
      bbox: descriptor.bbox,
      point: descriptor.point ?? { x: descriptor.bbox.x + descriptor.bbox.width / 2, y: descriptor.bbox.y + descriptor.bbox.height / 2 },
      area: descriptor.area,
    }]
  })
  return applySyntheticPrecedence(classifyNativeComponents(components, viewBox), syntheticDots, mapId, countryId)
}

/** Backward-compatible pure seam for the existing persisted-vocabulary tests. */
export function classifyCapitalDotDescriptors(
  descriptors: readonly CapitalAuthoringDotDescriptor[],
): Pick<CapitalAuthoringDetection, 'geometry' | 'candidates'> {
  const result = classifyCapitalAuthoringComponents(descriptors)
  return {
    geometry: result.geometry,
    candidates: result.candidates.map(({ origin: _origin, ...candidate }) => candidate),
  }
}
