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

import { WorldOverviewRails } from './WorldCountriesMemoRails'

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
})
