// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { CapitalMapAuthoringEditor } from './CapitalMapAuthoringEditor'
import type { CapitalAuthoringMapSource } from './capitalAuthoringMapSource'

const { loadCapitalAuthoringMapSource } = vi.hoisted(() => ({
  loadCapitalAuthoringMapSource: vi.fn(),
}))

vi.mock('./capitalAuthoringMapSource', () => ({ loadCapitalAuthoringMapSource }))

const source: CapitalAuthoringMapSource = {
  markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><path id="Iceland"/><path id="Norway"/><path id="Sweden"/><path id="Finland"/></svg>',
  metadata: {
    id: 'europe',
    sourceAsset: 'MapChart_Map_Europe.svg',
    sourceAssetSha: 'sha256:test',
    viewBox: '0 0 1000 500',
  },
}

let root: Root | null = null
let mount: HTMLDivElement | null = null
let bboxPrototype: object | null = null
let getBBoxDescriptor: PropertyDescriptor | undefined

function findButton(label: string): HTMLButtonElement {
  const button = [...(mount?.querySelectorAll('button') ?? [])]
    .find(candidate => candidate.textContent?.trim() === label)
  if (!(button instanceof HTMLButtonElement)) throw new Error('Button not found: ' + label)
  return button
}

beforeEach(() => {
  localStorage.clear()
  loadCapitalAuthoringMapSource.mockResolvedValue(source)
  bboxPrototype = Object.getPrototypeOf(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
  getBBoxDescriptor = Object.getOwnPropertyDescriptor(bboxPrototype, 'getBBox')
  Object.defineProperty(bboxPrototype, 'getBBox', {
    configurable: true,
    value(this: SVGGraphicsElement) {
      const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {
        Iceland: { x: 10, y: 100, width: 10, height: 10 },
        Norway: { x: 100, y: 150, width: 20, height: 30 },
        Sweden: { x: 400, y: 250, width: 40, height: 50 },
        Finland: { x: 450, y: 260, width: 35, height: 45 },
      }
      return boxes[this.id] ?? { x: 0, y: 0, width: 0, height: 0 }
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
  localStorage.clear()
  loadCapitalAuthoringMapSource.mockReset()
  if (bboxPrototype && getBBoxDescriptor) Object.defineProperty(bboxPrototype, 'getBBox', getBBoxDescriptor)
  else if (bboxPrototype) Reflect.deleteProperty(bboxPrototype, 'getBBox')
  bboxPrototype = null
  getBBoxDescriptor = undefined
})

async function renderEditor() {
  if (!mount) throw new Error('Test mount is missing')
  await act(async () => {
    root = createRoot(mount as HTMLDivElement)
    root.render(createElement(PageLayoutProvider, null, createElement(CapitalMapAuthoringEditor)))
    await Promise.resolve()
  })
}

async function settle() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('CapitalMapAuthoringEditor reference mode', () => {
  it('stays closed by default, updates across navigation, and never creates a placement', async () => {
    await renderEditor()
    await settle()

    expect(mount?.querySelector('[data-capital-authoring-reference-panel]')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-reference-map]')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-editor] dd')?.textContent).toBe('absent')

    await act(async () => {
      findButton('Reference').click()
      await Promise.resolve()
    })
    await settle()

    expect(mount?.querySelector('[data-capital-authoring-reference-panel]')?.textContent).toContain('Reykjavík')
    expect(mount?.querySelector('[data-capital-authoring-reference-map]')?.getAttribute('alt')).toContain('Reykjavík')
    expect(mount?.querySelector('[data-capital-authoring-reference-target]')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-editor] dd')?.textContent).toBe('absent')

    await act(async () => {
      findButton('Next').click()
      await Promise.resolve()
    })
    await settle()

    expect(mount?.querySelector('[data-capital-authoring-reference-panel]')?.textContent).toContain('Oslo')
    expect(mount?.querySelector('button[aria-pressed="true"]')).not.toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-editor] dd')?.textContent).toBe('absent')

    await act(async () => {
      findButton('Reference: On').click()
      await Promise.resolve()
    })
    expect(mount?.querySelector('[data-capital-authoring-reference-panel]')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-reference-map]')).toBeNull()
  })

  it('can close the panel without changing authoring state', async () => {
    await renderEditor()
    await settle()
    await act(async () => {
      findButton('Reference').click()
      await Promise.resolve()
    })
    await settle()

    await act(async () => {
      findButton('Close').click()
      await Promise.resolve()
    })
    expect(mount?.querySelector('[data-capital-authoring-reference-panel]')).toBeNull()
    expect(mount?.querySelector('[data-capital-authoring-editor] dd')?.textContent).toBe('absent')
  })
})
