// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getContinentHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import type { MemoProgress } from './memoProgress'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
}))

vi.mock('./MemoMnemonicCard', () => ({
  MemoMnemonicCard: () => createElement('div', null, 'Memory aid'),
}))

import { ContinentOverviewRails, SubregionOverviewRails, WorldOverviewRails } from './WorldCountriesMemoRails'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

describe('World Countries Memo hierarchy rail rows', () => {
  it('synchronizes mouse and keyboard hover without using aria-current', async () => {
    const onHoverGroup = vi.fn()
    const progress: MemoProgress = {
      memoedCount: 0,
      totalCount: 1,
      remainingCount: 1,
      ratio: 0,
      status: 'not-started',
    }
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldOverviewRails, {
        continents: ['Europe'],
        memoedCountryIds: new Set<string>(),
        progress,
        hoveredGroupId: null,
        onSelectContinent: vi.fn(),
        onHoverGroup,
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => {
      root?.render(railConfig.left)
    })

    const button = mount.querySelector('button')
    expect(button).not.toBeNull()
    expect(button?.hasAttribute('aria-current')).toBe(false)

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith(getContinentHoverGroupId('Europe'))

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith(null)

    await act(async () => {
      button?.focus()
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith(getContinentHoverGroupId('Europe'))

    await act(async () => {
      button?.blur()
    })
    expect(onHoverGroup).toHaveBeenLastCalledWith(null)
  })

  it('offers the first unlearned subregion from the right rail', async () => {
    const onSelectSubregion = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'overview',
        navigation: {
          continent: 'Europe',
          subregion: 'balkans',
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
          onSelectSubregion,
        },
        content: {
          entries: [],
          learned: false,
          mnemonicVersion: 0,
          onMnemonicChanged: vi.fn(),
        },
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => {
      root?.render(railConfig.right)
    })

    expect(mount.textContent).toContain('Northern Europe')
    const button = [...mount.querySelectorAll('button')].find(candidate => candidate.textContent === 'Open subregion →')
    expect(button).not.toBeNull()

    await act(async () => {
      button?.click()
    })
    expect(onSelectSubregion).toHaveBeenCalledWith('northern-europe')
  })

  it('offers the next unlearned subregion from the continent overview right rail', async () => {
    const onSelectSubregion = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(ContinentOverviewRails, {
        continent: 'Europe',
        subregions: [
          { id: 'balkans', label: 'Balkans', continent: 'Europe' },
          { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
        ],
        memoedCountryIds: new Set<string>(),
        progress: {
          memoedCount: 0,
          totalCount: 1,
          remainingCount: 1,
          ratio: 0,
          status: 'not-started',
        },
        hoveredGroupId: null,
        onWorld: vi.fn(),
        onSelectSubregion,
        onHoverGroup: vi.fn(),
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => {
      root?.render(railConfig.right)
    })

    expect(mount.textContent).toContain('Balkans')
    const button = [...mount.querySelectorAll('button')].find(candidate => candidate.textContent === 'Open subregion →')
    expect(button).not.toBeNull()

    await act(async () => {
      button?.click()
    })
    expect(onSelectSubregion).toHaveBeenCalledWith('balkans')
  })

  it('hides the next-to-memo action during active subregion learning', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'walkthrough',
        navigation: {
          continent: 'Europe',
          subregion: 'balkans',
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [],
          learned: false,
          mnemonicVersion: 0,
          onMnemonicChanged: vi.fn(),
        },
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => {
      root?.render(railConfig.right)
    })

    expect(mount.textContent).not.toContain('Next to memo')
    expect(mount.textContent).toContain('Memory aid')
  })

  it('disables the next-to-memo action when every subregion is learned', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'overview',
        navigation: {
          continent: 'Europe',
          subregion: 'balkans',
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: null,
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [],
          learned: true,
          mnemonicVersion: 0,
          onMnemonicChanged: vi.fn(),
        },
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { right: ReactNode }
    await act(async () => {
      root?.render(railConfig.right)
    })

    const button = [...mount.querySelectorAll('button')].find(candidate => candidate.textContent === 'All subregions learned')
    expect(button?.disabled).toBe(true)
  })
})
