import { parseViewBox, type SvgViewBoxRect } from './viewBoxFit'

export interface SvgPoint {
  x: number
  y: number
}

export interface SvgAffineTransform {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export interface SvgClientRect {
  left: number
  top: number
  width: number
  height: number
}

export interface SvgScale {
  x: number
  y: number
}

function isValidViewBoxRect(rect: SvgViewBoxRect | null): rect is SvgViewBoxRect {
  return rect !== null
    && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0
    && rect.height > 0
}

function getSvgTransformScale(transform: SvgAffineTransform | null): SvgScale | null {
  if (!transform) return null
  const x = Math.hypot(transform.a, transform.b)
  const y = Math.hypot(transform.c, transform.d)
  return Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0 ? { x, y } : null
}

export interface TaskPathComponent {
  start: SvgPoint
  commands: string[]
}

export const IDENTITY_TRANSFORM: SvgAffineTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

export function transformPoint(matrix: SvgAffineTransform, point: SvgPoint): SvgPoint {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  }
}

export function multiplyTransforms(left: SvgAffineTransform, right: SvgAffineTransform): SvgAffineTransform {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function parseSvgTransform(value: string | null): SvgAffineTransform | null {
  if (!value?.trim()) return null
  const matches = value.matchAll(/(matrix|translate|scale)\(([^)]+)\)/g)
  let result = IDENTITY_TRANSFORM
  let found = false
  for (const match of matches) {
    const numbers = match[2].split(/[\s,]+/).map(Number)
    if (numbers.some(number => !Number.isFinite(number))) continue
    const transform = match[1] === 'matrix' && numbers.length >= 6
      ? { a: numbers[0], b: numbers[1], c: numbers[2], d: numbers[3], e: numbers[4], f: numbers[5] }
      : match[1] === 'translate' && numbers.length >= 1
        ? { a: 1, b: 0, c: 0, d: 1, e: numbers[0], f: numbers[1] ?? 0 }
        : match[1] === 'scale' && numbers.length >= 1
          ? { a: numbers[0], b: 0, c: 0, d: numbers.length > 1 ? numbers[1] : numbers[0], e: 0, f: 0 }
          : null
    if (!transform) continue
    result = multiplyTransforms(result, transform)
    found = true
  }
  return found ? result : null
}

