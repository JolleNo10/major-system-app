// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createDrillSelection } from './drillSelection'
import { createDrillSession } from './drillSessionState'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())
const learningMapMock = vi.hoisted(() => vi.fn())
const countryCapitalPanelMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({
  useRails: useRailsMock,
  usePageLayoutPresentation: vi.fn(),
}))

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: (props: Record<string, unknown>) => {
    learningMapMock(props)
    return createElement('div', { 'data-testid': 'country-learning-map' })
  },
}))

vi.mock('@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel', () => ({
  CountryCapitalMnemonicPanel: (props: Record<string, unknown>) => {
    countryCapitalPanelMock(props)
    const country = props.country as Country
    return createElement('article', { 'data-testid': 'country-capital-mnemonic' }, `${country.country} ↔ ${country.capital}`)
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

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

let root: Root | null = null
let railRoot: Root | null = null

function renderRightRail(mount: HTMLElement): void {
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { right?: ReactNode } | undefined
  act(() => {
    if (!railRoot) railRoot = createRoot(mount)
    railRoot.render(createElement('div', null, config?.right))
  })
}

afterEach(() => {
  vi.useRealTimers()
  act(() => root?.unmount())
  act(() => railRoot?.unmount())
  root = null
  railRoot = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
  learningMapMock.mockReset()
  countryCapitalPanelMock.mockReset()
})

describe('DrillSession map presentation', () => {
  it('offers mnemonic editing for each single-Country Drill skill without leaking the answer', async () => {
    const mount = document.createElement('div')
    const railMount = document.createElement('div')
    document.body.append(mount, railMount)

    for (const mode of ['countries', 'countries-capitals', 'countries-from-capitals'] as const) {
      await act(async () => {
        root = root ?? createRoot(mount)
        root.render(createElement(DrillSession, {
          answerMode: 'multiple-choice',
          fuzzyMatching: false,
          state: createDrillSession({ mode, countryIds: ['NO'] }),
          selection: createDrillSelection('Europe', ['northern-europe']),
          entries: [norway],
          onAnswer: vi.fn(),
          onContinue: vi.fn(),
          onExit: vi.fn(),
        }))
      })

      renderRightRail(railMount)
      expect(railMount.textContent).toContain('Show mnemonics')
      expect(railMount.textContent).not.toContain('Norway')
      expect(railMount.textContent).not.toContain('Oslo')
    }
  })

  it('marks only the assisted question, changes mnemonic Country with the question, and pauses auto-advance until close', async () => {
    vi.useFakeTimers()
    const onAnswer = vi.fn()
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    const railMount = document.createElement('div')
    document.body.append(mount, railMount)
    const firstState = createDrillSession({ mode: 'countries', countryIds: ['NO', 'SE'] })

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        state: firstState,
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway, sweden],
        onAnswer,
        onContinue,
        onExit: vi.fn(),
      }))
    })

    renderRightRail(railMount)
    await act(async () => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'Show mnemonics')?.click())
    renderRightRail(railMount)
    expect(railMount.textContent).toContain('Norway ↔ Oslo')
    expect(countryCapitalPanelMock).toHaveBeenCalledWith(expect.objectContaining({ country: norway }))

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Norway'))?.click())
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ countryId: 'NO', assisted: true, correct: true }))

    await act(async () => vi.advanceTimersByTime(500))
    expect(onContinue).not.toHaveBeenCalled()

    renderRightRail(railMount)
    await act(async () => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'Hide mnemonics')?.click())
    await act(async () => vi.advanceTimersByTime(500))
    expect(onContinue).toHaveBeenCalledWith(true)

    const nextState = createDrillSession({ mode: 'countries', countryIds: ['SE'] })
    await act(async () => root?.render(createElement(DrillSession, {
      answerMode: 'multiple-choice',
      fuzzyMatching: false,
      state: nextState,
      selection: createDrillSelection('Europe', ['northern-europe']),
      entries: [norway, sweden],
      onAnswer,
      onContinue,
      onExit: vi.fn(),
    })))

    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Sweden'))?.click())
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ countryId: 'SE', correct: true }))
    expect(onAnswer.mock.calls[onAnswer.mock.calls.length - 1]?.[0]).not.toHaveProperty('assisted')

    renderRightRail(railMount)
    await act(async () => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent === 'Show mnemonics')?.click())
    renderRightRail(railMount)
    expect(countryCapitalPanelMock).toHaveBeenLastCalledWith(expect.objectContaining({ country: sweden }))
  })

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
    expect(mapProps.taskTargetCountryId).toBe('NO')
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
    expect(initialMapProps.answerSelectionCountryIds).toEqual(['NO', 'SE'])
    expect(initialMapProps.taskTargetCountryId).toBeNull()
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
    expect(feedbackMapProps.taskTargetCountryId).toBe('NO')
    expect(feedbackMapProps.namedCountryId).toBe('NO')
    expect(mount.textContent).toContain('That was Sweden')
  })

  it('uses the capital as the target for Locate Capitals practice', async () => {
    const onAnswer = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'multiple-choice',
        fuzzyMatching: false,
        interaction: 'location-click',
        activity: 'practice',
        state: createDrillSession({ mode: 'countries-from-capitals', countryIds: ['NO', 'SE'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway, sweden],
        onAnswer,
        onContinue: vi.fn(),
        onExit: vi.fn(),
      }))
    })

    const initialMapProps = learningMapMock.mock.calls[0][0] as Record<string, unknown>
    expect(initialMapProps.onCountryClick).toBeTypeOf('function')
    expect(initialMapProps.answerSelectionCountryIds).toEqual(['NO', 'SE'])
    expect(initialMapProps.taskTargetCountryId).toBeNull()
    expect(initialMapProps.highlightedCountryId).toBeNull()
    expect(initialMapProps.namedCountryId).toBeNull()
    expect(initialMapProps.ariaLabel).toBe('Map for clicking the Country whose Capital is shown')
    expect(mount.textContent).toContain('Oslo')
    expect(mount.textContent).toContain('Which country has this capital?')
    expect(mount.textContent).toContain('Click the country on the map.')
    expect(mount.querySelector('input')).toBeNull()

    await act(async () => (initialMapProps.onCountryClick as (countryId: string) => void)('SE'))
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({
      countryId: 'NO',
      skill: 'capital-to-country',
      answer: 'Sweden',
      correct: false,
      evidenceKind: 'recognition',
    }))
    const feedbackMapProps = learningMapMock.mock.calls[learningMapMock.mock.calls.length - 1][0] as Record<string, unknown>
    expect(feedbackMapProps.highlightedCountryId).toBe('NO')
    expect(feedbackMapProps.taskTargetCountryId).toBe('NO')
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

    await act(async () => mount.querySelector<HTMLButtonElement>('button:not([aria-label="Expand map"])')?.click())
    expect(onContinue).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(499))
    expect(onContinue).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(onContinue).toHaveBeenCalledWith(true)
  })

  it('waits for explicit continuation after a fuzzy spelling answer', async () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'typing',
        fuzzyMatching: true,
        state: createDrillSession({ mode: 'countries', skills: ['country-to-capital'], countryIds: ['SE'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [sweden],
        onAnswer: vi.fn(),
        onContinue,
        onExit: vi.fn(),
        activity: 'practice',
      }))
    })

    const input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Stockholmm'))
    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Check'))?.click())

    expect(input.disabled).toBe(true)
    expect(mount.textContent).toContain('Spelling: Stockholm')

    expect(onContinue).not.toHaveBeenCalled()
    expect(input.disabled).toBe(true)
    expect(document.activeElement).toBe(mount.querySelector('[data-fuzzy-spelling-action="practice"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())
    const miniPractice = mount.querySelector<HTMLElement>('[data-mini-spelling-practice]')!

    expect(miniPractice.querySelector('[data-mini-spelling-action="return"]')).toBeNull()
    expect(onContinue).not.toHaveBeenCalled()
    expect(input.disabled).toBe(true)

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())

    expect(mount.querySelector('[data-mini-spelling-practice]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-fuzzy-spelling-action="practice"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())

    expect(onContinue).toHaveBeenCalledWith(true)
  })

  it('requires two consecutive exact spellings in mini practise without advancing', async () => {
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'typing',
        fuzzyMatching: true,
        state: createDrillSession({ mode: 'countries', skills: ['country-to-capital'], countryIds: ['SE'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [sweden],
        onAnswer: vi.fn(),
        onContinue,
        onExit: vi.fn(),
        activity: 'practice',
      }))
    })

    const drillInput = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(drillInput, 'Stockholmm'))
    await act(async () => [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Check'))?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')?.click())

    const miniPractice = mount.querySelector<HTMLElement>('[data-mini-spelling-practice]')!
    expect(mount.querySelector('[data-fuzzy-answer-comparison]')).toBeNull()
    expect(miniPractice.textContent).not.toContain('Reveal spelling')
    const revealButton = mount.querySelector<HTMLButtonElement>('[data-mini-spelling-action="reveal"]')
    expect(revealButton).not.toBeNull()
    await act(async () => revealButton!.click())
    expect(mount.querySelector('[data-mini-spelling-action="reveal"]')).toBeNull()
    expect(mount.querySelector('[data-spelling-answer-revealed]')?.textContent).toBe('Stockholm')

    const checkSpelling = async (value: string) => {
      const spellingInput = miniPractice.querySelector<HTMLInputElement>('input')!
      act(() => typeInto(spellingInput, value))
      await act(async () => miniPractice.querySelector<HTMLButtonElement>('[data-mini-spelling-action="check"]')?.click())
    }

    await checkSpelling('Stockholm!')
    expect(miniPractice.textContent).toContain('Not quite. Try again from memory.')
    expect(miniPractice.textContent).toContain('0 / 2 correct')

    await checkSpelling('  STOCKHOLM  ')
    expect(miniPractice.textContent).toContain('Correct. Spell it once more.')
    expect(miniPractice.textContent).toContain('1 / 2 correct')

    await checkSpelling('Stockholm')
    expect(mount.textContent).toContain('Spelling practice complete.')
    expect(onContinue).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(mount.querySelector('[data-fuzzy-spelling-action="continue"]'))
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())
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

  it('offers spelling practice after an incorrect answer in non-recording practice', async () => {
    const onContinue = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(DrillSession, {
        answerMode: 'typing',
        fuzzyMatching: false,
        state: createDrillSession({ mode: 'countries', skills: ['country-to-capital'], countryIds: ['NO'] }),
        selection: createDrillSelection('Europe', ['northern-europe']),
        entries: [norway],
        onAnswer: vi.fn(),
        onContinue,
        onExit: vi.fn(),
        activity: 'practice',
      }))
    })

    const input = mount.querySelector<HTMLInputElement>('input')!
    act(() => typeInto(input, 'Osl') )
    await act(async () => input.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="practice"]')).not.toBeNull()
    expect(onContinue).not.toHaveBeenCalled()
  })
})
