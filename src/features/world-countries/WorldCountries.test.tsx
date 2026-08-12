// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountries } from './WorldCountries'

vi.mock('./setup/WorldCountriesSetup', () => ({
  WorldCountriesSetup: () => createElement('div', { 'data-testid': 'setup-workflow' }, 'Setup workflow'),
}))

vi.mock('./drill/WorldCountriesDrill', () => ({
  WorldCountriesDrill: () => createElement('div', { 'data-testid': 'drill-workflow' }, 'Drill workflow'),
}))

vi.mock('./recite/WorldCountriesRecite', () => ({
  WorldCountriesRecite: () => createElement('div', { 'data-testid': 'recite-workflow' }, 'Recite workflow'),
}))

vi.mock('./maintenance/WorldCountriesMaintenance', () => ({
  WorldCountriesMaintenance: () => createElement('div', { 'data-testid': 'maintenance-workflow' }, 'Maintenance workflow'),
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

async function renderShell() {
  const mount = document.createElement('div')
  document.body.append(mount)

  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountries, { answerMode: 'typing' }),
        ),
      ),
    ))
    await Promise.resolve()
  })

  return mount
}

describe('World Countries compact activity header', () => {
  it('publishes a compact segmented header without the persistent tagline', async () => {
    const mount = await renderShell()
    const header = mount.querySelector('nav[aria-label="World Countries navigation"]')
    const tablist = header?.querySelector('[role="tablist"]')

    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('World Countries')
    expect(header?.textContent).not.toContain('Learn, practise and retain')
    expect(header?.className).toContain('py-2')
    expect(tablist?.className).toContain('grid-cols-2')
    expect([...tablist?.querySelectorAll('[role="tab"]') ?? []].map(tab => tab.textContent)).toEqual([
      'Drill',
      'Recite',
    ])
    expect(tablist?.querySelector('[role="button"]')).toBeNull()
    expect(mount.querySelector('[data-testid="drill-workflow"]')).not.toBeNull()
  })

  it('keeps activity tabs separate from Due review and preserves active states', async () => {
    const mount = await renderShell()
    const tablist = mount.querySelector('[role="tablist"]')
    const tabs = [...(tablist?.querySelectorAll('[role="tab"]') ?? [])] as HTMLButtonElement[]
    const dueReview = [...mount.querySelectorAll('button')]
      .find(button => button.textContent === 'Due review') as HTMLButtonElement | undefined

    expect(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(dueReview).toBeDefined()
    expect(tablist?.contains(dueReview ?? null)).toBe(false)
    expect(dueReview?.getAttribute('role')).toBeNull()
    expect(dueReview?.className).not.toContain('bg-cyan-600')

    await act(async () => tabs[1]?.click())
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false')
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(mount.querySelector('[data-testid="recite-workflow"]')).not.toBeNull()

    await act(async () => dueReview?.click())
    expect(tabs.every(tab => tab.getAttribute('aria-selected') === 'false')).toBe(true)
    expect(dueReview?.className).toContain('bg-cyan-600')
    expect(mount.querySelector('[data-testid="maintenance-workflow"]')).not.toBeNull()

    await act(async () => tabs[0]?.click())
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(dueReview?.className).not.toContain('bg-cyan-600')
    expect(mount.querySelector('[data-testid="drill-workflow"]')).not.toBeNull()
  })
})
