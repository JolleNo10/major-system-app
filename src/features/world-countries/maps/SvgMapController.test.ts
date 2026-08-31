// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe.svg?raw'
import { SvgMapController } from '@/features/world-countries/maps/SvgMapController'
import { getSyntheticDotSourceFingerprint } from './syntheticDots'

const TEST_MAP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <g><path id="Alpha" d="M 10 10" style="fill:#737373;stroke:#252525"/><text id="Alpha_label"><tspan> ALPHA </tspan></text></g>
  <g><path id="Beta" d="M 40 20" style="fill:#737373;stroke:#252525"/><text id="Beta_label"><tspan>BETA LAND</tspan></text></g>
  <g><path id="Gamma" style="fill:#737373;stroke:#252525"/><text id="Short_label"><tspan>GAMMA</tspan></text></g>
  <g><path id="Delta" style="fill:#737373;stroke:#252525"/><text id="Delta_label"><tspan>DELTA</tspan></text></g>
  <path id="Unlabelled" style="fill:#737373"/>
</svg>`

const controllers: SvgMapController[] = []

function makeController() {
  const mount = document.createElement('div')
  document.body.append(mount)
  const controller = new SvgMapController(mount)
  controllers.push(controller)
  return { mount, controller }
}

function path(mount: HTMLElement, id: string): SVGPathElement {
  const element = mount.querySelector<SVGPathElement>(`#${id}`)
  if (!element) throw new Error(`Missing test path ${id}`)
  return element
}

function label(mount: HTMLElement, id: string): SVGTextElement {
  const element = mount.querySelector<SVGTextElement>(`#${id}`)
  if (!element) throw new Error(`Missing test label ${id}`)
  return element
}

function setBBox(mount: HTMLElement, id: string, bounds: { x: number; y: number; width: number; height: number }): void {
  Object.defineProperty(path(mount, id), 'getBBox', {
    configurable: true,
    value: () => bounds,
  })
}

function setSvgRect(mount: HTMLElement, dimensions: { width: number; height: number }): void {
  const svg = mount.querySelector<SVGSVGElement>('svg')
  if (!svg) throw new Error('Missing test map SVG')
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: dimensions.width,
      height: dimensions.height,
      right: dimensions.width,
      bottom: dimensions.height,
    }),
  })
}

function setMountRect(mount: HTMLElement, dimensions: { width: number; height: number }): void {
  Object.defineProperty(mount, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: dimensions.width,
      height: dimensions.height,
      right: dimensions.width,
      bottom: dimensions.height,
    }),
  })
}

function readViewBox(mount: HTMLElement): { x: number; y: number; width: number; height: number } {
  const values = mount.querySelector('svg')?.getAttribute('viewBox')?.split(' ').map(Number) ?? []
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) throw new Error('Missing viewBox')
  const [x, y, width, height] = values
  return { x, y, width, height }
}

