// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createDrillSelection } from './drillSelection'
import { createDrillSession } from './drillSessionState'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())
const learningMapMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
}))

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: (props: Record<string, unknown>) => {
    learningMapMock(props)
    return createElement('div', { 'data-testid': 'country-learning-map' })
  },
}))

import { DrillSession } from './DrillSession'

const norway: Country = {
  id: 'NO',
  country: 'Norway',
  capital: 'Oslo',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

const sweden: Country = {
  id: 'SE',
  country: 'Sweden',
  capital: 'Stockholm',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

let root: Root | null = null

afterEach(() => {
  vi.useRealTimers()
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
  learningMapMock.mockReset()
})

describe('DrillSession map presentation', () => {
  it('keeps a Location → Country target visible without naming it', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries', countryIds: ['NO'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway],
        onAnswer: vi.fn(),
        onContinue: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    const mapProps = learningMapMock.mock.calls[0][0] as Record<string, unknown>
    expect(mapProps.highlightedCountryId).toBe('NO')
    expect(mapProps.namedCountryId).toBeNull()
    expect(mapProps.countryColorsById).toBeUndefined()
    expect(mapProps.ariaLabel).toBe('Map showing the selected location for recall without the Country name revealed')
    expect(mount.textContent).toContain('Which country is this?')
  })

  it('uses map clicks for Locate Countries practice', async () => {
    const onAnswer = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        interaction: 'location-click',
        state: createDrillSession({ mode: 'countries', countryIds: ['NO', 'SE'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway, sweden],
        onAnswer,
        onContinue: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    const initialMapProps = learningMapMock.mock.calls[0][0] as Record<string, unknown>
    expect(initialMapProps.onCountryClick).toBeTypeOf('function')
    expect(initialMapProps.highlightedCountryId).toBeNull()
    expect(initialMapProps.namedCountryId).toBeNull()
    expect(mount.textContent).toContain('Find Norway')
    expect(mount.textContent).toContain('Click the country on the map.')
    expect(mount.querySelector('input')).toBeNull()

    await act(async () => (initialMapProps.onCountryClick as (countryId: string) => void)('SE'))
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({
      countryId: 'NO',
      answer: 'Sweden',
      correct: false,
      evidenceKind: 'recognition',
    }))
    const feedbackMapProps = learningMapMock.mock.calls[learningMapMock.mock.calls.length - 1][0] as Record<string, unknown>
    expect(feedbackMapProps.highlightedCountryId).toBe('NO')
    expect(feedbackMapProps.namedCountryId).toBe('NO')
    expect(mount.textContent).toContain('That was Sweden')
  })

  it('keeps the selected scope neutral for Capital → Country until feedback', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries-from-capitals', countryIds: ['NO'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway],
        onAnswer: vi.fn(),
        onContinue: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    const mapProps = learningMapMock.mock.calls[0][0] as Record<string, unknown>
    expect(mapProps.highlightedCountryId).toBeNull()
    expect(mapProps.namedCountryId).toBeNull()
    expect(mount.textContent).toContain('Oslo')
    expect(mount.textContent).toContain('Which country has this capital?')
  })

  it('keeps the canonical Country highlighted during correction feedback', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries', countryIds: ['NO', 'SE'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway, sweden],
        onAnswer: vi.fn(),
        onContinue: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    const wrongAnswer = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Sweden'))
    await act(async () => wrongAnswer?.click())

    const mapProps = learningMapMock.mock.calls[learningMapMock.mock.calls.length - 1]?.[0] as Record<string, unknown>
    expect(mapProps.highlightedCountryId).toBe('NO')
    expect(mapProps.namedCountryId).toBe('NO')
    expect(mount.textContent).toContain('The correct country is Norway.')
  })

  it('advances promptly after correct feedback', async () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries', countryIds: ['NO'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway],
        onAnswer: vi.fn(),
        onContinue,
        onExit: vi.fn(),
      }))
    })

    await act(async () => mount.querySelector('button')?.click())
    expect(onContinue).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(499))
    expect(onContinue).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(onContinue).toHaveBeenCalledWith(true)
  })

  it('keeps incorrect feedback visible for the correction interval', async () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries', countryIds: ['NO'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway, sweden],
        onAnswer: vi.fn(),
        onContinue,
        onExit: vi.fn(),
      }))
    })

    const wrongAnswer = [...mount.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Sweden'))
    await act(async () => wrongAnswer?.click())
    await act(async () => vi.advanceTimersByTime(1799))
    expect(onContinue).not.toHaveBeenCalled()
    expect(mount.textContent).toContain('The correct country is Norway.')
    await act(async () => vi.advanceTimersByTime(1))
    expect(onContinue).toHaveBeenCalledWith(false)
  })
})
