// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from './SettingsContext'
import { SettingsOverlay } from './SettingsOverlay'
import { exportWorldCountriesOrder } from '@/features/world-countries'

let root: Root | null = null
let mount: HTMLDivElement

const pwa = {
  buildTime: '2026-08-16T00:00:00.000Z',
  version: 'test',
  buildCommit: 'test',
  checking: false,
  needRefresh: false,
  lastChecked: null,
  checkForUpdate: vi.fn(async () => undefined),
  updateNow: vi.fn(async () => undefined),
}

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Settings World Countries geography order', () => {
  it('exports a dated JSON download', () => {
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'))
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    let downloadName = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download
    })
    renderSettings()

    act(() => getButton('Export order').click())

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(downloadName).toBe('world-countries-order-2026-08-16.json')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('reports invalid JSON without changing saved order', async () => {
    renderSettings()
    await chooseFile('{not json')

    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('JSON')
    expect((await readExportedOrder()).world).toBeNull()
  })

  it('requires confirmation and replaces order only after confirmation', async () => {
    await chooseFile(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [],
      continents: [],
      world: { continentOrder: ['asia'], updatedAt: 4 },
    }))

    expect(mount.textContent).toContain('This replaces your current Continent, Subregion and Country ordering.')
    expect((await readExportedOrder()).world).toBeNull()

    act(() => getButton('Cancel').click())
    expect((await readExportedOrder()).world).toBeNull()

    await chooseFile(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [],
      continents: [],
      world: { continentOrder: ['asia'], updatedAt: 4 },
    }))
    act(() => getButtons('Import order')[getButtons('Import order').length - 1]?.click())

    expect(await readExportedOrder()).toMatchObject({ world: { continentOrder: ['asia'], updatedAt: 4 } })
    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Geography order imported')
  })

  it('resets all custom geography order after confirmation', async () => {
    renderSettings()
    await chooseFile(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [{ subregionId: 'northern-europe', countryOrder: ['NO'], updatedAt: 1 }],
      continents: [{ continentId: 'europe', subregionOrder: ['northern-europe'], updatedAt: 2 }],
      world: { continentOrder: ['europe'], updatedAt: 3 },
    }))
    act(() => getButtons('Import order')[getButtons('Import order').length - 1]?.click())

    expect((await readExportedOrder()).world).toMatchObject({ continentOrder: ['europe'] })

    act(() => getButton('Reset Geography order').click())
    expect(mount.textContent).toContain('This removes all custom World, Continent, Subregion and Country ordering')
    expect((await readExportedOrder()).world).toMatchObject({ continentOrder: ['europe'] })

    act(() => getButtons('Reset Geography order')[getButtons('Reset Geography order').length - 1]?.click())

    await expect(readExportedOrder()).resolves.toMatchObject({ world: null, continents: [], subregions: [] })
    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Geography order reset')
  })

  it('keeps Settings open with recoverable storage failure feedback', async () => {
    renderSettings()
    await chooseFile(JSON.stringify({
      version: 3,
      feature: 'world-countries',
      mnemonics: [],
      subregions: [],
      continents: [],
      world: { continentOrder: ['asia'], updatedAt: 4 },
    }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota') })

    act(() => getButtons('Import order')[getButtons('Import order').length - 1]?.click())

    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('could not be saved')
    expect(mount.querySelector('[aria-label="Settings"]')).not.toBeNull()
  })
})

function renderSettings(): void {
  mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(SettingsOverlay, { onClose: vi.fn(), pwa }),
    ))
  })
}

async function chooseFile(contents: string): Promise<void> {
  if (!root) renderSettings()
  const input = mount.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File([contents], 'order.json', { type: 'application/json' })],
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  expect(input.value).toBe('')
}

function getButton(label: string): HTMLButtonElement {
  const button = getButtons(label)[0]
  if (!button) throw new Error(`Missing button: ${label}`)
  return button
}

function getButtons(label: string): HTMLButtonElement[] {
  return [...mount.querySelectorAll('button')].filter(button => button.textContent?.trim() === label) as HTMLButtonElement[]
}

async function readExportedOrder(): Promise<Record<string, unknown>> {
  const blob = exportWorldCountriesOrder()
  return JSON.parse(await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })) as Record<string, unknown>
}
