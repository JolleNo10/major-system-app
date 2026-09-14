// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { CountryLearningComplete } from './CountryLearningComplete'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('CountryLearningComplete', () => {
  it('describes durable Country Learning as learned without claiming mastery', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningComplete, {
        subregion: 'balkans',
        countryCount: 5,
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Countries learned')
    expect(mount.textContent).toContain('Balkans countries learned ✓')
    expect(mount.textContent).toContain('You can now locate and recall all 5 countries')
    expect(mount.textContent).not.toContain('mastery')
  })

  it('explains that a proficiency scope does not change guided region progress', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningComplete, {
        scopeLabel: 'Proficiency scope',
        countryCount: 2,
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Learning complete')
    expect(mount.textContent).toContain("doesn't change your guided region progress")
    expect(mount.textContent).not.toContain('Countries learned')
  })

  it('presents Region learned when Country Learning establishes the final layer', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onAction = vi.fn()

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(CountryLearningComplete, {
        subregion: 'balkans',
        countryCount: 5,
        regionCompletion: { masteryStatus: 'building' },
        completedRegionAction: { label: 'Drill Balkans', onAction },
        onDone: () => undefined,
        onRestart: () => undefined,
      }))
    })

    expect(mount.textContent).toContain('Region learned')
    expect(mount.textContent).toContain('Balkans ✓')
    expect(mount.textContent).toContain('Countries ✓')
    expect(mount.textContent).toContain('Capitals ✓')
    expect(mount.textContent).toContain('Mastery Building')
    expect(mount.textContent).not.toContain('Countries learned')
    expect(mount.textContent).toContain('Drill Balkans')
    expect(mount.textContent).not.toContain('Learn again')

    act(() => mount.querySelector<HTMLButtonElement>('[data-completion-region-action]')?.click())
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('keeps a non-durable Relearn celebration without exposing durable completion semantics', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(PageLayoutProvider, null,
        createElement(MapSurface, {
          context: createElement('span', null, 'Learning context'),
          map: createElement('span', null, 'map'),
          dock: createElement(CountryLearningComplete, {
            subregion: 'balkans',
            countryCount: 5,
            recordCompletion: false,
            completionCelebration: 'subregion',
            regionCompletion: { masteryStatus: 'building' },
            completionHandoff: { description: 'Continue the Journey', label: 'Continue', onContinue: vi.fn() },
            completedRegionAction: { label: 'Drill Balkans', onAction: vi.fn() },
            onDone: vi.fn(),
            onRestart: vi.fn(),
            surface: true,
          }),
        }),
      ))
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-celebration-level="subregion"]')).not.toBeNull()
    expect(mount.textContent).toContain("doesn't change your guided region progress")
    expect(mount.textContent).not.toContain('Region learned')
    expect(mount.textContent).not.toContain('Continue the Journey')
    expect(mount.querySelector('[data-completion-region-action]')).toBeNull()
  })
})
