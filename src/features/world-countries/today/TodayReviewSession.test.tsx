// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesReviewSchedule } from '@/features/world-countries/learning/reviewSchedule'

const recordAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@/features/world-countries/learning/recallProgress', () => ({
  recordWorldCountriesAttempt: recordAttemptMock,
}))
vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => createElement('div', { 'data-testid': 'today-map' }),
}))

import { TodayReviewSession } from './TodayReviewSession'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  recordAttemptMock.mockClear()
})

function candidate(countryId: string) {
  const country = countries.find(entry => entry.id === countryId)!
  return {
    country,
    target: { countryId, skill: 'location-to-country' as const },
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
    const input = mount.querySelector<HTMLInputElement>('#today-review-answer')!
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(input, 'Sweden')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(recordAttemptMock).toHaveBeenCalledWith('NO', 'location-to-country', expect.objectContaining({ ok: false, evidenceKind: 'recall' }))
    expect(mount.textContent).toContain('Norway')
    expect(mount.textContent).toContain('Skip for now')
  })
})
