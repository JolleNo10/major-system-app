// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  SvgTaskAssistanceRuntime,
  type SvgMapLearningAnchor,
  type SvgTaskAssistanceCountry,
} from './svgTaskAssistance'
import { getSyntheticDotSourceFingerprint } from './syntheticDots'

const SIMPLE_MAP = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
    <g><path id="Alpha" d="M 10 10" style="fill:#737373"/><text id="Alpha_label">ALPHA</text></g>
    <g><path id="Beta" d="M 14 10 L 34 10" style="fill:#737373"/><text id="Beta_label">BETA</text></g>
  </svg>`

const DISTRIBUTED_MAP = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
    <g><path id="Alpha" d="M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0"/><text id="Alpha_label">ALPHA</text></g>
  </svg>`

const runtimes: SvgTaskAssistanceRuntime[] = []

function makeRuntime(markup = SIMPLE_MAP) {
  const mount = document.createElement('div')
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement
  const svg = document.importNode(parsed, true) as unknown as SVGSVGElement
  mount.append(svg)
  document.body.append(mount)

  const countries: SvgTaskAssistanceCountry[] = [...svg.querySelectorAll<SVGPathElement>('path')].map(path => ({
    id: path.id,
    path,
    originalFill: { value: '#737373' },
  }))
  const countryById = new Map(countries.map(country => [country.id, country]))
  const selectable = new Set(countries.map(country => country.id))
  const hidden = new Set<string>()
  const clicked: string[] = []
  let runtime: SvgTaskAssistanceRuntime
  const render = () => {
    runtime.sync()
    for (const country of countries) {
      runtime.renderCountryTaskState(country, null, hidden.has(country.id), false)
    }
  }
  runtime = new SvgTaskAssistanceRuntime({
    getCountries: () => countries,
    isSelectable: countryId => selectable.has(countryId) && !hidden.has(countryId),
    isHidden: countryId => hidden.has(countryId),
    dispatchCountryClick: countryId => clicked.push(countryId),
    requestRender: render,
    getSettings: () => ({
      countryFill: '#737373',
      hoverStroke: '#d4d4d8',
      hoverStrokeWidth: '1.5',
      transitionMs: 120,
    }),
  })
  runtime.attach(svg)
  runtimes.push(runtime)

  return { mount, svg, countries, countryById, selectable, hidden, clicked, runtime, render }
}

function setBBox(country: SvgTaskAssistanceCountry, bounds: { x: number; y: number; width: number; height: number }): void {
  Object.defineProperty(country.path, 'getBBox', { configurable: true, value: () => bounds })
}

function setSvgRect(svg: SVGSVGElement, width: number, height: number): void {
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
  })
}

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.reset()
  document.body.replaceChildren()
})

