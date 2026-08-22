// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe.svg?raw'
import oceaniaSvg from '@/features/world-countries/maps/assets/MapChart_Map_Oceania.svg?raw'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { createSchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { SchedulerLocationPracticeStep } from '@/features/world-countries/learning/flows/SchedulerLocationPracticeStep'
import { LearningMapSurface } from '@/features/world-countries/learning/flows/LearningMapSurface'
import { createDrillSelection } from '@/features/world-countries/drill/drillSelection'
import { createDrillSession } from '@/features/world-countries/drill/drillSessionState'
import { DrillSession } from '@/features/world-countries/drill/DrillSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const andorra = countries.find(country => country.id === 'AD') as Country
const sanMarino = countries.find(country => country.id === 'SM') as Country
const vaticanCity = countries.find(country => country.id === 'VA') as Country
const malta = countries.find(country => country.id === 'MT') as Country
const nauru = countries.find(country => country.id === 'NR') as Country
const micronesia = countries.find(country => country.id === 'FM') as Country
const schedulerSettings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }
let root: Root | null = null
let pathBBoxDescriptor: PropertyDescriptor | undefined
let svgRectDescriptor: PropertyDescriptor | undefined
let pathPrototype: object
let svgPrototype: object

function installBundledMapGeometry(): void {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  pathPrototype = Object.getPrototypeOf(path)
  svgPrototype = Object.getPrototypeOf(svg)
  pathBBoxDescriptor = Object.getOwnPropertyDescriptor(pathPrototype, 'getBBox')
  svgRectDescriptor = Object.getOwnPropertyDescriptor(svgPrototype, 'getBoundingClientRect')
  Object.defineProperty(pathPrototype, 'getBBox', {
    configurable: true,
    value(this: SVGPathElement) {
      if (this.id === 'Nauru') return { x: 861.243, y: 288.799, width: 4.3, height: 4.3 }
      if (this.id === 'Andorra') return { x: 442.48, y: 650.98, width: 8.76, height: 8.74 }
      if (this.id === 'San_Marino') return { x: 590.52, y: 627.07, width: 8.76, height: 8.74 }
      if (this.id === 'Vatican_City') return { x: 596.61, y: 669.5, width: 8.76, height: 8.74 }
      if (this.id === 'Malta') return { x: 621.23, y: 780.5, width: 8.8, height: 8.8 }
      return { x: 0, y: 0, width: 40, height: 40 }
    },
  })
  Object.defineProperty(svgPrototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 }),
  })
}

function restoreBundledMapGeometry(): void {
  if (pathBBoxDescriptor) Object.defineProperty(pathPrototype, 'getBBox', pathBBoxDescriptor)
  else Reflect.deleteProperty(pathPrototype, 'getBBox')
  if (svgRectDescriptor) Object.defineProperty(svgPrototype, 'getBoundingClientRect', svgRectDescriptor)
  else Reflect.deleteProperty(svgPrototype, 'getBoundingClientRect')
}

function clickOutsideSourceWithinForgivingTarget(): void {
  const hit = document.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Andorra"]')
  const svg = document.querySelector<SVGSVGElement>('.world-map-svg svg')
  if (!hit || !svg) throw new Error('Missing bundled Andorra forgiving target')
  const [viewX, viewY, viewWidth, viewHeight] = (svg.getAttribute('viewBox') ?? '').split(/[ ,]+/).map(Number)
  const rect = svg.getBoundingClientRect()
  const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight)
  const offsetX = (rect.width - viewWidth * scale) / 2
  const offsetY = (rect.height - viewHeight * scale) / 2
  const centerX = Number(hit.getAttribute('cx'))
  const centerY = Number(hit.getAttribute('cy'))
  svg.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    clientX: rect.left + offsetX + (centerX - viewX) * scale + 8,
    clientY: rect.top + offsetY + (centerY - viewY) * scale,
  }))
}

function mapPoint(svg: SVGSVGElement, x: number, y: number): { clientX: number; clientY: number } {
  const [viewX, viewY, viewWidth, viewHeight] = (svg.getAttribute('viewBox') ?? '').split(/[ ,]+/).map(Number)
  const rect = svg.getBoundingClientRect()
  const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight)
  const offsetX = (rect.width - viewWidth * scale) / 2
  const offsetY = (rect.height - viewHeight * scale) / 2
  return {
    clientX: rect.left + offsetX + (x - viewX) * scale,
    clientY: rect.top + offsetY + (y - viewY) * scale,
  }
}

