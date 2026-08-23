export interface SvgViewBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ClientPoint {
  x: number
  y: number
}

export function parseSvgViewBox(value: string): SvgViewBox | null {
  const numbers = value.trim().split(/[\s,]+/).map(Number)
  if (numbers.length !== 4 || numbers.some(number => !Number.isFinite(number))) return null
  const [x, y, width, height] = numbers
  if (width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

export function isPointInSvgViewBox(point: ClientPoint, viewBox: SvgViewBox): boolean {
  return point.x >= viewBox.x
    && point.y >= viewBox.y
    && point.x <= viewBox.x + viewBox.width
    && point.y <= viewBox.y + viewBox.height
}

/** Convert a browser pointer to the mounted SVG's own user coordinate system. */
export function clientPointToSvgPoint(
  svg: SVGSVGElement,
  client: ClientPoint,
): ClientPoint | null {
  const viewBox = parseSvgViewBox(svg.getAttribute('viewBox') ?? '')
  if (!viewBox) return null

  const screenCtm = svg.getScreenCTM?.()
  if (screenCtm) {
    try {
      const inverse = screenCtm.inverse()
      // SVGPoint is not exposed consistently in jsdom, while DOMPoint is not
      // present in a few embedded browser environments. Keep the conversion
      // on the matrix API and use a plain object for the fallback contract.
      const transformed = new DOMPoint(client.x, client.y).matrixTransform(inverse)
      const result = { x: transformed.x, y: transformed.y }
      return isPointInSvgViewBox(result, viewBox) ? result : null
    } catch {
      // Fall through to the viewBox/rect calculation below.
    }
  }

  const rect = svg.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  let x = client.x - rect.left
  let y = client.y - rect.top
  const preserveAspectRatio = svg.getAttribute('preserveAspectRatio')?.trim().toLowerCase() ?? ''

  if (preserveAspectRatio.startsWith('none')) {
    x *= viewBox.width / rect.width
    y *= viewBox.height / rect.height
  } else {
    const tokens = preserveAspectRatio.split(/\s+/).filter(Boolean)
    const alignment = tokens[0] ?? 'xMidYMid'
    const meetOrSlice = tokens[1] ?? 'meet'
    const scale = meetOrSlice === 'slice'
      ? Math.max(rect.width / viewBox.width, rect.height / viewBox.height)
      : Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    if (scale <= 0) return null
    const contentWidth = viewBox.width * scale
    const contentHeight = viewBox.height * scale
    const extraWidth = rect.width - contentWidth
    const extraHeight = rect.height - contentHeight
    const offsetX = alignment.includes('xmin') ? 0 : alignment.includes('xmax') ? extraWidth : extraWidth / 2
    const offsetY = alignment.includes('ymin') ? 0 : alignment.includes('ymax') ? extraHeight : extraHeight / 2
    if (x < offsetX || x > offsetX + contentWidth || y < offsetY || y > offsetY + contentHeight) return null
    x = (x - offsetX) / scale
    y = (y - offsetY) / scale
  }

  const result = { x: viewBox.x + x, y: viewBox.y + y }
  return isPointInSvgViewBox(result, viewBox) ? result : null
}
