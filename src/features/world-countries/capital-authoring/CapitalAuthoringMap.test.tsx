// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { MEMO_MAP_DEFINITIONS } from '@/features/world-countries/maps/mapDefinitions'
import { CapitalAuthoringMap } from './CapitalAuthoringMap'
import type { CapitalAuthoringMapSource } from './capitalAuthoringMapSource'

const { loadCapitalAuthoringMapSource } = vi.hoisted(() => ({
  loadCapitalAuthoringMapSource: vi.fn(),
}))

vi.mock('./capitalAuthoringMapSource', () => ({ loadCapitalAuthoringMapSource }))

const definition = MEMO_MAP_DEFINITIONS.find(candidate => candidate.id === 'europe') ?? MEMO_MAP_DEFINITIONS[0]

function findCountry(id: string): Country {
  const country = countries.find(candidate => candidate.id === id)
  if (!country) throw new Error(`Expected test Country ${id} is missing`)
  return country
}

const norway = findCountry('NO')
const sweden = findCountry('SE')

const source: CapitalAuthoringMapSource = {
  markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><path id="Norway"/><path id="Sweden"/></svg>',
  metadata: {
    id: 'europe',
    sourceAsset: 'MapChart_Map_Europe.svg',
    sourceAssetSha: 'sha256:test',
    viewBox: '0 0 1000 500',
  },
}

const authoringCallbacks = {
  onSourceReady: vi.fn(),
  onSourceError: vi.fn(),
  onDetection: vi.fn(),
  onMapPoint: vi.fn(),
  onCandidateSelect: vi.fn(),
}

let root: Root | null = null
let mount: HTMLDivElement | null = null
let bboxPrototype: object | null = null
let getBBoxDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  loadCapitalAuthoringMapSource.mockResolvedValue(source)
  bboxPrototype = Object.getPrototypeOf(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
  getBBoxDescriptor = Object.getOwnPropertyDescriptor(bboxPrototype, 'getBBox')
  Object.defineProperty(bboxPrototype, 'getBBox', {
    configurable: true,
    value(this: SVGGraphicsElement) {
      if (this.id === 'Norway') return { x: 100, y: 150, width: 20, height: 30 }
      if (this.id === 'Sweden') return { x: 400, y: 250, width: 40, height: 50 }
      return { x: 0, y: 0, width: 0, height: 0 }
    },
  })
  mount = document.createElement('div')
  document.body.append(mount)
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  mount?.remove()
  mount = null
  loadCapitalAuthoringMapSource.mockReset()
  if (bboxPrototype && getBBoxDescriptor) Object.defineProperty(bboxPrototype, 'getBBox', getBBoxDescriptor)
  else if (bboxPrototype) Reflect.deleteProperty(bboxPrototype, 'getBBox')
  bboxPrototype = null
  getBBoxDescriptor = undefined
})

async function renderMap(country = norway) {
  if (!mount) throw new Error('Test mount is missing')
  const target = mount
  await act(async () => {
    root ??= createRoot(target)
    root.render(createElement(PageLayoutProvider, null,
      createElement(MapSurface, {
        context: null,
        map: createElement(CapitalAuthoringMap, {
          definition,
          country,
          ...authoringCallbacks,
        }),
      }),
    ))
    await Promise.resolve()
  })
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('CapitalAuthoringMap expanded zoom', () => {
  it('fits the current Country in expanded mode and restores the source viewBox', async () => {
    await renderMap()
    await settle()

    const svg = mount?.querySelector<SVGSVGElement>('.world-map-svg svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1000 500')
    expect((svg?.querySelector('#Norway') as SVGGraphicsElement & { getBBox: () => object }).getBBox()).toMatchObject({ x: 100, y: 150, width: 20, height: 30 })

    await act(async () => {
      mount?.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click()
      await Promise.resolve()
    })
    await settle()
    expect(mount?.querySelector('[data-map-surface]')?.getAttribute('data-map-surface-presentation')).toBe('expanded')
    expect(svg?.getAttribute('viewBox')).toBe('68 118 84 94')

    await renderMap(sweden)
    await settle()
    expect(svg?.getAttribute('viewBox')).toBe('368 218 104 114')

    await act(async () => {
      mount?.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click()
      await Promise.resolve()
    })
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1000 500')
  })
})
