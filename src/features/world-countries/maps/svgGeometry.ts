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
