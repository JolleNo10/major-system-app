// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import europeSvg from '@/features/world-countries/maps/assets/MapChart_Map_Europe_names.svg?raw'
import { SvgMapController } from '@/features/world-countries/maps/SvgMapController'

const TEST_MAP = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <g><path id="Alpha" style="fill:#737373;stroke:#252525"/><text id="Alpha_label"><tspan> ALPHA </tspan></text></g>
  <g><path id="Beta" style="fill:#737373;stroke:#252525"/><text id="Beta_label"><tspan>BETA LAND</tspan></text></g>
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

describe('SvgMapController hover behavior', () => {
  it('derives tiny markers from geometry and routes their hover, click, and zoom through the source Country', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 40, y: 20, width: 20, height: 15 })
    controller.updateSettings({ hoverHighlight: true, hoverShowName: true })

    const marker = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-marker="Alpha"]')
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    expect(marker).not.toBeNull()
    expect(hit).not.toBeNull()
    expect(marker?.getAttribute('fill')).toBe('#737373')
    expect(Number(hit?.getAttribute('r'))).toBeGreaterThan(Number(marker?.getAttribute('r')))

    const clicked: string[] = []
    const hovered: Array<string | null> = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setCountryHoverHandler(id => hovered.push(id))
    hit?.dispatchEvent(new Event('pointerenter'))
    expect(hovered).toEqual(['Alpha'])
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('inline')
    hit?.dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual(['Alpha'])
    hit?.dispatchEvent(new Event('pointerleave'))
    expect(hovered).toEqual(['Alpha', null])

    controller.setCountryColors({ Alpha: '#ef4444' })
    expect(marker?.getAttribute('fill')).toBe('#ef4444')
    expect(controller.setZoomArea(['Alpha'], 5)).toEqual({ activeIds: ['Alpha'], unknownIds: [] })
    expect(mount.querySelector('svg')?.getAttribute('viewBox')).toBe('5 5 12 12')
  })

  it('resolves overlapping forgiving targets by nearest pointer position', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 14, y: 10, width: 2, height: 2 })
    controller.updateSettings({ hoverHighlight: true })
    const svg = mount.querySelector('svg')
    if (!svg) throw new Error('Missing map SVG')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 }),
    })
    const alphaHit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    if (!alphaHit) throw new Error('Missing Alpha tiny Country hit target')
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))

    alphaHit.dispatchEvent(new MouseEvent('click', { clientX: 14, clientY: 10 }))
    expect(clicked).toEqual(['Beta'])
  })

  it('does not let a tiny halo steal a pointer inside a neighboring source Country', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    setBBox(mount, 'Beta', { x: 14, y: 10, width: 20, height: 15 })
    controller.updateSettings({ hoverHighlight: true })
    const svg = mount.querySelector('svg')
    if (!svg) throw new Error('Missing map SVG')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50 }),
    })
    const alphaHit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    if (!alphaHit) throw new Error('Missing Alpha tiny Country hit target')
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))

    alphaHit.dispatchEvent(new MouseEvent('click', { clientX: 20, clientY: 18 }))
    expect(clicked).toEqual(['Beta'])
  })

  it('maps forgiving-target coordinates through letterboxed SVG viewports', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    controller.updateSettings({ hoverHighlight: true })
    const svg = mount.querySelector('svg')
    if (!svg) throw new Error('Missing map SVG')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 200, right: 100, bottom: 200 }),
    })
    const alphaHit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    if (!alphaHit) throw new Error('Missing Alpha tiny Country hit target')
    const clicked: string[] = []
    controller.setCountryClickHandler(id => clicked.push(id))

    alphaHit.dispatchEvent(new MouseEvent('click', { clientX: 11, clientY: 96 }))
    expect(clicked).toEqual(['Alpha'])
  })

  it('does not leave tiny marker interaction behind for hidden or non-interactive Countries', async () => {
    const { mount, controller } = makeController()
    await controller.load({ markup: TEST_MAP })
    setBBox(mount, 'Alpha', { x: 10, y: 10, width: 2, height: 2 })
    controller.updateSettings({ hoverHighlight: true, hoverShowName: true })
    const hit = mount.querySelector<SVGCircleElement>('[data-svg-map-tiny-hit-target="Alpha"]')
    if (!hit) throw new Error('Missing tiny Country hit target')

    const clicked: string[] = []
    const hovered: Array<string | null> = []
    controller.setCountryClickHandler(id => clicked.push(id))
    controller.setCountryHoverHandler(id => hovered.push(id))
    controller.setHiddenCountries(['Alpha'])
    expect(mount.querySelector('[data-svg-map-tiny-country="Alpha"]')?.getAttribute('visibility')).toBe('hidden')
    expect(hit.style.getPropertyValue('pointer-events')).toBe('none')
    hit.dispatchEvent(new Event('pointerenter'))
    hit.dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual([])
    expect(hovered).toEqual([null])

    controller.clearHiddenCountries()
    controller.setHoverableCountries([])
    expect(mount.querySelector('[data-svg-map-tiny-country="Alpha"]')?.getAttribute('visibility')).toBe('visible')
    expect(hit.style.getPropertyValue('pointer-events')).toBe('none')
    hit.dispatchEvent(new Event('pointerenter'))
    hit.dispatchEvent(new MouseEvent('click'))
    expect(clicked).toEqual([])
    expect(hovered).toEqual([null, null])
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
