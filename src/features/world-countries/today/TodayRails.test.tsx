// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))

import { TodayHomeRails } from './TodayRails'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

describe('World Countries Today rail rationale', () => {
  it('shows a compact reason summary for due reviews', () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    act(() => {
      root = createRoot(mount)
      root.render(createElement(TodayHomeRails, {
        activeCountryCount: 20,
        evidenceStatus: 'ready',
        dueCount: 12,
        dueCountryCount: 10,
        reviewReasonSummary: {
          mistakes: 4,
          firstRecall: 2,
          firstReviewAfterLearning: 0,
          spaced: 6,
          repeated: 2,
        },
        nextLearning: null,
        checkpoint: null,
        refreshing: false,
        caughtUp: false,
        onNavigate: vi.fn(),
      }))
    })

    const rails = useRailsMock.mock.calls[0]?.[0] as { right: ReactNode }
    act(() => {
      root?.render(createElement('div', null, rails.right))
    })

    expect(mount.textContent).toContain('Why today')
    expect(mount.textContent).toContain('4 mistakes')
    expect(mount.textContent).toContain('2 first recall')
    expect(mount.textContent).toContain('6 spaced')
    expect(mount.textContent).toContain('2 repeated difficulty')
  })
})
