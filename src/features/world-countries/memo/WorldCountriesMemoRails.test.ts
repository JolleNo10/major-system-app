// @vitest-environment jsdom

import { act, createElement, isValidElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
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

  it('keeps the Subregion mnemonic for Country learning and moves Capital mnemonics to the appropriate rail phase', async () => {
    const entry: Country = {
      id: 'NO',
      country: 'Norway',
      capital: 'Oslo',
      continent: 'Europe',
      subregionId: 'northern-europe',
      subregion: 'Northern Europe',
    }
    const mount = document.createElement('div')
    document.body.append(mount)
    const baseProps = {
      phase: 'walkthrough' as const,
      navigation: {
        continent: 'Europe' as const,
        subregion: 'northern-europe' as const,
        onWorld: vi.fn(),
        onContinent: vi.fn(),
        nextSubregion: null,
        onSelectSubregion: vi.fn(),
      },
      content: {
        entries: [entry],
        learned: false,
        capitalsLearned: false,
        track: 'countries' as const,
        capitalWalkthroughCountryId: 'NO',
        capitalRecallCorrectionCountryId: null,
        mnemonicVersion: 0,
        onMnemonicChanged: vi.fn(),
      },
      onEditOrder: vi.fn(),
    }

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, baseProps))
    })
    expect((useRailsMock.mock.calls[0][0] as { right?: ReactNode }).right).toBeTruthy()

    useRailsMock.mockReset()
    await act(async () => {
      root?.render(createElement(SubregionOverviewRails, {
        ...baseProps,
        content: { ...baseProps.content, track: 'capitals' as const },
      }))
    })
    const capitalRight = (useRailsMock.mock.calls[0][0] as { right?: ReactNode }).right
    expect(capitalRight).toBeTruthy()
    expect(findTargetId(capitalRight)).toBe('geo:country-capital:NO')

    useRailsMock.mockReset()
    await act(async () => {
      root?.render(createElement(SubregionOverviewRails, {
        ...baseProps,
        phase: 'recall' as const,
        content: { ...baseProps.content, track: 'capitals' as const, capitalRecallCorrectionCountryId: 'NO' },
      }))
    })
    const correctionRight = (useRailsMock.mock.calls[0][0] as { right?: ReactNode }).right
    expect(correctionRight).toBeTruthy()
    expect(findTargetId(correctionRight)).toBe('geo:country-capital:NO')

    useRailsMock.mockReset()
    await act(async () => {
      root?.render(createElement(SubregionOverviewRails, {
        ...baseProps,
        phase: 'recall' as const,
        content: { ...baseProps.content, track: 'capitals' as const },
      }))
    })
    expect((useRailsMock.mock.calls[0][0] as { right?: ReactNode }).right).toBeUndefined()
  })

  it('shows both completion tracks in the overview learning status', async () => {
    const entry: Country = {
      id: 'NO',
      country: 'Norway',
      capital: 'Oslo',
      continent: 'Europe',
      subregionId: 'northern-europe',
      subregion: 'Northern Europe',
    }
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'overview' as const,
        navigation: {
          continent: 'Europe' as const,
          subregion: 'northern-europe' as const,
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: null,
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [entry],
          learned: true,
          capitalsLearned: true,
          track: 'countries' as const,
          capitalWalkthroughCountryId: null,
          capitalRecallCorrectionCountryId: null,
          mnemonicVersion: 0,
          onMnemonicChanged: vi.fn(),
        },
        onEditOrder: vi.fn(),
      }))
    })

    const railConfig = useRailsMock.mock.calls[0][0] as { left: ReactNode }
    await act(async () => {
      root?.render(railConfig.left)
    })

    expect(mount.textContent).toContain('Countries learned ✓')
    expect(mount.textContent).toContain('Capitals learned ✓')
  })

  it('offers the first unlearned subregion from the right rail', async () => {
    const onSelectSubregion = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'overview' as const,
        navigation: {
          continent: 'Europe' as const,
          subregion: 'balkans' as const,
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
          onSelectSubregion,
        },
        content: {
          entries: [],
          learned: false,
          capitalsLearned: false,
          track: 'countries' as const,
          capitalWalkthroughCountryId: null,
          capitalRecallCorrectionCountryId: null,
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

  it('hides the next-to-memo panel for the current next subregion', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'overview' as const,
        navigation: {
          continent: 'Europe' as const,
          subregion: 'balkans' as const,
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: { id: 'balkans', label: 'Balkans', continent: 'Europe' },
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [],
          learned: false,
          capitalsLearned: false,
          track: 'countries' as const,
          capitalWalkthroughCountryId: null,
          capitalRecallCorrectionCountryId: null,
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

  it('hides the next-to-memo action during active subregion learning', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(SubregionOverviewRails, {
        phase: 'walkthrough' as const,
        navigation: {
          continent: 'Europe' as const,
          subregion: 'balkans' as const,
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: { id: 'northern-europe', label: 'Northern Europe', continent: 'Europe' },
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [],
          learned: false,
          capitalsLearned: false,
          track: 'countries' as const,
          capitalWalkthroughCountryId: null,
          capitalRecallCorrectionCountryId: null,
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
        phase: 'overview' as const,
        navigation: {
          continent: 'Europe' as const,
          subregion: 'balkans' as const,
          onWorld: vi.fn(),
          onContinent: vi.fn(),
          nextSubregion: null,
          onSelectSubregion: vi.fn(),
        },
        content: {
          entries: [],
          learned: true,
          capitalsLearned: false,
          track: 'countries' as const,
          capitalWalkthroughCountryId: null,
          capitalRecallCorrectionCountryId: null,
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

function findTargetId(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const targetId = findTargetId(child)
      if (targetId) return targetId
    }
    return undefined
  }
  if (!isValidElement(node)) return undefined
  const props = node.props as { targetId?: unknown; children?: ReactNode }
  if (typeof props.targetId === 'string') return props.targetId
  return findTargetId(props.children)
}
