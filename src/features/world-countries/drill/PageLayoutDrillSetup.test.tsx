// @vitest-environment jsdom

import { act, createElement, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: () => createElement('div', { 'data-testid': 'geography-map' }),
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
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
})
