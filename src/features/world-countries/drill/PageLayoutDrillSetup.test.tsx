// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountries } from '../WorldCountries'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { act(() => root?.unmount()); root = null; document.body.replaceChildren(); localStorage.clear(); vi.unstubAllGlobals() })

async function renderShell() {
  const mount = document.createElement('div'); document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(
      SettingsProvider,
      null,
      createElement(
        PageLayoutProvider,
        null,
        createElement(PageLayout, null, createElement(WorldCountries, { answerMode: 'typing' })),
      ),
    ))
    await Promise.resolve()
    await Promise.resolve()
  })
  return mount
}

describe('World Countries activity boundary', () => {
  it('defaults to Home and reaches configurable Drill through Playground', async () => {
    const mount = await renderShell()
    expect(mount.querySelector('[role="tablist"]')).toBeNull()
    expect(mount.textContent).toContain('Your world')
    expect(mount.textContent).not.toContain('Due reviews')

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="playground"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-play-activity="custom-drill"]')?.click())
    expect(mount.textContent).toContain('Geography')
    expect(mount.textContent).not.toContain('Purpose')
    expect(mount.textContent).not.toContain('Learn & Practise')
    expect(mount.textContent).toContain('Drill mode')
    expect(mount.querySelector('input[value="countries"]')).not.toBeNull()
    expect(mount.textContent).toContain('Drill order')
    expect(mount.textContent).not.toContain('Start Drill')
  })

  it('opens each Playground Practice card in a fixed setup', async () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({ subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered' }))
    const mount = await renderShell()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="playground"]')?.click())
    for (const [activity, label] of [
      ['locate-countries', 'Locate Countries'],
      ['countries-from-capitals', 'Countries from Capitals'],
      ['capitals', 'Capital Practice'],
      ['country-from-shape', 'Country from Shape'],
    ] as const) {
      await act(async () => mount.querySelector<HTMLButtonElement>(`[data-play-activity="${activity}"]`)?.click())
      expect(mount.textContent).toContain(label)
      expect(mount.textContent).toContain(`Start ${label}`)
      expect(mount.textContent).not.toContain('Purpose')
      expect(mount.textContent).not.toContain('Learn & Practise')
      expect(mount.textContent).not.toContain('Drill mode')
      expect(mount.querySelector('input[type="radio"]')).toBeNull()
      await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Back to guided home')?.click())
      await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="playground"]')?.click())
    }
  })
})
