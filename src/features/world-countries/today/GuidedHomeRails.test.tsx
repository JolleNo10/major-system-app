// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuidedHomeRails } from './GuidedHomeRails'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))

let root: Root | null = null
let railRoot: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  act(() => railRoot?.unmount())
  railRoot = null
  useRailsMock.mockClear()
  document.body.replaceChildren()
})

function renderRails(overrides: Partial<Parameters<typeof GuidedHomeRails>[0]> = {}) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const props: Parameters<typeof GuidedHomeRails>[0] = {
    level: 'world',
    activeCountryCount: 1,
    evidenceStatus: 'ready',
    dueCount: 0,
    dueCountryCount: 0,
    reviewReasonSummary: { mistakes: 0, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
    nextLearning: null,
    journey: null,
    refreshing: false,
    caughtUp: true,
    scopeSummaries: [],
    onWorld: vi.fn(),
    onOpenPlay: vi.fn(),
    onOpenProgress: vi.fn(),
    ...overrides,
  }
  root = createRoot(mount)
  act(() => root?.render(createElement(GuidedHomeRails, props)))
  const rails = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right?: ReactNode } | undefined
  const railMount = document.createElement('div')
  document.body.append(railMount)
  railRoot = createRoot(railMount)
  act(() => railRoot?.render(rails?.right ?? null))
  return railMount
}

describe('Guided World Countries home status', () => {
  it('keeps a stable loading shell', () => {
    const mount = renderRails({ evidenceStatus: 'loading', caughtUp: false })
    expect(mount.textContent).toContain('Guided status loading')
    expect(mount.textContent).toContain('Retained recall evidence is loading')
  })

  it('explains evidence failure while leaving Play available', () => {
    const mount = renderRails({ evidenceStatus: 'error', caughtUp: false })
    expect(mount.textContent).toContain('Guided status unavailable')
    expect(mount.textContent).toContain('Freeform Play remains available')
    expect(mount.textContent).toContain('Play and progress')
  })

  it('renders the zero-active-Country state', () => {
    const mount = renderRails({ activeCountryCount: 0, caughtUp: false })
    expect(mount.textContent).toContain('0 Countries active')
    expect(mount.textContent).toContain('No active Countries are available')
  })

  it('renders a caught-up state without an actionable Continue control', () => {
    const mount = renderRails()
    expect(mount.textContent).toContain('All caught up')
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })
})
