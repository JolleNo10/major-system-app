import { describe, expect, it } from 'vitest'
import { clientPointToSvgPoint, parseSvgViewBox } from './capitalAuthoringCoordinates'

describe('capital authoring SVG coordinates', () => {
  it('parses and validates a positive SVG viewBox', () => {
    expect(parseSvgViewBox('0 0 1148.08 799.57')).toEqual({ x: 0, y: 0, width: 1148.08, height: 799.57 })
    expect(parseSvgViewBox('0 0 0 100')).toBeNull()
  })

  it('converts responsive client coordinates into stable SVG user coordinates', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 50')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, width: 200, height: 100 }),
    })

    expect(clientPointToSvgPoint(svg, { x: 110, y: 70 })).toEqual({ x: 50, y: 25 })
  })

  it('honors left/top SVG alignment when letterboxing a responsive map', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 50')
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, width: 300, height: 300 }),
    })

    expect(clientPointToSvgPoint(svg, { x: 160, y: 95 })).toEqual({ x: 50, y: 25 })
  })
})
