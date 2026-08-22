// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrillResultsRails } from './DrillResultsRails'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const useRailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

const answers = [
  { countryId: 'NO' as const, skill: 'location-to-country' as const, answer: 'Norway', correct: false, at: 1, ms: 100 },
]

function renderResults(retryFailedCountryCount: number) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onRetryFailedCountries = vi.fn()
  const onAgain = vi.fn()
  const onChangeSetup = vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(DrillResultsRails, {
      mode: 'countries',
      scopeCountries: [],
      answers,
      retryFailedCountryCount,
      onRetryFailedCountries,
      onAgain,
      onChangeSetup,
    }))
  })
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right: ReactNode }
  act(() => root?.render(createElement('div', null, config.right)))
  return { mount, onRetryFailedCountries, onAgain }
}

describe('World Countries Drill result actions', () => {
  it('puts failed-Country retry before the existing actions', () => {
    const { mount, onRetryFailedCountries, onAgain } = renderResults(2)

    expect([...mount.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Retry failed countries (2)',
      'Run again',
      'Change scope',
    ])
    act(() => mount.querySelectorAll('button')[0]?.click())
    act(() => mount.querySelectorAll('button')[1]?.click())
    expect(onRetryFailedCountries).toHaveBeenCalledOnce()
    expect(onAgain).toHaveBeenCalledOnce()
  })

  it('keeps Run again primary and hides retry after a perfect run', () => {
    const { mount } = renderResults(0)

    expect([...mount.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Run again',
      'Change scope',
    ])
  })
})
