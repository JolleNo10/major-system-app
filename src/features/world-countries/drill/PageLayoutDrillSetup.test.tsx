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
  it('registers setup rails without entering an update loop', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(DrillSetup, {
            level: 'continent',
            selection: createDrillSelection('Europe', ['northern-europe']),
            mode: 'countries',
            hoveredGroupId: null,
            onHoverGroup: () => undefined,
            onSelectionChange: () => undefined,
            onModeChange: () => undefined,
            onStart: () => undefined,
            onWorld: () => undefined,
            onSelectContinent: () => undefined,
          }),
        ),
      ))
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Europe Drill')
    expect(mount.textContent).toContain('Current drill')
    expect(mount.textContent).toContain('1 Subregion selected')
    expect(mount.textContent).toContain('Start Drill')
    const drillControls = mount.querySelector('#world-countries-drill-controls-heading')?.closest('section')
    expect(drillControls?.textContent).not.toContain('Current drill')
    expect(drillControls?.textContent).not.toContain('Start Drill')
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

    expect(mount.textContent).toContain('Choose a Continent')
  })

  it('switches from Memo to Drill without looping through rail cleanup', async () => {
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
    expect(mount.textContent).toContain('Choose a Continent')
  })

  it('keeps the Continent Memo rails stable while the layout publishes them', async () => {
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
      .find(button => button.textContent?.trim().startsWith('Europe'))
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
      .find(button => button.textContent?.includes('Drill geography'))
    await act(async () => leftDrawerToggle?.click())
    expect(mount.querySelector('[role="dialog"][aria-label="Drill geography"]')).not.toBeNull()
    const closeButton = mount.querySelector('[role="dialog"] button[aria-label="Close"]')
    await act(async () => (closeButton as HTMLButtonElement | null)?.click())

    const europeButton = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Europe')
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
    expect(northernEurope?.className).toContain('border-cyan-500')

    await act(async () => norway?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('false')
    await act(async () => norway?.dispatchEvent(new Event('click', { bubbles: true })))
    expect(northernEurope?.getAttribute('aria-pressed')).toBe('true')

    for (const label of ['Countries', 'Countries + Capitals', 'Capitals', 'Countries from Capitals']) {
      const modeButton = [...mount.querySelectorAll('button')]
        .find(button => button.querySelector('span')?.textContent === label)
      await act(async () => modeButton?.click())
      expect(modeButton?.getAttribute('aria-pressed')).toBe('true')
    }

    const headings = [...mount.querySelectorAll('h3')]
    const recallModesHeading = headings.find(heading => heading.textContent === 'Recall modes')
    const practiceHeading = headings.find(heading => heading.textContent === 'Practice')
    const buttonLabelsUnder = (heading: Element | undefined) => [...(heading?.parentElement?.querySelectorAll('button') ?? [])]
      .map(button => button.querySelector('span')?.textContent)

    expect(buttonLabelsUnder(recallModesHeading)).toEqual([
      'Countries',
      'Countries + Capitals',
      'Countries from Capitals',
    ])
    expect(buttonLabelsUnder(practiceHeading)).toEqual(['Capitals'])
    expect(practiceHeading?.parentElement?.textContent).toContain('Practise capitals before Countries + Capitals.')

    const rightDrawerToggle = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Drill controls'))
    await act(async () => rightDrawerToggle?.click())
    expect(mount.querySelector('[role="dialog"][aria-label="Drill controls"]')).not.toBeNull()
  })
})
