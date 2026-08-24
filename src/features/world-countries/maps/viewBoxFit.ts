export interface SvgViewBoxRect {
  x: number
  y: number
  width: number
  height: number
}

/** Expand a source viewBox around its center so it exactly matches a slot ratio. */
export function fitViewBoxToAspect(rect: SvgViewBoxRect, slotAspect: number | null | undefined): SvgViewBoxRect {
  if (!slotAspect || !Number.isFinite(slotAspect) || slotAspect <= 0) return rect
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) return rect

  const currentAspect = rect.width / rect.height
  const width = currentAspect < slotAspect ? rect.height * slotAspect : rect.width
  const height = currentAspect < slotAspect ? rect.height : rect.width / slotAspect
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  }
}
