// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import europeSvg from '@/features/world-countries/assets/MapChart_Map_Europe_names.svg?raw'
import { SvgMapController } from '@/core/maps/SvgMapController'

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
})

describe('SvgMapController hover behavior', () => {
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
    alpha.dispatchEvent(new Event('pointerleave'))
    expect(alpha.style.getPropertyValue('fill')).toBe('#737373')
    expect(label(mount, 'Alpha_label').style.getPropertyValue('display')).toBe('none')
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
