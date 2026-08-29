// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from './SettingsContext'
import { SettingsOverlay } from './SettingsOverlay'
import { exportWorldCountriesOrder } from '@/features/world-countries'
import type { PwaUpdate } from './usePwaUpdate'

let root: Root | null = null
let mount: HTMLDivElement

const pwa: PwaUpdate = {
  buildTime: '2026-08-16T00:00:00.000Z',
  version: 'test',
  buildCommit: 'test',
  checking: false,
  needRefresh: false,
  lastChecked: null,
  updateError: null,
  checkForUpdate: vi.fn(async () => undefined),
  updateNow: vi.fn(async () => undefined),
}

describe('Settings app version', () => {
  it('reports an update check failure instead of claiming the app is current', () => {
    renderSettings({ updateError: 'Could not contact the update service.' })

    expect(mount.textContent).toContain('Check failed')
    expect(mount.querySelector('[role="alert"]')?.textContent).toBe('Could not contact the update service.')
    expect(mount.textContent).not.toContain('Up to date')
  })
})

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
    await chooseFile('{not json', 'error')

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
    }), 'confirmation')

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
    }), 'confirmation')
    act(() => getConfirmationButton('geography-order-confirm-heading', 'Import order').click())

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
    }), 'confirmation')
    act(() => getConfirmationButton('geography-order-confirm-heading', 'Import order').click())

    expect((await readExportedOrder()).world).toMatchObject({ continentOrder: ['europe'] })

    act(() => getButton('Reset Geography order').click())
    expect(mount.textContent).toContain('This removes all custom World, Continent, Subregion and Country ordering')
    expect((await readExportedOrder()).world).toMatchObject({ continentOrder: ['europe'] })

    act(() => getConfirmationButton('geography-order-reset-heading', 'Reset Geography order').click())

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
    }), 'confirmation')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota') })

    act(() => getConfirmationButton('geography-order-confirm-heading', 'Import order').click())

    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('could not be saved')
    expect(mount.querySelector('[aria-label="Settings"]')).not.toBeNull()
  })
})

function renderSettings(pwaOverrides: Partial<PwaUpdate> = {}): void {
  mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(SettingsOverlay, { onClose: vi.fn(), pwa: { ...pwa, ...pwaOverrides } }),
    ))
  })
}

async function chooseFile(contents: string, expectedState: 'confirmation' | 'error'): Promise<void> {
  if (!root) renderSettings()
  const input = mount.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File([contents], 'order.json', { type: 'application/json' })],
  })
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await waitForGeographyOrderState(expectedState)
  expect(input.value).toBe('')
}

async function waitForGeographyOrderState(expectedState: 'confirmation' | 'error'): Promise<void> {
  const description = expectedState === 'confirmation' ? 'import confirmation' : 'import error'
  const isReady = () => expectedState === 'confirmation'
    ? mount.querySelector('[role="group"][aria-labelledby="geography-order-confirm-heading"]') !== null
    : mount.querySelector('[role="alert"]') !== null
  const deadline = performance.now() + 2_000

  while (!isReady()) {
    if (performance.now() >= deadline) {
      throw new Error(`Timed out waiting for ${description}. Current UI: ${mount.textContent ?? ''}`)
    }
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  }
}

function getButton(label: string): HTMLButtonElement {
  const button = getButtons(label)[0]
  if (!button) throw new Error(`Missing button: ${label}`)
  return button
}

function getButtons(label: string): HTMLButtonElement[] {
  return [...mount.querySelectorAll('button')].filter(button => button.textContent?.trim() === label) as HTMLButtonElement[]
}

function getConfirmationButton(headingId: string, label: string): HTMLButtonElement {
  const group = mount.querySelector<HTMLElement>(`[role="group"][aria-labelledby="${headingId}"]`)
  if (!group) throw new Error(`Missing confirmation group: ${headingId}`)
  const button = [...group.querySelectorAll('button')].find(candidate => candidate.textContent?.trim() === label)
  if (!button) throw new Error(`Missing confirmation button: ${label}`)
  return button
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