describe('SvgTaskAssistanceRuntime', () => {
  it('normalizes task configuration and preserves omitted versus empty answer selection', () => {
    const { runtime } = makeRuntime()

    expect(runtime.configure({ answerSelectionIds: [' Alpha', 'Missing', 'Alpha'] })).toEqual({
      activeIds: ['Alpha'],
      unknownIds: ['Missing'],
    })
    expect(runtime.isAnswerSelectionConfigured()).toBe(true)

    expect(runtime.configure({ answerSelectionIds: [] })).toEqual({ activeIds: [], unknownIds: [] })
    expect(runtime.isAnswerSelectionConfigured()).toBe(true)
    expect(runtime.configure(null)).toEqual({ activeIds: [], unknownIds: [] })
    expect(runtime.isAnswerSelectionConfigured()).toBe(false)
  })

  it('keeps authored-anchor and synthetic-dot validation errors precise', () => {
    const { runtime } = makeRuntime()
    const singleDotAnchor: SvgMapLearningAnchor = {
      sourceSvgId: 'Alpha',
      kind: 'single-dot',
      sourceFingerprint: 'M 10 10',
    }

    expect(() => runtime.configure({ learningAnchors: [singleDotAnchor, singleDotAnchor] }))
      .toThrow('Duplicate task learning anchor for Alpha')
    expect(() => runtime.configure({ learningAnchors: [{ ...singleDotAnchor, sourceFingerprint: 'stale' }] }))
      .toThrow('Stale task learning anchor source for Alpha')
    expect(() => runtime.configure({ learningAnchors: [{ ...singleDotAnchor, point: { x: 10, y: 10 } }] }))
      .toThrow('must resolve from source geometry')
    expect(() => runtime.configure({ learningAnchors: [{ ...singleDotAnchor, kind: 'multi-dot-representative' }] }))
      .toThrow('has no point')
    expect(() => runtime.configure({
      syntheticDots: [{ sourceSvgId: 'Alpha', sourceFingerprint: 'stale', point: { x: 10, y: 10 } }],
    })).toThrow('Stale task synthetic dot source for Alpha')
    expect(() => runtime.configure({
      syntheticDots: [
        { sourceSvgId: 'Alpha', sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10'), point: { x: 10, y: 10 } },
        { sourceSvgId: 'Alpha', sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10'), point: { x: 11, y: 11 } },
      ],
    })).toThrow('Duplicate task synthetic dot for Alpha')
  })

  it('derives compact and multi-component interaction points, with synthetic override', () => {
    const compact = makeRuntime()
    setBBox(compact.countryById.get('Alpha') as SvgTaskAssistanceCountry, { x: 10, y: 10, width: 2, height: 2 })
    setBBox(compact.countryById.get('Beta') as SvgTaskAssistanceCountry, { x: 14, y: 10, width: 20, height: 15 })
    compact.runtime.configure({ answerSelectionIds: ['Alpha', 'Beta'] })
    expect(compact.mount.querySelectorAll('[data-svg-map-task-interaction-marker]')).toHaveLength(1)
    expect(compact.mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')?.getAttribute('cx')).toBe('11')

    const distributed = makeRuntime(DISTRIBUTED_MAP)
    const alpha = distributed.countryById.get('Alpha') as SvgTaskAssistanceCountry
    setBBox(alpha, { x: 9, y: 9, width: 33, height: 13 })
    distributed.runtime.configure({ answerSelectionIds: ['Alpha'] })
    expect(distributed.mount.querySelectorAll('[data-svg-map-task-interaction-marker]')).toHaveLength(2)

    distributed.runtime.configure({
      answerSelectionIds: ['Alpha'],
      syntheticDots: [{
        sourceSvgId: 'Alpha',
        sourceFingerprint: getSyntheticDotSourceFingerprint(alpha.path.getAttribute('d') ?? ''),
        point: { x: 40, y: 20 },
      }],
    })
    expect(distributed.mount.querySelectorAll('[data-svg-map-task-interaction-marker]')).toHaveLength(1)
    expect(distributed.mount.querySelector('[data-svg-map-task-interaction-source="synthetic"]')).not.toBeNull()
  })

  it('uses transformed source geometry and keeps the forgiving halo bounded and local', () => {
    const { runtime, mount, svg, countryById, clicked } = makeRuntime()
    const alpha = countryById.get('Alpha') as SvgTaskAssistanceCountry
    const beta = countryById.get('Beta') as SvgTaskAssistanceCountry
    setBBox(alpha, { x: 10, y: 10, width: 2, height: 2 })
    setBBox(beta, { x: 14, y: 10, width: 20, height: 15 })
    setSvgRect(svg, 100, 50)
    Object.defineProperty(alpha.path, 'getCTM', { configurable: true, value: () => ({ a: 2, b: 0, c: 0, d: 2, e: 20, f: 5 }) })
    Object.defineProperty(alpha.path, 'getScreenCTM', { configurable: true, value: () => ({ a: 2, b: 0, c: 0, d: 2, e: 20, f: 5 }) })
    runtime.configure({ answerSelectionIds: ['Alpha', 'Beta'] })

    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-interaction-marker="Alpha:0"]')
    if (!marker) throw new Error('Missing transformed marker')
    expect(marker.getAttribute('cx')).toBe('42')
    expect(marker.getAttribute('cy')).toBe('27')

    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 42, clientY: 27 }))
    expect(runtime.getHoveredCountryId()).toBe('Alpha')
    svg.dispatchEvent(new MouseEvent('click', { clientX: 42, clientY: 27 }))
    expect(clicked).toEqual(['Alpha'])

    const halo = makeRuntime()
    setBBox(halo.countryById.get('Alpha') as SvgTaskAssistanceCountry, { x: 10, y: 10, width: 2, height: 2 })
    setBBox(halo.countryById.get('Beta') as SvgTaskAssistanceCountry, { x: 14, y: 10, width: 20, height: 15 })
    setSvgRect(halo.svg, 100, 50)
    halo.runtime.configure({ answerSelectionIds: ['Alpha', 'Beta'] })
    halo.svg.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 18 }))
    expect(halo.clicked).toEqual(['Alpha'])
    halo.svg.dispatchEvent(new MouseEvent('click', { clientX: 32, clientY: 20 }))
    expect(halo.clicked).toEqual(['Alpha', 'Beta'])
  })

  it('keeps marker sizing in screen pixels and cleans layers/listeners on detach and reset', () => {
    const { runtime, mount, svg, countryById, clicked, render } = makeRuntime()
    setBBox(countryById.get('Alpha') as SvgTaskAssistanceCountry, { x: 10, y: 10, width: 2, height: 2 })
    setSvgRect(svg, 100, 50)
    runtime.configure({ answerSelectionIds: ['Alpha'] })
    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-interaction-marker="Alpha:0"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
    if (!marker || !hit) throw new Error('Missing task marker')
    expect(Number(marker.getAttribute('r'))).toBeCloseTo(5.5)
    expect(Number(hit.getAttribute('r'))).toBeCloseTo(12)

    setSvgRect(svg, 200, 100)
    render()
    expect(Number(marker.getAttribute('r'))).toBeCloseTo(2.75)
    expect(Number(hit.getAttribute('r'))).toBeCloseTo(6)

    runtime.detach()
    expect(mount.querySelector('[data-svg-map-task-targets]')).toBeNull()
    svg.dispatchEvent(new MouseEvent('click', { clientX: 11, clientY: 11 }))
    expect(clicked).toEqual([])

    runtime.reset()
    expect(runtime.isAnswerSelectionConfigured()).toBe(false)
    expect(runtime.getHoveredCountryId()).toBeNull()
  })
})
