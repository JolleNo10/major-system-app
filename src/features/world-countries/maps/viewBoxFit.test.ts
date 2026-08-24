import { describe, expect, it } from 'vitest'
import { fitViewBoxToAspect } from './viewBoxFit'

describe('fitViewBoxToAspect', () => {
  const source = { x: 10, y: 20, width: 40, height: 20 }

  it('widens a tall source around its center for a wide slot', () => {
    expect(fitViewBoxToAspect(source, 3)).toEqual({ x: 0, y: 20, width: 60, height: 20 })
  })

  it('heightens a wide source around its center for a tall slot', () => {
    expect(fitViewBoxToAspect(source, 0.5)).toEqual({ x: 10, y: -10, width: 40, height: 80 })
  })

  it('preserves an already matching viewBox and rejects invalid slots', () => {
    expect(fitViewBoxToAspect(source, 2)).toEqual(source)
    expect(fitViewBoxToAspect(source, 0)).toEqual(source)
    expect(fitViewBoxToAspect(source, Number.NaN)).toEqual(source)
  })
})
