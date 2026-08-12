// @vitest-environment jsdom

import { act, createElement, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { createDrillSelection } from './drillSelection'
import { DrillSetup } from './DrillSetup'
import { WorldCountriesDrill } from './WorldCountriesDrill'
import { WorldCountries } from '../WorldCountries'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.hoisted(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver
  }
})

let root: Root | null = null

beforeEach(() => {
  localStorage.removeItem('world-countries-drill-preferences')
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    text: async () => `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <g><path id="Norway"/><text id="Norway_label">Norway</text></g>
        <g><path id="Greenland"/><text id="Greenland_label">Greenland</text></g>
        <g><path id="Western_Sahara"/><text id="Western_Sahara_label">Western Sahara</text></g>
      </svg>`,
  })))
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('Drill setup PageLayout integration', () => {
  it('exposes Prepare as the default activity instead of Memo', async () => {
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

    expect([...mount.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).toEqual(['Prepare', 'Drill', 'Recite'])
    expect(mount.textContent).toContain('Continents')
    expect([...mount.querySelectorAll('[role="tab"]')].map(tab => tab.textContent)).not.toContain('Memo')
  })

  it('registers setup rails without entering an update loop', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onPracticeStart = vi.fn()

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(DrillSetup, {
            level: 'continent',
            selection: createDrillSelection('Europe', ['northern-europe']),
            mode: 'countries',
            order: 'ordered',
            hoveredGroupId: null,
            onHoverGroup: () => undefined,
            onSelectionChange: () => undefined,
            onModeChange: () => undefined,
            onOrderChange: () => undefined,
            onStart: () => undefined,
            onPracticeStart,
            onWorld: () => undefined,
            onSelectContinent: () => undefined,
          }),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Europe Drill')
    expect(mount.textContent).toContain('Drill')
    expect(mount.textContent).toContain('1 Subregion selected')
    expect(mount.textContent).toContain('Start Drill')
    const practiceInput = [...mount.querySelectorAll('input[type="radio"]')]
      .find(input => (input as HTMLInputElement).value === 'capitals') as HTMLInputElement | undefined
    await act(async () => practiceInput?.click())
    const practiceStartButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent === 'Start practise') as HTMLButtonElement | undefined
    expect(practiceStartButton?.disabled).toBe(false)
    await act(async () => practiceStartButton?.click())
    expect(onPracticeStart).toHaveBeenCalledWith('capitals')
    expect(mount.textContent).toContain('Learn Countries')
    const currentDrill = mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(currentDrill?.parentElement?.parentElement?.className).toContain('xl:block')
  })

  it('keeps the real Drill coordinator stable while PageLayout publishes rails', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(SettingsProvider, null,
          createElement(PageLayoutProvider, null,
            createElement(PageLayout, null,
              createElement(WorldCountriesDrill, { answerMode: 'typing' }),
            ),
          ),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('World Countries Drill')
    expect(mount.querySelector('#world-countries-drill-heading')).toBeNull()
  })

  it('switches from Prepare to Drill without looping through rail cleanup', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(SettingsProvider, null,
          createElement(PageLayoutProvider, null,
            createElement(PageLayout, null,
              createElement(WorldCountries, { answerMode: 'typing' }),
            ),
          ),
        ),
      ))
      await Promise.resolve()
    })

    const drillTab = [...mount.querySelectorAll('button')]
      .find(button => button.textContent === 'Drill')
    await act(async () => drillTab?.click())
    expect(mount.querySelector('#world-countries-drill-heading')).toBeNull()
  })

  it('keeps the Continent Prepare rails stable while the layout publishes them', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(SettingsProvider, null,
          createElement(PageLayoutProvider, null,
            createElement(PageLayout, null,
              createElement(WorldCountries, { answerMode: 'typing' }),
            ),
          ),
        ),
      ))
      await Promise.resolve()
      await Promise.resolve()
    })

    const europeButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Europe'))
    expect(europeButton).not.toBeUndefined()

    await act(async () => {
      europeButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Subregions')

    const northernEuropeButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Northern Europe'))
    expect(northernEuropeButton).not.toBeUndefined()

    await act(async () => {
      northernEuropeButton?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Northern Europe')
  })

  it('keeps the real map, rails, drawers, and all four modes synchronized', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(StrictMode, null,
        createElement(SettingsProvider, null,
          createElement(PageLayoutProvider, null,
            createElement(PageLayout, null,
              createElement(WorldCountriesDrill, { answerMode: 'typing' }),
            ),
          ),
        ),
      ))
      await Promise.resolve()
      await Promise.resolve()
    })

    const leftDrawerToggle = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Drill scope'))
    await act(async () => leftDrawerToggle?.click())
    const leftDrawer = mount.querySelector('[role="dialog"][aria-label="Drill scope"]')
    expect(leftDrawer).not.toBeNull()
    expect(leftDrawer?.querySelector('legend')).toBeNull()
    expect(leftDrawer?.querySelector('h2')).toBeNull()
    expect(leftDrawer?.textContent).toContain('Geography')
    const modeInputs = [...(leftDrawer?.querySelectorAll('input[type="radio"]') ?? [])] as HTMLInputElement[]
    expect(modeInputs).toHaveLength(0)
    const renderedModeGroups = [...mount.querySelectorAll('fieldset')]
      .filter(fieldset => fieldset.querySelector('input[type="radio"]'))
    expect(renderedModeGroups).toHaveLength(1)
    expect(new Set(renderedModeGroups.map(group => group.querySelector('input[type="radio"]')?.getAttribute('name'))).size).toBe(1)
    expect(renderedModeGroups.every(group => [...group.querySelectorAll('input[type="radio"]')].every(input => input.getAttribute('aria-describedby')))).toBe(true)
    const closeButton = mount.querySelector('[role="dialog"] button[aria-label="Close"]')
    await act(async () => (closeButton as HTMLButtonElement | null)?.click())

    const europeButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.startsWith('Europe'))
    await act(async () => europeButton?.click())
    await Promise.resolve()
    await Promise.resolve()

    const map = mount.querySelector('[role="img"][aria-label="Europe map for choosing Drill Subregions"]')
    expect(map).not.toBeNull()
    const norway = map?.querySelector('path#Norway')
    expect(norway).not.toBeNull()

    await act(async () => norway?.dispatchEvent(new Event('pointerenter', { bubbles: true })))
    const northernEurope = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Northern Europe'))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('false')
    expect(northernEurope?.className).toContain('border-cyan-500')

    await act(async () => norway?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('true')
    await act(async () => norway?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('false')
    await act(async () => norway?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('true')
    const scopePanel = mount.querySelector('[aria-labelledby="world-countries-drill-scope-heading"]')
    expect(scopePanel?.textContent).toContain('Scope')
    expect(scopePanel?.textContent).toContain('1 Subregion selected')

    for (const value of ['countries', 'countries-capitals', 'countries-from-capitals']) {
      const modeInput = [...(mount.querySelector('fieldset')?.querySelectorAll('input[type="radio"]') ?? [])]
        .find(input => (input as HTMLInputElement).value === value) as HTMLInputElement | undefined
      await act(async () => modeInput?.click())
      expect(modeInput?.checked).toBe(true)
    }

    const modeSection = mount.querySelector('fieldset')
    expect(modeSection?.textContent).toContain('Drill')
    const currentDrill = mount.querySelector('[aria-labelledby="world-countries-current-drill-heading"]')
    expect(currentDrill?.textContent).not.toContain('Scope')
    const practicePanel = [...mount.querySelectorAll('section')]
      .find(section => section.querySelector('h2')?.textContent === 'Learn and Practise')
    expect(practicePanel?.textContent).toContain('Learn and Practise')
    expect(practicePanel?.textContent).toContain('Learn Countries')
    expect(practicePanel?.textContent).toContain('Locate Countries')
    const capitalsInput = [...mount.querySelectorAll('input[type="radio"]')]
      .find(input => (input as HTMLInputElement).value === 'capitals') as HTMLInputElement | undefined
    const descriptionId = capitalsInput?.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(practicePanel?.querySelector(`[id="${descriptionId}"][role="tooltip"]`)?.textContent).toBe('Practise capitals before Countries + Capitals.')
    await act(async () => capitalsInput?.click())
    const currentDrillModeInput = [...(mount.querySelector('fieldset')?.querySelectorAll('input[type="radio"]') ?? [])]
      .find(input => (input as HTMLInputElement).value === 'countries-from-capitals') as HTMLInputElement | undefined
    expect(currentDrillModeInput?.checked).toBe(true)
    const selectedPracticeInput = [...mount.querySelectorAll('input[type="radio"]')]
      .find(input => (input as HTMLInputElement).value === 'capitals' && (input as HTMLInputElement).name.includes('practice-mode')) as HTMLInputElement | undefined
    expect(selectedPracticeInput?.checked).toBe(true)
    const practiceStartButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent === 'Start practise') as HTMLButtonElement | undefined
    expect(practiceStartButton?.disabled).toBe(false)

    const rightDrawerToggle = [...mount.querySelectorAll('button')]
      .find(button => {
        const label = button.textContent?.trim() ?? ''
        return label.endsWith('Drill') && label !== 'Drill'
      })
    await act(async () => rightDrawerToggle?.click())
    const rightDrawer = mount.querySelector('[role="dialog"][aria-label="Drill"]')
    expect(rightDrawer).not.toBeNull()
    expect(rightDrawer?.querySelectorAll('input[type="radio"]')).toHaveLength(6)
  })
})