afterEach(() => {
  while (controllers.length) controllers.pop()?.destroy()
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('SvgMapController loading and discovery', () => {
  it('loads markup and structurally pairs labels with sibling paths', async () => {
    const { mount, controller } = makeController()
    const countries = await controller.load({ markup: TEST_MAP })

    expect(countries).toEqual([
      { id: 'Alpha', name: 'ALPHA', pathId: 'Alpha', labelId: 'Alpha_label' },
      { id: 'Beta', name: 'BETA LAND', pathId: 'Beta', labelId: 'Beta_label' },
      { id: 'Gamma', name: 'GAMMA', pathId: 'Gamma', labelId: 'Short_label' },
      { id: 'Delta', name: 'DELTA', pathId: 'Delta', labelId: 'Delta_label' },
    ])
    expect(controller.discoverCountries()).toEqual(countries)
    expect(mount.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(mount.querySelector('#Unlabelled')).not.toBeNull()
  })

  it('discovers the MapChart export, including its non-matching Switzerland label ID', async () => {
    const { controller } = makeController()
    const countries = await controller.load({ markup: europeSvg })

    expect(countries).toHaveLength(65)
    expect(countries).toContainEqual({
      id: 'Switzerland',
      name: 'SWITZ.',
      pathId: 'Switzerland',
      labelId: 'Switz._label',
    })
    expect(countries.some(country => country.id === 'Andorra')).toBe(true)
  })

  it('loads a URL and rejects invalid or embedded content', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => TEST_MAP,
    } as Response)
    const { controller } = makeController()

    await controller.load({ url: '/map.svg' })
    expect(fetchMock).toHaveBeenCalledWith('/map.svg', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    await expect(controller.load({ markup: '<div>not svg</div>' })).rejects.toThrow('valid SVG root')
    await expect(controller.load({
      markup: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    })).rejects.toThrow('unsupported')
  })
})

describe('SvgMapController persistent state', () => {
  it('zooms to a padded country bounding box and can restore the original viewBox', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    Object.defineProperty(path(mount, 'Alpha'), 'getBBox', {
      configurable: true,
      value: () => ({ x: 10, y: 10, width: 10, height: 10 }),
    })
    Object.defineProperty(path(mount, 'Beta'), 'getBBox', {
      configurable: true,
      value: () => ({ x: 40, y: 20, width: 5, height: 15 }),
    })

    expect(controller.setZoomArea(['Alpha', 'Beta'], 5)).toEqual({
      activeIds: ['Alpha', 'Beta'],
      unknownIds: [],
    })
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('5 5 45 35')
    expect(mount.querySelector('svg')?.style.aspectRatio).toBe('45 / 35')

    controller.resetZoom()
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 100 50')
    expect(mount.querySelector('svg')?.style.aspectRatio).toBe('100 / 50')
  })

  it('preserves zoom padding beyond the source viewBox at an edge', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    Object.defineProperty(path(mount, 'Alpha'), 'getBBox', {
      configurable: true,
      value: () => ({ x: 20, y: 85, width: 10, height: 15 }),
    })

    expect(controller.setZoomArea(['Alpha'], 10)).toEqual({
      activeIds: ['Alpha'],
      unknownIds: [],
    })
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('10 75 30 35')
  })

  it('keeps a dramatically larger neighbour from controlling a target-centric neighbourhood', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 42, y: 20, width: 4, height: 4 })
    setBBox(mount, 'Beta', { x: -400, y: -200, width: 900, height: 700 })

    expect(controller.setTargetCentricZoom(['Alpha'], ['Beta'])).toEqual({
      activeIds: ['Alpha', 'Beta'],
      unknownIds: [],
    })

    const viewBox = readViewBox(mount)
    expect(viewBox.width).toBeLessThan(200)
    expect(viewBox.height).toBeLessThan(100)
    expect(viewBox.x).toBeLessThanOrEqual(42)
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(46)
  })

  it('clears the previous target-centric camera when the next target is unknown', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 42, y: 20, width: 4, height: 4 })

    controller.setTargetCentricZoom(['Alpha'])
    expect(readViewBox(mount)).not.toEqual({ x: 0, y: 0, width: 100, height: 50 })

    expect(controller.setTargetCentricZoom(['Missing'])).toEqual({
      activeIds: [],
      unknownIds: ['Missing'],
    })
    expect(readViewBox(mount)).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('clears the previous target-centric camera when the target bbox is unusable', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 42, y: 20, width: 4, height: 4 })

    controller.setTargetCentricZoom(['Alpha'])
    setBBox(mount, 'Alpha', { x: 42, y: 20, width: 0, height: 0 })

    expect(controller.setTargetCentricZoom(['Alpha'])).toEqual({
      activeIds: ['Alpha'],
      unknownIds: [],
    })
    expect(readViewBox(mount)).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('retains ordinary compact neighbour context in the target-centric frame', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 30, y: 20, width: 5, height: 5 })
    setBBox(mount, 'Beta', { x: 45, y: 23, width: 6, height: 6 })

    controller.setTargetCentricZoom(['Alpha'], ['Beta'])

    const viewBox = readViewBox(mount)
    expect(viewBox.x).toBeLessThanOrEqual(45)
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(51)
    expect(viewBox.y).toBeLessThanOrEqual(23)
    expect(viewBox.y + viewBox.height).toBeGreaterThanOrEqual(29)
  })

  it('gives a tiny target a minimum local window', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 0.2, height: 0.2 })

    controller.setTargetCentricZoom(['Alpha'])

    const viewBox = readViewBox(mount)
    expect(viewBox.width).toBeGreaterThanOrEqual(16)
    expect(viewBox.height).toBeGreaterThanOrEqual(8)
    expect(viewBox.x).toBeLessThanOrEqual(10)
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(10.2)
  })

  it('keeps all meaningful geometry of a fragmented target path in view', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g><path id="Alpha" d="M 10 10 h 4 v 4 h -4 z M 70 30 h 4 v 8 h -4 z"/><text id="Alpha_label">ALPHA</text></g>
      </svg>` })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 64, height: 28 })

    controller.setTargetCentricZoom(['Alpha'])

    const viewBox = readViewBox(mount)
    expect(viewBox.x).toBeLessThanOrEqual(10)
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(74)
    expect(viewBox.y).toBeLessThanOrEqual(10)
    expect(viewBox.y + viewBox.height).toBeGreaterThanOrEqual(38)
  })

  it('fits a target-centric frame to the expanded slot without losing the target', async () => {
    const viewport = document.createElement('div')
    const mount = document.createElement('div')
    viewport.append(mount)
    document.body.append(viewport)
    const controller = new SvgMapController(mount, {}, viewport)
    controllers.push(controller)
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 30, y: 10, width: 10, height: 10 })
    setMountRect(viewport, { width: 200, height: 100 })

    controller.setTargetCentricZoom(['Alpha'])
    controller.setPresentation('expanded')

    const viewBox = readViewBox(mount)
    expect(viewBox.width / viewBox.height).toBeCloseTo(2)
    expect(viewBox.x).toBeLessThanOrEqual(30)
    expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(40)
    expect(viewBox.y).toBeLessThanOrEqual(10)
    expect(viewBox.y + viewBox.height).toBeGreaterThanOrEqual(20)
  })

  it('fits the retained zoom intent to the expanded map slot and refits after a slot change', async () => {
    const viewport = document.createElement('div')
    const mount = document.createElement('div')
    viewport.append(mount)
    document.body.append(viewport)
    const controller = new SvgMapController(mount, {}, viewport)
    controllers.push(controller)
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 10, height: 10 })
    setMountRect(viewport, { width: 200, height: 100 })

    controller.setZoomArea(['Alpha'], 5)
    controller.setPresentation('expanded')
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('-5 5 40 20')

    setMountRect(viewport, { width: 100, height: 200 })
    controller.setPresentation('expanded')
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('5 -5 20 40')

    controller.setPresentation('standard')
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('5 5 20 20')
  })

  it('fits the original source viewBox when expanded without an explicit zoom target', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setMountRect(mount, { width: 100, height: 100 })

    controller.setPresentation('expanded')
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -25 100 100')
    controller.setPresentation('expanded')
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -25 100 100')
  })

  it('recomputes the expanded source camera from the resize observer without accumulating drift', async () => {
    const originalResizeObserver = globalThis.ResizeObserver
    const resizeState: { callback: ResizeObserverCallback | null } = { callback: null }
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) { resizeState.callback = callback }
      observe() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver

    try {
      const { mount, controller } = makeController()
      await controller.load({ markup: TEST_MAP })
      setMountRect(mount, { width: 200, height: 100 })
      controller.setPresentation('expanded')
      const triggerResize = resizeState.callback
      if (!triggerResize) throw new Error('Missing resize observer callback')

      setMountRect(mount, { width: 100, height: 200 })
      triggerResize([], {} as ResizeObserver)
      expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('0 -75 100 200')

      setMountRect(mount, { width: 200, height: 100 })
      triggerResize([], {} as ResizeObserver)
      expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 100 50')
    } finally {
      globalThis.ResizeObserver = originalResizeObserver
    }
  })

  it('sets, toggles, clears, and reports listed or complement highlights', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    expect(controller.setHighlighted(['Alpha', 'Missing'])).toEqual({
      activeIds: ['Alpha'],
      unknownIds: ['Missing'],
    })
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#0891b2')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('inline')

    expect(controller.toggleHighlighted(['Beta']).activeIds).toEqual(['Alpha', 'Beta'])
    expect(controller.setHighlighted(['Alpha'], 'all-except').activeIds).toEqual(['Beta', 'Gamma', 'Delta'])
    expect(controller.toggleHighlighted(['Alpha'], 'all-except').activeIds).toEqual([])
    expect(controller.clearHighlights().activeIds).toEqual([])
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#737373')
  })

  it('combines explicit, global, and highlighted label visibility', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')
    expect(controller.setNamesVisible(['Beta', 'Unknown']).unknownIds).toEqual(['Unknown'])
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('inline')
    expect(controller.toggleNames(['Beta']).activeIds).toEqual([])

    controller.setAllNamesVisible(true)
    expect(label(mount, 'Delta_label').style.getPropertyValue('display')).toBe('inline')
    controller.setAllNamesVisible(false)
    expect(label(mount, 'Delta_label').style.getPropertyValue('display')).toBe('none')

    controller.updateSettings({ showHighlightedNames: false })
    controller.setHighlighted(['Alpha'])
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')
  })

  it('sets, replaces, and clears temporary country labels without changing metadata', async () => {
    const { mount, controller } = makeController()
    const countries = await controller.load({ markup: TEST_MAP })

    expect(controller.setCountryLabels({
      Beta: '1 Beta Land',
      Missing: '2 Missing',
    })).toEqual({
      activeIds: ['Beta'],
      unknownIds: ['Missing'],
    })
    expect(label(mount, 'Beta_label').textContent).toBe('1 Beta Land')
    expect(controller.discoverCountries()).toEqual(countries)

    controller.setCountryLabels({ Beta: '2 BETA LAND' })
    expect(label(mount, 'Beta_label').textContent).toBe('2 BETA LAND')

    expect(controller.clearCountryLabels()).toEqual({ activeIds: [], unknownIds: [] })
    expect(label(mount, 'Beta_label').textContent).toBe('BETA LAND')
    expect(controller.discoverCountries()).toEqual(countries)
  })

  it('supports independent country colors, border styles, and clearing both layers', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    expect(controller.setCountryColors(new Map([
      ['Alpha', '#ef4444'],
      ['Beta', '#22c55e'],
      ['Missing', '#000000'],
    ]))).toEqual({
      activeIds: ['Alpha', 'Beta'],
      unknownIds: ['Missing'],
    })
    expect(controller.getCountryColors()).toEqual({ Alpha: '#ef4444', Beta: '#22c55e' })
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#ef4444')

    controller.updateSettings({
      highlightStroke: '#0e7490',
      highlightStrokeWidth: '3px',
      hoverStroke: '#67e8f9',
      hoverStrokeWidth: '4px',
    })
    expect(path(mount, 'Alpha').style.getPropertyValue('stroke')).toBe('#0e7490')
    expect(path(mount, 'Alpha').style.getPropertyValue('stroke-width')).toBe('3px')

    controller.setHighlighted(['Beta'])
    expect(path(mount, 'Beta').style.getPropertyValue('stroke')).toBe('#0e7490')
    expect(controller.clearColors().activeIds).toEqual([])
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#737373')
    expect(controller.clearHighlightsAndColors().activeIds).toEqual([])
    expect(controller.getHighlightedIds()).toEqual([])
  })

  it('renders a filtered outer outline for a configured country group', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    expect(controller.setGroupOutlines([{
      id: 'alpha-beta',
      countryIds: ['Alpha', 'Beta', 'Missing'],
      stroke: '#facc15',
      strokeWidth: '4px',
    }])).toEqual({
      outlines: [{
        id: 'alpha-beta',
        countryIds: ['Alpha', 'Beta'],
        stroke: '#facc15',
        strokeWidth: '4px',
      }],
      unknownIds: ['Missing'],
    })
    expect(mount.querySelector('[data-svg-map-group-outline="alpha-beta"]')).toBeNull()

    expect(controller.setGroupOutlinesVisible(['alpha-beta']).activeIds).toEqual(['alpha-beta'])
    const outline = mount.querySelector('[data-svg-map-group-outline="alpha-beta"]')
    expect(outline).not.toBeNull()
    expect(outline?.querySelectorAll('use')).toHaveLength(2)
    expect(outline?.getAttribute('filter')).toMatch(/^url\(#svg-map-group-outline-/)
    expect(mount.querySelector('feMorphology')?.getAttribute('operator')).toBe('dilate')

    controller.setGroupOutlinesVisible(['alpha-beta'], false)
    expect(mount.querySelector('[data-svg-map-group-outline="alpha-beta"]')).toBeNull()
    expect(mount.querySelector('filter[data-svg-map-group-outline-filter]')).toBeNull()
  })
})

function taskAnchor(sourceSvgId: string, sourceFingerprint: string, point?: { x: number; y: number }) {
  return {
    sourceSvgId,
    kind: point ? 'multi-dot-representative' as const : 'single-dot' as const,
    sourceFingerprint,
    ...(point ? { point } : {}),
  }
}

const alphaAnchor = taskAnchor('Alpha', 'M 10 10')
const betaAnchor = taskAnchor('Beta', 'M 40 20')

function enableTaskAssistance(
  controller: SvgMapController,
  answerSelectionIds: readonly string[] = ['Alpha'],
  learningAnchors = [alphaAnchor],
  taskTargetId: string | null = null,
): void {
  controller.setCountryClickHandler(() => undefined)
  controller.setTaskAssistance({ answerSelectionIds, taskTargetId, learningAnchors })
}

describe('SvgMapController task assistance', () => {
  it('does not augment ordinary selectable or highlighted maps', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    controller.setSelectableCountries(['Alpha'])
    controller.setHighlighted(['Alpha'])

    expect(mount.querySelector('[data-svg-map-task-target]')).toBeNull()
    expect(mount.querySelector('[data-svg-map-tiny-marker]')).toBeNull()
  })

  it('uses explicit task candidates with visible rest markers and screen-space sizing', async () => {
    const first = makeController()
    await first.controller.load({ markup: TEST_MAP })
    setBBox(first.mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setSvgRect(first.mount, { width: 100, height: 50 })
    enableTaskAssistance(first.controller)

    const scaledMarkup = TEST_MAP.replace('viewBox="0 0 100 50"', 'viewBox="0 0 1000 500"')
    const second = makeController()
    await second.controller.load({ markup: scaledMarkup })
    setBBox(second.mount, 'Alpha', { x: 100, y: 100, width: 2, height: 2 })
    setSvgRect(second.mount, { width: 100, height: 50 })
    enableTaskAssistance(second.controller)

    const firstMarker = first.mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
    const firstHit = first.mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
    const secondMarker = second.mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
    const secondHit = second.mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
    if (!firstMarker || !firstHit || !secondMarker || !secondHit) throw new Error('Missing task assistance geometry')

    expect(first.mount.querySelector('[data-svg-map-task-interaction-point="Alpha:0"]')?.getAttribute('visibility')).toBe('visible')
    expect(Number(firstMarker.getAttribute('r'))).toBeCloseTo(5.5)
    expect(Number(firstHit.getAttribute('r'))).toBeCloseTo(12)
    expect(Number(secondMarker.getAttribute('r')) * 0.1).toBeCloseTo(Number(firstMarker.getAttribute('r')))
    expect(Number(secondHit.getAttribute('r')) * 0.1).toBeCloseTo(Number(firstHit.getAttribute('r')))
  })

  it('derives compact task candidates without per-Country anchor metadata', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 40, y: 20, width: 2, height: 2 })
    controller.setCountryClickHandler(() => undefined)
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha', 'Beta'] })

    expect(mount.querySelectorAll('[data-svg-map-tiny-hit-target]')).toHaveLength(2)
    expect(mount.querySelectorAll('[data-svg-map-tiny-marker]')).toHaveLength(2)
  })

  it('uses one authored synthetic point through the native task-point pipeline', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 30, height: 20 })
    setBBox(mount, 'Beta', { x: 40, y: 20, width: 2, height: 2 })
    setSvgRect(mount, { width: 100, height: 50 })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({
      answerSelectionIds: ['Alpha', 'Beta'],
      syntheticDots: [{
        sourceSvgId: 'Alpha',
        sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10'),
        point: { x: 20, y: 20 },
      }],
    })

    const synthetic = mount.querySelector<SVGCircleElement>('[data-svg-map-task-interaction-marker="Alpha:0"]')
    const native = mount.querySelector<SVGCircleElement>('[data-svg-map-task-interaction-marker="Beta:0"]')
    const svg = mount.querySelector<SVGSVGElement>('svg')
    if (!synthetic || !native || !svg) throw new Error('Missing synthetic/native task point')
    expect(synthetic.getAttribute('cx')).toBe('20')
    expect(synthetic.parentElement?.getAttribute('data-svg-map-task-interaction-source')).toBe('synthetic')
    expect(synthetic.parentElement?.getAttribute('visibility')).toBe('visible')
    expect(Number(synthetic.getAttribute('r'))).toBe(Number(native.getAttribute('r')))

    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 20, bubbles: true }))
    expect(Number(synthetic.getAttribute('r'))).toBeGreaterThan(Number(native.getAttribute('r')))
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#22d3ee')
    svg.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 20, bubbles: true }))
    expect(clicked).toEqual(['Alpha'])

    svg.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }))
    expect(Number(synthetic.getAttribute('r'))).toBe(Number(native.getAttribute('r')))
    controller.setTaskAssistance(null)
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).toBeNull()
  })

  it('does not derive extra component points when a synthetic dot is configured', async () => {
    const { mount, controller } = makeController()
    const distributedMap = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g><path id="Alpha" d="M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0"/><text id="Alpha_label">ALPHA</text></g>
      </svg>`
    await controller.load({ markup: distributedMap })
    setBBox(mount, 'Alpha', { x: 9, y: 9, width: 33, height: 13 })
    controller.setCountryClickHandler(() => undefined)
    controller.setTaskAssistance({
      answerSelectionIds: ['Alpha'],
      syntheticDots: [{
        sourceSvgId: 'Alpha',
        sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0'),
        point: { x: 40, y: 20 },
      }],
    })

    expect(mount.querySelectorAll('[data-svg-map-task-interaction-marker="Alpha:0"]')).toHaveLength(1)
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:1"]')).toBeNull()
  })

  it('removes synthetic task points when a Country is hidden or leaves the candidate scope', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    controller.setCountryClickHandler(() => undefined)
    const syntheticDot = {
      sourceSvgId: 'Alpha',
      sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10'),
      point: { x: 20, y: 20 },
    }
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha'], syntheticDots: [syntheticDot] })
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).not.toBeNull()

    controller.setHiddenCountries(['Alpha'])
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).toBeNull()
    controller.clearHiddenCountries()
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).not.toBeNull()

    controller.setTaskAssistance({ answerSelectionIds: ['Beta'], syntheticDots: [syntheticDot] })
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).toBeNull()
  })

  it('uses a synthetic point as the singular representative task target', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.setTaskAssistance({
      taskTargetId: 'Alpha',
      syntheticDots: [{
        sourceSvgId: 'Alpha',
        sourceFingerprint: getSyntheticDotSourceFingerprint('M 10 10'),
        point: { x: 20, y: 20 },
      }],
    })

    const target = mount.querySelector<SVGCircleElement>('[data-svg-map-task-representative-target="Alpha"] [data-svg-map-task-marker="Alpha"]')
    expect(target?.getAttribute('cx')).toBe('20')
    expect(mount.querySelectorAll('[data-svg-map-task-representative-target="Alpha"]')).toHaveLength(1)
    expect(mount.querySelector('[data-svg-map-task-interaction-marker="Alpha:0"]')).toBeNull()
  })

  it('uses transformed source geometry for generated placement and real pointer hover', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    const alpha = path(mount, 'Alpha')
    const sourceToMap = { a: 2, b: 0, c: 0, d: 2, e: 20, f: 5 }
    Object.defineProperty(alpha, 'getCTM', { configurable: true, value: () => sourceToMap })
    Object.defineProperty(alpha, 'getScreenCTM', { configurable: true, value: () => sourceToMap })
    controller.setCountryClickHandler(() => undefined)
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha'] })

    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-marker="Alpha"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    if (!marker || !hit) throw new Error('Missing transformed task geometry')
    expect(marker.getAttribute('cx')).toBe('42')
    expect(marker.getAttribute('cy')).toBe('27')

    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointermove', { clientX: 42, clientY: 27 }))
    expect(Number(marker.getAttribute('r'))).toBeCloseTo(6.875)
    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointerleave'))
    expect(Number(marker.getAttribute('r'))).toBeCloseTo(5.5)
  })

  it('keeps task targets through zoom and resize without remounting the SVG', async () => {
    const originalResizeObserver = globalThis.ResizeObserver
    const resizeState: { callback: ResizeObserverCallback | null } = { callback: null }
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) { resizeState.callback = callback }
      observe() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver

    try {
      const { mount, controller } = makeController()
      await controller.load({ markup: TEST_MAP })
      setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
      setSvgRect(mount, { width: 100, height: 50 })
      enableTaskAssistance(controller)
      const svg = mount.querySelector('svg')
      const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
      const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
      const triggerResize = resizeState.callback
      if (!svg || !marker || !hit || !triggerResize) throw new Error('Missing resize test geometry')

      controller.setZoomArea(['Alpha'], 0)
      controller.resetZoom()
      setSvgRect(mount, { width: 200, height: 100 })
      triggerResize([], {} as ResizeObserver)

      expect(mount.querySelector('svg')).toBe(svg)
      expect(Number(marker.getAttribute('r'))).toBeCloseTo(2.75)
      expect(Number(hit.getAttribute('r'))).toBeCloseTo(6)
    } finally {
      globalThis.ResizeObserver = originalResizeObserver
    }
  })

  it('keeps persistent target emphasis separate from generic highlight and task hover', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 40, y: 20, width: 2, height: 2 })
    setSvgRect(mount, { width: 100, height: 50 })
    enableTaskAssistance(controller, ['Alpha', 'Beta'], [alphaAnchor, betaAnchor], 'Alpha')

    const alphaMarker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
    const alphaHit = mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
    const betaMarker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Beta"]')
    if (!alphaMarker || !alphaHit || !betaMarker) throw new Error('Missing task target geometry')
    expect(Number(alphaMarker.getAttribute('r'))).toBeCloseTo(5.5)
    expect(mount.querySelector('[data-svg-map-task-representative-target="Alpha"]')?.getAttribute('visibility')).toBe('visible')

    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointermove', { clientX: 11, clientY: 11 }))
    expect(Number(alphaMarker.getAttribute('r'))).toBeCloseTo(6.875)
    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointerleave'))
    expect(Number(alphaMarker.getAttribute('r'))).toBeCloseTo(5.5)

    controller.setTaskAssistance({ answerSelectionIds: ['Alpha', 'Beta'], taskTargetId: 'Beta', learningAnchors: [alphaAnchor, betaAnchor] })
    expect(mount.querySelector('[data-svg-map-task-representative-target="Alpha"]')).toBeNull()
    expect(Number(betaMarker.getAttribute('r'))).toBeCloseTo(5.5)
  })

  it('grows on task hover even when generic hover styling is disabled and honors reduced motion', async () => {
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
    try {
      const { mount, controller } = makeController()
      await controller.load({ markup: TEST_MAP })
      setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
      enableTaskAssistance(controller)
      const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
      const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
      if (!marker || !hit) throw new Error('Missing reduced-motion task geometry')

      mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointermove', { clientX: 11, clientY: 11 }))
      expect(Number(marker.getAttribute('r'))).toBeCloseTo(6.875)
      expect(marker.style.getPropertyValue('transition')).toBe('none')
    } finally {
      if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
      else Reflect.deleteProperty(window, 'matchMedia')
    }
  })

  it('routes task hover and forgiving clicks once without changing generic hover state', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    controller.setCountryHoverHandler(() => undefined)
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha'], learningAnchors: [alphaAnchor] })
    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Alpha"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-task-hit-target="Alpha"]')
    if (!marker || !hit) throw new Error('Missing task target geometry')

    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointermove', { clientX: 11, clientY: 11 }))
    expect(Number(marker.getAttribute('r'))).toBeCloseTo(6.875)
    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { clientX: 11, clientY: 11 }))
    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('click', { clientX: 11, clientY: 11 }))
    expect(clicked).toEqual(['Alpha', 'Alpha'])
    mount.querySelector('svg')?.dispatchEvent(new MouseEvent('pointerleave'))
    expect(mount.querySelector('[data-svg-map-task-representative-target="Alpha"]')).toBeNull()
  })

  it('uses a bounded tiny halo locally and leaves ordinary source geometry selectable outside it', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 14, y: 10, width: 20, height: 15 })
    Object.defineProperty(mount.querySelector('svg'), 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 }),
    })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha', 'Beta'], learningAnchors: [alphaAnchor] })
    const svg = mount.querySelector<SVGSVGElement>('svg')
    if (!svg) throw new Error('Missing task map SVG')

    svg.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 18 }))
    expect(clicked).toEqual(['Alpha'])
    svg.dispatchEvent(new MouseEvent('click', { clientX: 32, clientY: 20 }))
    expect(clicked).toEqual(['Alpha', 'Beta'])
  })

  it('lets a bounded tiny interaction region win over overlapping source geometry and keeps hover equal to click', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 14, y: 10, width: 20, height: 15 })
    setSvgRect(mount, { width: 100, height: 50 })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha', 'Beta'] })
    const svg = mount.querySelector<SVGSVGElement>('svg')
    if (!svg) throw new Error('Missing task map SVG')

    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 18, bubbles: true }))
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#737373')

    svg.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 18, bubbles: true }))
    expect(clicked).toEqual(['Alpha'])

    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 30, clientY: 20, bubbles: true }))
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#737373')
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#22d3ee')
    svg.dispatchEvent(new MouseEvent('click', { clientX: 30, clientY: 20, bubbles: true }))
    expect(clicked).toEqual(['Alpha', 'Beta'])
  })

  it('derives multiple local interaction points for one distributed Country', async () => {
    const { mount, controller } = makeController()
    const distributedMap = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g><path id="Micronesia" d="M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0"/><text id="Micronesia_label">MICRONESIA</text></g>
      </svg>`
    await controller.load({ markup: distributedMap })
    setBBox(mount, 'Micronesia', { x: 9, y: 9, width: 33, height: 13 })
    setSvgRect(mount, { width: 100, height: 50 })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({ answerSelectionIds: ['Micronesia'] })
    const svg = mount.querySelector<SVGSVGElement>('svg')
    const markers = [...mount.querySelectorAll<SVGCircleElement>('[data-svg-map-tiny-marker="Micronesia"]')]
    if (!svg || markers.length !== 2) throw new Error('Missing distributed Country interaction points')

    const rings = [...mount.querySelectorAll<SVGCircleElement>('[data-svg-map-task-interaction-ring="Micronesia:0"], [data-svg-map-task-interaction-ring="Micronesia:1"]')]
    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10, bubbles: true }))
    expect(markers.map(marker => marker.parentElement?.getAttribute('visibility'))).toEqual(['visible', 'visible'])
    expect(rings.map(ring => ring.getAttribute('opacity'))).toEqual(['0.85', '0'])
    expect(Number(markers[0].getAttribute('r'))).toBeGreaterThan(0)
    svg.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }))
    expect(clicked).toEqual(['Micronesia'])

    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 40, clientY: 20, bubbles: true }))
    expect(markers.map(marker => marker.parentElement?.getAttribute('visibility'))).toEqual(['visible', 'visible'])
    expect(rings.map(ring => ring.getAttribute('opacity'))).toEqual(['0', '0.85'])
    svg.dispatchEvent(new MouseEvent('click', { clientX: 40, clientY: 20, bubbles: true }))
    expect(clicked).toEqual(['Micronesia', 'Micronesia'])
  })

  it('keeps a distributed Country task target on one representative learning anchor', async () => {
    const { mount, controller } = makeController()
    const distributedMap = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g><path id="Micronesia" d="M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0"/><text id="Micronesia_label">MICRONESIA</text></g>
      </svg>`
    await controller.load({ markup: distributedMap })
    const fingerprint = 'M 10 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 20 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0'
    setBBox(mount, 'Micronesia', { x: 9, y: 9, width: 33, height: 13 })
    controller.setTaskAssistance({
      taskTargetId: 'Micronesia',
      learningAnchors: [{
        sourceSvgId: 'Micronesia',
        kind: 'multi-dot-representative',
        sourceFingerprint: fingerprint,
        point: { x: 40, y: 20 },
      }],
    })

    expect(mount.querySelectorAll('[data-svg-map-task-target="Micronesia"]')).toHaveLength(1)
    expect(mount.querySelectorAll('[data-svg-map-tiny-marker="Micronesia"]')).toHaveLength(1)
    expect(mount.querySelector<SVGCircleElement>('[data-svg-map-task-marker="Micronesia"]')?.getAttribute('cx')).toBe('40')
  })

  it('uses the nearest eligible anchor, respects hidden countries, and removes task state', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 14, y: 10, width: 2, height: 2 })
    Object.defineProperty(mount.querySelector('svg'), 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 }),
    })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setTaskAssistance({ answerSelectionIds: ['Alpha', 'Beta'], learningAnchors: [alphaAnchor, betaAnchor] })
    const svg = mount.querySelector<SVGSVGElement>('svg')
    if (!svg) throw new Error('Missing task map SVG')
    svg.dispatchEvent(new MouseEvent('click', { clientX: 16, clientY: 11 }))
    expect(clicked).toEqual(['Beta'])

    controller.setHiddenCountries(['Alpha'])
    expect(mount.querySelector('[data-svg-map-task-target="Alpha"]')).toBeNull()
    controller.setTaskAssistance(null)
    expect(mount.querySelector('[data-svg-map-task-target]')).toBeNull()
  })

  it('hides Countries and suppresses their hover and click interaction', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.updateSettings({ hoverHighlight: true, hoverShowName: true })
    const clicked: string[] = []
    const hovered: Array<string | null> = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setCountryHoverHandler(id => hovered.push(id))

    expect(controller.setHiddenCountries(['Alpha', 'Missing'])).toEqual({
      activeIds: ['Alpha'],
      unknownIds: ['Missing'],
    })
    expect(controller.getHiddenCountryIds()).toEqual(['Alpha'])
    expect(path(mount, 'Alpha').style.getPropertyValue('visibility')).toBe('hidden')
    expect(path(mount, 'Alpha').style.getPropertyValue('pointer-events')).toBe('none')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')

    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))
    path(mount, 'Alpha').dispatchEvent(new MouseEvent('click'))
    controller.hoverCountry('Alpha', true)
    expect(clicked).toEqual([])
    expect(hovered).toEqual([])
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')

    controller.clearHiddenCountries()
    expect(path(mount, 'Alpha').style.getPropertyValue('visibility')).toBe('')
    path(mount, 'Alpha').dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual(['Alpha'])
  })

  it('dispatches generic country clicks and supports removing the handler', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))
    path(mount, 'Alpha').dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual(['Alpha'])

    controller.setCountryClickHandler(null)
    path(mount, 'Beta').dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual(['Alpha'])
  })

  it('is disabled by default and supports independent single hover effects', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    const alpha = path(mount, 'Alpha')

    alpha.dispatchEvent(new Event('pointerenter'))
    expect(alpha.style.getPropertyValue('fill')).toBe('#737373')

    controller.updateSettings({ hoverHighlight: true, hoverShowName: true })
    alpha.dispatchEvent(new Event('pointerenter'))
    expect(alpha.style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('inline')
    const beta = path(mount, 'Beta')
    beta.dispatchEvent(new Event('pointerenter'))
    expect(beta.style.getPropertyValue('fill')).toBe('#22d3ee')
    alpha.dispatchEvent(new Event('pointerleave'))
    expect(alpha.style.getPropertyValue('fill')).toBe('#737373')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')
  })

  it('reports pointer hover changes without coupling them to controller-driven hover', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.updateSettings({ hoverHighlight: true })

    const hovered: Array<string | null> = []
    controller.setCountryHoverHandler(id => hovered.push(id))

    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))
    controller.hoverCountry('Beta')
    path(mount, 'Alpha').dispatchEvent(new Event('pointerleave'))
    path(mount, 'Beta').dispatchEvent(new Event('pointerleave'))

    expect(hovered).toEqual(['Alpha', null])
  })

  it('uses unions for overlapping groups and falls back for ungrouped countries', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    const result = controller.setHoverGroups([
      { id: 'first', countryIds: ['Alpha', 'Beta', 'Unknown'] },
      { id: 'second', countryIds: ['Alpha', 'Gamma'] },
    ])
    expect(result.unknownIds).toEqual(['Unknown'])
    expect(controller.getHoverGroups()).toEqual([
      { id: 'first', countryIds: ['Alpha', 'Beta'] },
      { id: 'second', countryIds: ['Alpha', 'Gamma'] },
    ])

    controller.updateSettings({ hoverHighlight: true, hoverShowName: true, hoverScope: 'group' })
    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))
    for (const id of ['Alpha', 'Beta', 'Gamma']) {
      expect(path(mount, id).style.getPropertyValue('fill')).toBe('#22d3ee')
    }
    expect(path(mount, 'Delta').style.getPropertyValue('fill')).toBe('#737373')
    expect(label(mount, 'Short_label').style.getPropertyValue('display')).toBe('inline')

    path(mount, 'Alpha').dispatchEvent(new Event('pointerleave'))
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#737373')
    path(mount, 'Delta').dispatchEvent(new Event('pointerenter'))
    expect(path(mount, 'Delta').style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#737373')
  })

  it('restricts hover effects and group activation to an allowlist', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.setHoverGroups([{ id: 'pair', countryIds: ['Alpha', 'Beta'] }])
    controller.updateSettings({ hoverHighlight: true, hoverShowName: true, hoverScope: 'group' })
    const hovered: Array<string | null> = []
    controller.setCountryHoverHandler(id => hovered.push(id))

    expect(controller.setHoverableCountries(['Alpha', 'Missing'])).toEqual({
      activeIds: ['Alpha'],
      unknownIds: ['Missing'],
    })

    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('inline')
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#737373')
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')

    path(mount, 'Beta').dispatchEvent(new Event('pointerenter'))
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#737373')
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')
    expect(hovered).toEqual(['Alpha', null])

    controller.hoverCountry('Beta', true)
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')

    controller.resetHoverableCountries()
    path(mount, 'Beta').dispatchEvent(new Event('pointerenter'))
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#22d3ee')
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('inline')
  })

  it('de-emphasizes muted countries without overwriting semantic colors', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    expect(controller.setMutedCountries(['Beta', 'Missing'])).toEqual({
      activeIds: ['Beta'],
      unknownIds: ['Missing'],
    })
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#303036')

    controller.setCountryColors({ Beta: '#22c55e' })
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#303036')
    expect(path(mount, 'Beta').style.getPropertyValue('filter')).toBe('')

    controller.clearMutedCountries()
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#22c55e')
    expect(path(mount, 'Beta').style.getPropertyValue('filter')).toBe('')
  })

  it('allows controller-driven hover with an explicit name-visibility choice', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })

    controller.hoverCountry('Alpha', true)
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('inline')
    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#737373')

    controller.hoverCountry('Alpha', false)
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')

    controller.setHoverGroups([{ id: 'pair', countryIds: ['Alpha', 'Beta'] }])
    controller.updateSettings({ hoverScope: 'group' })
    controller.hoverCountry('Alpha', true)
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('inline')
    controller.hoverCountry(null)
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')
  })

  it('uses configured hover name visibility when controller-driven hover does not override it', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.setHoverGroups([{ id: 'pair', countryIds: ['Alpha', 'Beta'] }])
    controller.updateSettings({ hoverHighlight: true, hoverShowName: true, hoverScope: 'group' })

    controller.hoverCountry('Alpha')
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('inline')

    controller.updateSettings({ hoverShowName: false })
    controller.hoverCountry('Alpha')
    expect(label(mount, 'Beta_label').style.getPropertyValue('display')).toBe('none')
  })

  it('preserves semantic fills and applies a neutral outline during hover', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.setCountryColors({ Alpha: '#d97706' })
    controller.updateSettings({
      hoverHighlight: true,
      hoverStroke: '#d4d4d8',
      hoverStrokeWidth: '2px',
    })

    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))

    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#d97706')
    expect(path(mount, 'Alpha').style.getPropertyValue('stroke')).toBe('#d4d4d8')
    expect(path(mount, 'Alpha').style.getPropertyValue('stroke-width')).toBe('2px')
  })

  it('preserves each semantic fill and outlines every Country in grouped hover', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.setCountryColors({ Alpha: '#92400e', Beta: '#22c55e' })
    controller.setHoverGroups([{ id: 'pair', countryIds: ['Alpha', 'Beta'] }])
    controller.updateSettings({
      hoverHighlight: true,
      hoverScope: 'group',
      hoverStroke: '#d4d4d8',
      hoverStrokeWidth: '2px',
    })

    path(mount, 'Alpha').dispatchEvent(new Event('pointerenter'))

    for (const [id, fill] of [['Alpha', '#92400e'], ['Beta', '#22c55e']] as const) {
      expect(path(mount, id).style.getPropertyValue('fill')).toBe(fill)
      expect(path(mount, id).style.getPropertyValue('stroke')).toBe('#d4d4d8')
      expect(path(mount, id).style.getPropertyValue('stroke-width')).toBe('2px')
    }
  })

  it('applies visual overrides immediately and cleans up on destroy', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    controller.updateSettings({
      countryFill: '#111111',
      countryStroke: '#eeeeee',
      labelFill: '#ffffff',
      highlightFill: '#ff0000',
      transitionMs: -10,
    })
    controller.setHighlighted(['Alpha'])

    expect(path(mount, 'Alpha').style.getPropertyValue('fill')).toBe('#ff0000')
    expect(path(mount, 'Beta').style.getPropertyValue('fill')).toBe('#111111')
    expect(path(mount, 'Beta').style.getPropertyValue('stroke')).toBe('#eeeeee')
    expect(label(mount, 'Alpha_label').querySelector('tspan')?.style.getPropertyValue('fill')).toBe('#ffffff')

    controller.destroy()
    expect(mount.children).toHaveLength(0)
    expect(() => controller.clearHighlights()).toThrow('destroyed')
  })
})