export function invertTransform(matrix: SvgAffineTransform): SvgAffineTransform | null {
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

/** Calculate rendered SVG units per source unit, preserving the CTM fallback order. */
export function calculateRenderedSvgScale(
  screenTransform: SvgAffineTransform | null,
  viewBox: SvgViewBoxRect | null,
  rect: SvgClientRect | null,
  preserveAspectRatio: string | null,
): SvgScale {
  const transformScale = getSvgTransformScale(screenTransform)
  if (transformScale) return transformScale

  if (!isValidViewBoxRect(viewBox) || !rect
    || ![rect.width, rect.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return { x: 1, y: 1 }

  if (preserveAspectRatio?.trim().toLowerCase().startsWith('none')) {
    return {
      x: rect.width / viewBox.width,
      y: rect.height / viewBox.height,
    }
  }

  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
  return { x: scale, y: scale }
}

/** Project a source SVG point into client/screen coordinates using SVG presentation rules. */
export function projectSvgPointToClient(
  point: SvgPoint,
  viewBox: SvgViewBoxRect | null,
  rect: SvgClientRect | null,
  preserveAspectRatio: string | null,
): SvgPoint | null {
  if (!isValidViewBoxRect(viewBox) || !rect || ![point.x, point.y, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null

  if (preserveAspectRatio?.trim().toLowerCase().startsWith('none')) {
    return {
      x: rect.left + (point.x - viewBox.x) * rect.width / viewBox.width,
      y: rect.top + (point.y - viewBox.y) * rect.height / viewBox.height,
    }
  }

  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
  const offsetX = (rect.width - viewBox.width * scale) / 2
  const offsetY = (rect.height - viewBox.height * scale) / 2
  return {
    x: rect.left + offsetX + (point.x - viewBox.x) * scale,
    y: rect.top + offsetY + (point.y - viewBox.y) * scale,
  }
}

/** Invert SVG presentation mapping from client/screen coordinates to source SVG coordinates. */
export function projectClientPointToSvg(
  client: SvgPoint,
  viewBox: SvgViewBoxRect | null,
  rect: SvgClientRect | null,
  preserveAspectRatio: string | null,
): SvgPoint | null {
  if (!isValidViewBoxRect(viewBox) || !rect || ![client.x, client.y, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null

  let x = client.x - rect.left
  let y = client.y - rect.top
  if (!preserveAspectRatio?.trim().toLowerCase().startsWith('none')) {
    const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    const contentWidth = viewBox.width * scale
    const contentHeight = viewBox.height * scale
    const offsetX = (rect.width - contentWidth) / 2
    const offsetY = (rect.height - contentHeight) / 2
    if (x < offsetX || x > offsetX + contentWidth || y < offsetY || y > offsetY + contentHeight) return null
    x = (x - offsetX) / scale
    y = (y - offsetY) / scale
  } else {
    x /= rect.width / viewBox.width
    y /= rect.height / viewBox.height
  }
  return { x: viewBox.x + x, y: viewBox.y + y }
}

/** Read a finite SVG transformation matrix, falling back to authored ancestor transforms. */
export function readSvgElementTransform(element: SVGGraphicsElement, screen = false): SvgAffineTransform | null {
  try {
    const matrix = screen ? element.getScreenCTM?.() : element.getCTM?.()
    if (matrix) {
      const values = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
      if (values.every(value => Number.isFinite(value))) {
        return { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f }
      }
    }
    if (screen) return null

    const ownerSvg = element.ownerSVGElement
    let current: Element | null = element
    let result = IDENTITY_TRANSFORM
    let found = false
    while (current && current !== ownerSvg) {
      const transform = parseSvgTransform(current.getAttribute('transform'))
      if (transform) {
        result = multiplyTransforms(transform, result)
        found = true
      }
      current = current.parentElement
    }
    return found ? result : null
  } catch {
    return null
  }
}

export function readSvgClientRect(svg: SVGSVGElement): SvgClientRect | null {
  try {
    const rect = svg.getBoundingClientRect()
    const values = [rect.left, rect.top, rect.width, rect.height]
    return values.every(Number.isFinite)
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : null
  } catch {
    return null
  }
}

/** Read the rendered scale used for screen-sized task markers. */
export function getRenderedSvgScale(svg: SVGSVGElement): SvgScale {
  const screenTransform = readSvgElementTransform(svg, true)
  const transformScale = getSvgTransformScale(screenTransform)
  if (transformScale) return transformScale
  return calculateRenderedSvgScale(
    null,
    parseViewBox(svg.getAttribute('viewBox') ?? ''),
    readSvgClientRect(svg),
    svg.getAttribute('preserveAspectRatio'),
  )
}

/** Convert a point from a source path into the coordinate system of a map layer. */
export function transformSourcePointToLayer(
  path: SVGPathElement,
  point: SvgPoint,
  layerSvg: SVGSVGElement,
): SvgPoint | null {
  const localTransform = readSvgElementTransform(path)
  if (path.ownerSVGElement === layerSvg) {
    return transformPoint(localTransform ?? IDENTITY_TRANSFORM, point)
  }

  const sourceScreen = getScreenPointFromPath(path, point)
  const layerScreen = readSvgElementTransform(layerSvg, true)
  if (sourceScreen && layerScreen) {
    const inverse = invertTransform(layerScreen)
    if (inverse) return transformPoint(inverse, sourceScreen)
  }

  // In DOM/test environments without screen CTMs, bundled nested map SVGs
  // share the root map coordinate system; ancestor group transforms are
  // already included in the local transform above.
  return transformPoint(localTransform ?? IDENTITY_TRANSFORM, point)
}

export function getScreenPointFromPath(path: SVGPathElement, point: SvgPoint): SvgPoint | null {
  const screenTransform = readSvgElementTransform(path, true)
  if (screenTransform) return transformPoint(screenTransform, point)

  const layerSvg = path.ownerSVGElement
  if (!layerSvg) return null
  const localTransform = readSvgElementTransform(path)
  return getScreenPointFromSvg(layerSvg, localTransform ? transformPoint(localTransform, point) : point)
}

export function getScreenPointFromSvg(svg: SVGSVGElement, point: SvgPoint): SvgPoint | null {
  const screenTransform = readSvgElementTransform(svg, true)
  if (screenTransform) return transformPoint(screenTransform, point)

  return projectSvgPointToClient(
    point,
    parseViewBox(svg.getAttribute('viewBox') ?? ''),
    readSvgClientRect(svg),
    svg.getAttribute('preserveAspectRatio'),
  )
}

export function getSvgPointFromClient(svg: SVGSVGElement, client: SvgPoint): SvgPoint | null {
  const screenTransform = readSvgElementTransform(svg, true)
  if (screenTransform) {
    const inverse = invertTransform(screenTransform)
    return inverse ? transformPoint(inverse, client) : null
  }

  return projectClientPointToSvg(
    client,
    parseViewBox(svg.getAttribute('viewBox') ?? ''),
    readSvgClientRect(svg),
    svg.getAttribute('preserveAspectRatio'),
  )
}

export function getLocalPointFromClient(path: SVGPathElement, client: SvgPoint): SvgPoint | null {
  const screenTransform = readSvgElementTransform(path, true)
  if (screenTransform) {
    const inverse = invertTransform(screenTransform)
    return inverse ? transformPoint(inverse, client) : null
  }

  const layerSvg = path.ownerSVGElement
  if (!layerSvg) return null
  const layerPoint = getSvgPointFromClient(layerSvg, client)
  if (!layerPoint) return null
  const localTransform = readSvgElementTransform(path)
  if (!localTransform) return layerPoint
  const inverse = invertTransform(localTransform)
  return inverse ? transformPoint(inverse, layerPoint) : null
}

export function readSvgGeometryBounds(element: SVGGraphicsElement): SvgViewBoxRect | null {
  if (typeof element.getBBox !== 'function') return null
  try {
    const bounds = element.getBBox()
    const values = [bounds.x, bounds.y, bounds.width, bounds.height]
    if (values.some(value => !Number.isFinite(value)) || bounds.width < 0 || bounds.height < 0) return null
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  } catch {
    return null
  }
}

export function getSvgBoundsCenter(bounds: SvgViewBoxRect | null): SvgPoint | null {
  return bounds
    ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    : null
}

export function isSvgPointWithinViewBox(point: SvgPoint, viewBox: SvgViewBoxRect | null): boolean {
  return isValidViewBoxRect(viewBox)
    && [point.x, point.y].every(Number.isFinite)
    && point.x >= viewBox.x
    && point.y >= viewBox.y
    && point.x <= viewBox.x + viewBox.width
    && point.y <= viewBox.y + viewBox.height
}

/** Identify compact, single-component source geometry suitable for one center point. */
export function isCompactUnambiguousSvgGeometry(pathData: string, bounds: SvgViewBoxRect): boolean {
  const maxDimension = 12
  if (bounds.width <= 0 || bounds.height <= 0) return false
  if (Math.max(bounds.width, bounds.height) > maxDimension
    || bounds.width * bounds.height > maxDimension ** 2) return false
  return countDrawnPathComponents(pathData) <= 1
}

/** Count drawn subpaths while treating circle-style `M … m … a …` data as one component. */
export function countDrawnPathComponents(pathData: string): number {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  let current: { command: string; numericCount: number; draws: boolean } | null = null
  let components = 0

  const finish = () => {
    if (!current) return
    if (current.draws || current.numericCount > 2) components += 1
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      if (token === 'M' || token === 'm') {
        finish()
        current = { command: token, numericCount: 0, draws: false }
      } else if (current) {
        current.draws = true
        current.command = token
      }
      continue
    }
    if (current?.command === 'M' || current?.command === 'm') current.numericCount += 1
  }

  finish()
  return components
}

/**
 * Read circle-style compact subpaths used by distributed tiny geography.
 * The map layer deliberately accepts only compact arc components here; a
 * mainland or ordinary polygon remains authoritative source geometry.
 */
export function readPathComponents(pathData: string): TaskPathComponent[] {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  const components: TaskPathComponent[] = []
  let current: { start: SvgPoint | null; commands: string[]; command: string | null; numbers: number[]; hasDrawing: boolean } | null = null
  let lastPoint: SvgPoint = { x: 0, y: 0 }

  const finish = () => {
    if (current?.start) components.push({ start: current.start, commands: current.commands })
    current = null
  }

  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      if (token === 'M') {
        finish()
        current = { start: null, commands: [], command: 'M', numbers: [], hasDrawing: false }
      } else if (token === 'm') {
        if (current?.hasDrawing) finish()
        if (!current) current = { start: null, commands: [], command: 'm', numbers: [], hasDrawing: false }
        current.command = 'm'
        current.numbers = []
        current.commands.push('m')
      } else if (token.toLowerCase() === 'z') {
        current?.commands.push('z')
        if (current) current.hasDrawing = true
      } else {
        if (!current) continue
        current.command = token
        current.numbers = []
        current.commands.push(token.toLowerCase())
        current.hasDrawing = true
      }
      continue
    }

    if (!current || !current.command) continue
    const number = Number(token)
    if (!Number.isFinite(number)) continue
    current.numbers.push(number)
    if ((current.command === 'M' || current.command === 'm') && current.numbers.length === 2 && !current.start) {
      const [x, y] = current.numbers
      current.start = current.command === 'M'
        ? { x, y }
        : { x: lastPoint.x + x, y: lastPoint.y + y }
      lastPoint = current.start
    } else if ((current.command === 'M' || current.command === 'm') && current.numbers.length > 2) {
      current.hasDrawing = true
    }
  }

  finish()
  return components.filter(component =>
    component.commands.includes('a')
    && component.commands.every(command => command === 'm' || command === 'a' || command === 'z'))
}
