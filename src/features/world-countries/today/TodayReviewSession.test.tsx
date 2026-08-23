// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesReviewSchedule } from '@/features/world-countries/learning/reviewSchedule'

const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const useRailsMock = vi.hoisted(() => vi.fn())
const countryLearningMapMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/world-countries/learning/recallProgress', () => ({
  recordWorldCountriesAttempt: recordAttemptMock,
}))
vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
  usePageLayoutPresentation: vi.fn(),
}))
vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: (props: Record<string, unknown>) => {
    countryLearningMapMock(props)
    return createElement('div', { 'data-testid': 'today-map' })
  },
}))

import { TodayReviewSession } from './TodayReviewSession'

let root: Root | null = null
let railRoot: Root | null = null

function renderRails(mount: HTMLElement): void {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode; right?: ReactNode } | undefined
  act(() => {
    railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.left, config?.right))
  })
}

afterEach(() => {
  act(() => root?.unmount())
  act(() => railRoot?.unmount())
  root = null
  railRoot = null
  document.body.replaceChildren()
  recordAttemptMock.mockClear()
  useRailsMock.mockReset()
  countryLearningMapMock.mockReset()
  vi.useRealTimers()
})

function candidate(countryId: string, skill: 'location-to-country' | 'country-to-capital' = 'location-to-country') {
  const country = countries.find(entry => entry.id === countryId)!
  return {
    country,
    target: { countryId, skill },
    schedule: deriveWorldCountriesReviewSchedule([{ at: 1, ok: false, ms: 1 }], { localDate: '2026-08-19' }),
  }
}

describe('Today review session', () => {
  it('hides the location answer until feedback and records typed recall evidence', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const done = vi.fn()
    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(TodayReviewSession, {
        candidates: [candidate('NO'), candidate('SE'), candidate('FI')],
        activeCountries: countries.filter(country => ['NO', 'SE', 'FI'].includes(country.id)),
        fuzzyMatching: false,
        onDone: done,
        onExit: vi.fn(),
      }))
    })

    expect(mount.textContent).not.toContain('Norway')
    expect(countryLearningMapMock.mock.calls[0]?.[0]).toMatchObject({ taskTargetCountryId: 'NO' })
    const input = mount.querySelector<HTMLInputElement>('input[aria-label="Type the Country name"]')!
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(input, 'Sweden')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(recordAttemptMock).toHaveBeenCalledWith('NO', 'location-to-country', expect.objectContaining({ ok: false, evidenceKind: 'recall' }))
    expect(mount.textContent).toContain('The correct answer is Norway.')
    expect(mount.textContent).not.toContain('Skip for now')
    expect(mount.querySelector('[data-answer-kind]')?.getAttribute('data-answer-kind')).toBe('country')
    expect(mount.textContent).toContain('ANSWER · COUNTRY')
  })

  it('uses the Capital cue for Country-to-Capital review prompts', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(TodayReviewSession, {
        candidates: [candidate('NO', 'country-to-capital')],
        activeCountries: countries.filter(country => ['NO', 'SE', 'FI'].includes(country.id)),
        fuzzyMatching: false,
        onDone: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    expect(mount.querySelector('[data-answer-kind]')?.getAttribute('data-answer-kind')).toBe('capital')
    expect(mount.textContent).toContain('ANSWER · CAPITAL')
  })

  it('keeps review workflow state in the rails without revealing a hidden Country', async () => {
    const mount = document.createElement('div')
    const railMount = document.createElement('div')
    document.body.append(mount, railMount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(TodayReviewSession, {
        candidates: [candidate('NO'), candidate('SE'), candidate('FI')],
        activeCountries: countries.filter(country => ['NO', 'SE', 'FI'].includes(country.id)),
        fuzzyMatching: false,
        onDone: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    renderRails(railMount)
    expect(railMount.textContent).toContain('World')
    expect(railMount.textContent).toContain('Europe')
    expect(railMount.textContent).toContain('Northern Europe')
    expect(railMount.textContent).toContain('Review progress')
    expect(railMount.textContent).toContain('Exit Review')
    expect(mount.textContent).not.toContain('Exit Review')
    expect(mount.textContent).not.toContain('Northern Europe')
    expect(mount.textContent).not.toContain('Norway')
  })
})