async function renderAndorraDrill(skill: 'location-to-country' | 'capital-to-country') {
  const onAnswer = vi.fn()
  const state = createDrillSession({
    mode: skill === 'capital-to-country' ? 'countries-from-capitals' : 'countries',
    skills: [skill],
    countryIds: [andorra.id],
  })
  const mount = document.createElement('div')
  document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(PageLayoutProvider, null, createElement(DrillSession, {
      answerMode: 'multiple-choice',
      fuzzyMatching: false,
      interaction: 'location-click',
      activity: 'practice',
      state,
      selection: createDrillSelection('Europe', ['southern-europe']),
      entries: [andorra],
      onAnswer,
      onContinue: vi.fn(),
      onExit: vi.fn(),
    })))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
  return { mount, onAnswer }
}

afterEach(() => {
  vi.useRealTimers()
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  restoreBundledMapGeometry()
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => europeSvg })))
  installBundledMapGeometry()
})

// Regression boundary: the bundled-map reproduction showed that controller
// unit coverage alone could pass while task zoom removed a tiny target and the
// Guided Learning surface cleared its child click override on mount. These
// tests keep the real workflow -> CountryLearningMap -> SvgMapView -> SVG
// chain intact so both shared-map failures remain observable.
describe('real bundled-map tiny Country selection', () => {
  it('assists every compact Europe candidate independently without simple-dot metadata', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onCountryClick = vi.fn()

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Europe',
        scopeCountries: [andorra, sanMarino, vaticanCity, malta],
        answerSelectionCountryIds: [andorra.id, sanMarino.id, vaticanCity.id, malta.id],
        onCountryClick,
        ariaLabel: 'Europe task map',
      }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelectorAll('[data-svg-map-tiny-hit-target]')).toHaveLength(4)
    const svg = mount.querySelector<SVGSVGElement>('.world-map-svg svg')
    if (!svg) throw new Error('Missing bundled Europe SVG')
    const radii = new Map<string, number>()
    for (const id of ['Andorra', 'San_Marino', 'Vatican_City', 'Malta']) {
      const marker = mount.querySelector<SVGCircleElement>(`[data-svg-map-tiny-marker="${id}"]`)
      const hit = mount.querySelector<SVGCircleElement>(`[data-svg-map-tiny-hit-target="${id}"]`)
      if (!marker || !hit) throw new Error(`Missing compact candidate ${id}`)
      radii.set(id, Number(marker.getAttribute('r')))
      const pointer = mapPoint(svg, Number(marker.getAttribute('cx')), Number(marker.getAttribute('cy')))
      svg.dispatchEvent(new MouseEvent('pointermove', { ...pointer, bubbles: true }))
      expect(Number(marker.getAttribute('r'))).toBeGreaterThan(radii.get(id) as number)
      expect(mount.querySelector<SVGPathElement>(`path#${id}`)?.style.getPropertyValue('fill')).toBe('#0f766e')
      svg.dispatchEvent(new MouseEvent('click', { ...pointer, bubbles: true }))
      svg.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }))
      expect(Number(marker.getAttribute('r'))).toBeCloseTo(radii.get(id) as number)
    }
    expect(onCountryClick.mock.calls.map(([countryId]) => countryId)).toEqual(['AD', 'SM', 'VA', 'MT'])
  })

  it('routes Locate Countries through the real DrillSession and SVG stack once', async () => {
    const { mount, onAnswer } = await renderAndorraDrill('location-to-country')
    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-marker="Andorra"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Andorra"]')
    if (!marker || !hit) throw new Error('Missing bundled Andorra tiny target')
    expect(mount.querySelector('[data-svg-map-task-representative-target="Andorra"]')).toBeNull()
    expect(Number(marker.getAttribute('r'))).toBeGreaterThan(0)
    expect(Number(hit.getAttribute('r'))).toBeGreaterThan(Number(marker.getAttribute('r')))
    expect(mount.textContent).toContain('Find Andorra')

    await act(async () => clickOutsideSourceWithinForgivingTarget())

    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({
      countryId: 'AD',
      skill: 'location-to-country',
      answer: 'Andorra',
      evidenceKind: 'recognition',
    }))
    expect(mount.querySelector('[data-svg-map-task-representative-target="Andorra"]')?.getAttribute('visibility')).toBe('visible')
    expect(Number(marker.getAttribute('r'))).toBeGreaterThan(0)
  })

  it('routes Locate Capitals through the same real tiny Country target', async () => {
    const { mount, onAnswer } = await renderAndorraDrill('capital-to-country')
    expect(mount.textContent).toContain('Andorra la Vella')
    expect(mount.textContent).toContain('Which country has this capital?')

    await act(async () => clickOutsideSourceWithinForgivingTarget())

    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({
      countryId: 'AD',
      skill: 'capital-to-country',
      answer: 'Andorra',
      evidenceKind: 'recognition',
    }))
  })

  it('routes Guided Learning location practice through LearningMapSurface and the same target', async () => {
    vi.useFakeTimers()
    const onSelect = vi.fn()
    const session = createSchedulerLearningSession([andorra.id], schedulerSettings, () => 0)
    expect(session.currentKey).toBe(andorra.id)
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null, createElement(LearningMapSurface, {
        continent: 'Europe',
        scopeCountries: [andorra],
        presentation: { ariaLabel: 'Guided location map' },
        presentationKey: 'location-practice',
        context: createElement('h1', null, 'Find Andorra'),
        children: createElement(SchedulerLocationPracticeStep, {
          continent: 'Europe',
          entries: [andorra],
          session,
          label: 'Set 1',
          onSelect,
          onBack: vi.fn(),
          onExit: vi.fn(),
          surface: true,
        }),
      })))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-marker="Andorra"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Andorra"]')
    if (!marker || !hit) throw new Error('Missing bundled Andorra tiny marker')
    expect(mount.querySelector('[data-svg-map-task-representative-target="Andorra"]')).toBeNull()
    const restRadius = Number(marker.getAttribute('r'))
    expect(hit.style.getPropertyValue('pointer-events')).toBe('')
    await act(async () => clickOutsideSourceWithinForgivingTarget())
    expect(onSelect).toHaveBeenCalledTimes(0)
    expect(mount.querySelector('[data-svg-map-task-representative-target="Andorra"]')?.getAttribute('visibility')).toBe('visible')
    expect(Number(marker.getAttribute('r'))).toBeGreaterThan(0)

    await act(async () => vi.advanceTimersByTime(500))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(true, expect.any(Number))
    const currentMarker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-interaction-marker="Andorra:0"]')
    expect(Number(currentMarker?.getAttribute('r'))).toBeCloseTo(restRadius)
  })

  it('keeps the representative Micronesia target separate from local answer points', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => oceaniaSvg })))
    const onCountryClick = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Oceania',
        scopeCountries: [micronesia],
        answerSelectionCountryIds: [micronesia.id],
        taskTargetCountryId: micronesia.id,
        onCountryClick,
        ariaLabel: 'Micronesia task map',
      }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const target = mount.querySelector('[data-svg-map-task-representative-target="Micronesia"]')
    const representativeMarker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-representative-target="Micronesia"] [data-svg-map-task-marker="Micronesia"]')
    const interactionMarkers = [...mount.querySelectorAll<SVGCircleElement>('[data-svg-map-task-interaction-marker="Micronesia:0"], [data-svg-map-task-interaction-marker="Micronesia:1"], [data-svg-map-task-interaction-marker="Micronesia:2"], [data-svg-map-task-interaction-marker="Micronesia:3"]')]
    const svg = mount.querySelector<SVGSVGElement>('.world-map-svg svg')
    if (!target || !representativeMarker || !svg || interactionMarkers.length !== 4) throw new Error('Missing Micronesia task geometry')
    expect(target.getAttribute('visibility')).toBe('visible')
    expect(Number(representativeMarker.getAttribute('cx'))).toBeCloseTo(497.9716)
    expect(Number(representativeMarker.getAttribute('cy'))).toBeCloseTo(113.848)

    const restRadius = Number(interactionMarkers[0].getAttribute('r'))
    const firstPointer = mapPoint(svg, Number(interactionMarkers[0].getAttribute('cx')), Number(interactionMarkers[0].getAttribute('cy')))
    const secondPointer = mapPoint(svg, Number(interactionMarkers[3].getAttribute('cx')), Number(interactionMarkers[3].getAttribute('cy')))
    svg.dispatchEvent(new MouseEvent('pointermove', { ...firstPointer, bubbles: true }))
    expect(Number(interactionMarkers[0].getAttribute('r'))).toBeGreaterThan(restRadius)
    expect(interactionMarkers[0].parentElement?.getAttribute('visibility')).toBe('visible')
    expect(interactionMarkers[3].parentElement?.getAttribute('visibility')).toBe('hidden')
    await act(async () => {
      svg.dispatchEvent(new MouseEvent('click', { ...firstPointer, bubbles: true }))
      svg.dispatchEvent(new MouseEvent('pointermove', { ...secondPointer, bubbles: true }))
      svg.dispatchEvent(new MouseEvent('click', { ...secondPointer, bubbles: true }))
    })
    expect(onCountryClick).toHaveBeenCalledTimes(2)
    expect(onCountryClick).toHaveBeenNthCalledWith(1, 'FM')
    expect(onCountryClick).toHaveBeenNthCalledWith(2, 'FM')
  })

  it('derives a transformed Oceania simple-dot anchor without metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => oceaniaSvg })))
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningMap, {
        continent: 'Oceania',
        scopeCountries: [nauru],
        answerSelectionCountryIds: [nauru.id],
        onCountryClick: vi.fn(),
        ariaLabel: 'Nauru task map',
      }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-marker="Nauru"]')
    expect(marker).not.toBeNull()
    expect(Number(marker?.getAttribute('cx'))).toBeCloseTo(616.188)
    expect(Number(marker?.getAttribute('cy'))).toBeCloseTo(183.239)
  })
})
