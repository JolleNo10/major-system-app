// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider, useSettings } from '@/app/settings/SettingsContext'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { WorldCountriesPopulationProvider } from '@/features/world-countries/WorldCountriesPopulationContext'
import { WorldCountriesQuiz } from './WorldCountriesQuiz'

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: ({ level, onCountryClick, onMapStateChange }: { level: string; onCountryClick?: (country: Country) => void; onMapStateChange?: (state: 'loading' | 'ready' | 'error') => void }) => {
    useEffect(() => {
      if (level === 'world') onMapStateChange?.(mockedWorldMapState)
    }, [level, onMapStateChange])
    return createElement('button', {
      type: 'button',
      'data-testid': `quiz-map-${level}`,
      onClick: () => onCountryClick?.({ continent: 'Europe', subregionId: 'northern-europe' } as Country),
    }, `map-${level}`)
  },
}))

let root: Root | null = null
let mockedWorldMapState: 'loading' | 'ready' | 'error' = 'ready'

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
  mockedWorldMapState = 'ready'
})

function quizTree(activeCountries: readonly Country[]) {
  return createElement(SettingsProvider, null,
    createElement(PageLayoutProvider, null,
      createElement(PageLayout, null,
        createElement(WorldCountriesPopulationProvider, { countries: activeCountries, children: createElement(WorldCountriesQuiz, { answerMode: 'typing' }) }),
      ),
    ),
  )
}

function renderQuiz(activeCountries: readonly Country[] = countries.slice(0, 2)) {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(quizTree(activeCountries))
  })
  return mount
}

function renderRerenderableQuiz(activeCountries: readonly Country[]) {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(quizTree(activeCountries))
  })
  return {
    mount,
    rerender: (nextCountries: readonly Country[]) => act(() => root?.render(quizTree(nextCountries))),
  }
}

function settingsQuizTree(activeCountries: readonly Country[]) {
  return createElement(SettingsProvider, null,
    createElement(SettingsControlAndQuiz, { activeCountries }),
  )
}

function SettingsControlAndQuiz({ activeCountries }: { activeCountries: readonly Country[] }) {
  const { update } = useSettings()
  return createElement('div', null,
    createElement('button', { type: 'button', onClick: () => update({ worldCountriesFuzzyAnswerMatching: false }) }, 'Disable fuzzy matching'),
    createElement(PageLayoutProvider, null,
      createElement(PageLayout, null,
        createElement(WorldCountriesPopulationProvider, { countries: activeCountries, children: createElement(WorldCountriesQuiz, { answerMode: 'typing' }) }),
      ),
    ),
  )
}

function renderSettingsRerenderableQuiz(activeCountries: readonly Country[]) {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(settingsQuizTree(activeCountries))
  })
  return {
    mount,
    rerender: (nextCountries: readonly Country[]) => act(() => root?.render(settingsQuizTree(nextCountries))),
  }
}

function clickButton(mount: HTMLElement, text: string): void {
  const button = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(candidate => candidate.textContent?.includes(text))
  if (!button) throw new Error(`Button not found: ${text}`)
  act(() => button.click())
}

function clickAriaButton(mount: HTMLElement, label: string): void {
  const button = mount.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  if (!button) throw new Error(`ARIA button not found: ${label}`)
  act(() => button.click())
}

function currentQuestionCountry(mount: HTMLElement, activeCountries: readonly Country[]): Country {
  const prompt = mount.querySelector('#world-countries-capitals-quiz-question')?.textContent ?? ''
  const country = activeCountries.find(candidate => prompt.includes(candidate.country))
  if (!country) throw new Error(`Could not resolve the current Country from: ${prompt}`)
  return country
}

function currentNeighboursTarget(mount: HTMLElement, activeCountries: readonly Country[]): Country {
  const prompt = mount.querySelector('#world-countries-neighbours-quiz-question')?.textContent ?? ''
  const country = activeCountries.find(candidate => prompt.includes(candidate.country))
  if (!country) throw new Error(`Could not resolve the current Neighbours target from: ${prompt}`)
  return country
}

function answerNeighboursQuestion(mount: HTMLElement, answer: string): void {
  act(() => typeInto(mount.querySelector<HTMLInputElement>('#world-countries-neighbours-answer')!, answer))
  clickButton(mount, 'Check')
}

function answerCurrentQuestion(mount: HTMLElement, activeCountries: readonly Country[], answer: string, waitMs: number): Country {
  const country = currentQuestionCountry(mount, activeCountries)
  act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, answer))
  clickButton(mount, 'Check')
  act(() => vi.advanceTimersByTime(waitMs))
  return country
}

function startQuiz(mount: HTMLElement): void {
  act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Quiz')?.click())
}

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('World Countries Capitals Quiz', () => {
  it('starts with all active Countries selected and normalizes the count to All for a small scope', () => {
    const mount = renderQuiz()

    expect(mount.textContent).toContain('1 Continent · 1 Subregion · 2 Countries selected')
    expect((mount.querySelector('input[value="all"]') as HTMLInputElement).checked).toBe(true)
    expect((mount.querySelector('input[value="10"]') as HTMLInputElement).disabled).toBe(true)
    expect((mount.querySelector('input[value="20"]') as HTMLInputElement).disabled).toBe(true)
    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="quiz-map-world"]')?.click())
    expect(mount.querySelector('[data-testid="quiz-map-continent"]')).not.toBeNull()
    expect(mount.textContent).toContain('2 Countries in current scope')
  })

  it('offers Neighbours with eligible-target counts and routes to its multi-answer session', () => {
    vi.useFakeTimers()
    const activeCountries = ['DE', 'PL', 'AT'].map(id => countries.find(country => country.id === id)!)
    const mount = renderQuiz(activeCountries)

    act(() => mount.querySelector<HTMLInputElement>('input[name="world-countries-quiz-type"][value="neighbours"]')?.click())
    expect(mount.textContent).toContain('Neighbours quiz')
    expect(mount.textContent).toContain('3 eligible target Countries')
    expect((mount.querySelector('input[value="10"]') as HTMLInputElement).disabled).toBe(true)
    expect(mount.querySelector('[aria-labelledby="world-countries-quiz-controls-heading"]')).not.toBeNull()

    startQuiz(mount)
    expect(mount.querySelector('#world-countries-neighbours-quiz-question')).not.toBeNull()
    expect(mount.textContent).toContain('Show number')
    expect(mount.textContent).toContain('Show map')
    expect(mount.querySelector('[data-neighbours-session-tools]')).not.toBeNull()
    expect(mount.querySelector('[aria-labelledby="world-countries-quiz-controls-heading"]')).toBeNull()
    expect(mount.textContent).not.toContain('What is the capital of')
  })

  it('clears setup rails when Capitals becomes the active phase', () => {
    const norway = countries.find(country => country.id === 'NO')!
    const mount = renderQuiz([norway])

    expect(mount.querySelector('[aria-labelledby="world-countries-quiz-controls-heading"]')).not.toBeNull()
    startQuiz(mount)
    expect(mount.querySelector('[aria-labelledby="world-countries-quiz-controls-heading"]')).toBeNull()
  })

  it('keeps an active Neighbours run snapshot when live geography changes', () => {
    vi.useFakeTimers()
    const activeCountries = ['DE', 'PL', 'AT'].map(id => countries.find(country => country.id === id)!)
    const rendered = renderRerenderableQuiz(activeCountries)
    act(() => rendered.mount.querySelector<HTMLInputElement>('input[name="world-countries-quiz-type"][value="neighbours"]')?.click())
    startQuiz(rendered.mount)
    const question = rendered.mount.querySelector('#world-countries-neighbours-quiz-question')?.textContent
    expect(question).toBeTruthy()

    rendered.rerender([activeCountries[0]!])

    expect(rendered.mount.querySelector('#world-countries-neighbours-quiz-question')?.textContent).toBe(question)
    expect(rendered.mount.textContent).toContain('Show map')
  })

  it('keeps Neighbours fuzzy matching from the run snapshot after Settings changes', () => {
    vi.useFakeTimers()
    const activeCountries = ['NO', 'SE'].map(id => countries.find(country => country.id === id)!)
    const rendered = renderSettingsRerenderableQuiz(activeCountries)
    act(() => rendered.mount.querySelector<HTMLInputElement>('input[name="world-countries-quiz-type"][value="neighbours"]')?.click())
    startQuiz(rendered.mount)

    const target = currentNeighboursTarget(rendered.mount, activeCountries)
    const neighbour = activeCountries.find(country => country.id !== target.id)!
    clickButton(rendered.mount, 'Disable fuzzy matching')
    answerNeighboursQuestion(rendered.mount, neighbour.country.slice(0, -1))

    expect(rendered.mount.textContent).toContain('Correct.')
    act(() => vi.advanceTimersByTime(500))
    expect(rendered.mount.textContent).toContain('Next Country →')
    clickButton(rendered.mount, 'Next Country')
    expect(rendered.mount.textContent).toContain('Question 2 / 2')
  })

  it('drives Neighbours completion, Retry missed, and New quiz through the coordinator', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    mockedWorldMapState = 'error'
    const activeCountries = ['NO', 'SE'].map(id => countries.find(country => country.id === id)!)
    const rendered = renderRerenderableQuiz(activeCountries)
    const mount = rendered.mount

    act(() => mount.querySelector<HTMLInputElement>('input[name="world-countries-quiz-type"][value="neighbours"]')?.click())
    startQuiz(mount)
    expect(mount.textContent).toContain('The map is unavailable')

    const firstTarget = currentNeighboursTarget(mount, activeCountries)
    const firstNeighbour = activeCountries.find(country => country.id !== firstTarget.id)!
    answerNeighboursQuestion(mount, 'Japan')
    expect(mount.textContent).toContain('Country not recognized')
    answerNeighboursQuestion(mount, firstNeighbour.country)
    act(() => vi.advanceTimersByTime(500))
    expect(mount.textContent).toContain('Next Country →')
    clickButton(mount, 'Next Country')

    const secondTarget = currentNeighboursTarget(mount, activeCountries)
    const secondNeighbour = activeCountries.find(country => country.id !== secondTarget.id)!
    answerNeighboursQuestion(mount, secondNeighbour.country)
    act(() => vi.advanceTimersByTime(500))
    expect(mount.textContent).toContain('See results →')
    clickButton(mount, 'See results')

    expect(mount.querySelector('#world-countries-neighbours-quiz-results-heading')).not.toBeNull()
    expect(mount.textContent).toContain('2 / 2')
    expect(mount.textContent).toContain('Perfect Countries')
    expect(mount.textContent).toContain('Wrong guesses')
    const retryButton = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Retry missed')
    expect(retryButton?.hidden).toBe(false)

    rendered.rerender([firstTarget])
    clickButton(mount, 'Retry missed')
    expect(mount.textContent).toContain('Question 1 / 1')
    expect(currentNeighboursTarget(mount, activeCountries).id).toBe(firstTarget.id)
    answerNeighboursQuestion(mount, firstNeighbour.country)
    act(() => vi.advanceTimersByTime(500))
    expect(mount.textContent).toContain('See results →')
    clickButton(mount, 'See results')

    expect(mount.textContent).toContain('1 / 1')
    expect([...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Retry missed')?.hidden).toBe(true)

    rendered.rerender(activeCountries)
    clickButton(mount, 'New quiz')
    expect(mount.textContent).toContain('Question 1 / 2')
  })

  it('keeps a combined Subregion selection across Continent navigation and starts that scope', () => {
    vi.useFakeTimers()
    const activeCountries = [countries.find(country => country.id === 'NO')!, countries.find(country => country.id === 'JP')!]
    const mount = renderQuiz(activeCountries)

    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('2 Continents')
    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('2 Countries selected')

    clickButton(mount, 'Clear')
    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('0 Continents')
    expect((mount.querySelector('input[value="10"]') as HTMLInputElement).disabled).toBe(true)

    clickAriaButton(mount, 'Select Europe')
    expect(mount.textContent).toContain('1 Countries in current scope')
    clickAriaButton(mount, 'Select Asia')
    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('2 Continents')
    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('2 Subregions')

    clickAriaButton(mount, 'Open Asia setup')
    expect(mount.querySelector('[aria-current="page"]')?.textContent).toBe('Asia')
    clickButton(mount, 'World')
    expect(mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('2 Countries selected')

    clickButton(mount, 'Start Quiz')
    expect(mount.textContent).toContain('Question 1 / 2')
  })

  it.each([
    { countryCount: 9, defaultCount: 'all' as const, fiftyDisabled: true },
    { countryCount: 10, defaultCount: 10 as const, fiftyDisabled: true },
    { countryCount: 19, defaultCount: 10 as const, fiftyDisabled: true },
    { countryCount: 20, defaultCount: 20 as const, fiftyDisabled: true },
    { countryCount: 49, defaultCount: 20 as const, fiftyDisabled: true },
    { countryCount: 50, defaultCount: 20 as const, fiftyDisabled: false },
  ])('wires question-count defaults and availability for $countryCount active Countries', ({ countryCount, defaultCount, fiftyDisabled }) => {
    const mount = renderQuiz(countries.slice(0, countryCount))

    expect((mount.querySelector(`input[value="${defaultCount}"]`) as HTMLInputElement).checked).toBe(true)
    expect((mount.querySelector('input[value="all"]') as HTMLInputElement).disabled).toBe(false)
    expect((mount.querySelector('input[value="50"]') as HTMLInputElement).disabled).toBe(fiftyDisabled)
  })

  it('normalizes a selected numeric count as the live population shrinks', () => {
    const rendered = renderRerenderableQuiz(countries.slice(0, 20))

    expect((rendered.mount.querySelector('input[value="20"]') as HTMLInputElement).checked).toBe(true)
    rendered.rerender(countries.slice(0, 12))
    expect((rendered.mount.querySelector('input[value="10"]') as HTMLInputElement).checked).toBe(true)
    rendered.rerender(countries.slice(0, 7))
    expect((rendered.mount.querySelector('input[value="all"]') as HTMLInputElement).checked).toBe(true)
  })

  it('runs text-only reveal questions and reviews exactly the missed run', () => {
    vi.useFakeTimers()
    const mount = renderQuiz()
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Start Quiz')?.click())

    expect(mount.textContent).toContain('What is the capital of')
    expect(mount.querySelector('[data-testid="quiz-map-continent"]')).toBeNull()
    expect(mount.textContent).toContain("Don't know")

    for (let index = 0; index < 2; index += 1) {
      act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === "Don't know")?.click())
      act(() => vi.advanceTimersByTime(1800))
    }

    expect(mount.textContent).toContain('0 / 2')
    expect(mount.textContent).toContain('0%')
    expect(mount.textContent).toContain('Missed Countries')
    expect(mount.querySelector('button')?.textContent).toBe('Retry missed')

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Retry missed')?.click())
    expect(mount.textContent).toContain('Question 1 / 2')
  })

  it('scores an exact answer and advances after the success interval', () => {
    vi.useFakeTimers()
    const norway = countries.find(country => country.id === 'NO')!
    const mount = renderQuiz([norway])
    startQuiz(mount)

    act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, norway.capital))
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Check'))?.click())
    expect(mount.querySelector('[data-world-answer-outcome="exact"]')).not.toBeNull()

    act(() => vi.advanceTimersByTime(500))
    expect(mount.textContent).toContain('1 / 1')
  })

  it('starts a normal configured run after completing Retry missed', () => {
    vi.useFakeTimers()
    const activeCountries = [countries.find(country => country.id === 'NO')!, countries.find(country => country.id === 'SE')!, countries.find(country => country.id === 'FI')!]
    const mount = renderQuiz(activeCountries)
    startQuiz(mount)

    let missedCountry: Country | undefined
    for (let index = 0; index < activeCountries.length; index += 1) {
      const current = currentQuestionCountry(mount, activeCountries)
      const shouldMiss = missedCountry === undefined
      if (shouldMiss) missedCountry = current
      act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, shouldMiss ? '__wrong__' : current.capital))
      clickButton(mount, 'Check')
      act(() => vi.advanceTimersByTime(shouldMiss ? 1800 : 500))
    }

    expect(mount.querySelector('#world-countries-capitals-quiz-results-heading')?.textContent).toBe('2 / 3')
    expect(mount.textContent).toContain('Missed')

    clickButton(mount, 'Retry missed')
    expect(mount.textContent).toContain('Question 1 / 1')
    const retryCountry = currentQuestionCountry(mount, activeCountries)
    expect(retryCountry.id).toBe(missedCountry?.id)

    answerCurrentQuestion(mount, activeCountries, retryCountry.capital, 500)
    expect(mount.querySelector('#world-countries-capitals-quiz-results-heading')?.textContent).toBe('1 / 1')

    clickButton(mount, 'New quiz')
    expect(mount.textContent).toContain('Question 1 / 3')
  })

  it('returns to setup without run state and retains valid selection after population changes', () => {
    vi.useFakeTimers()
    const activeCountries = [countries.find(country => country.id === 'NO')!, countries.find(country => country.id === 'SE')!]
    const rendered = renderRerenderableQuiz(activeCountries)
    startQuiz(rendered.mount)

    clickButton(rendered.mount, "Don't know")
    act(() => vi.advanceTimersByTime(1800))
    const remainingCountry = currentQuestionCountry(rendered.mount, activeCountries)
    answerCurrentQuestion(rendered.mount, activeCountries, remainingCountry.capital, 500)
    expect(rendered.mount.querySelector('#world-countries-capitals-quiz-results-heading')).not.toBeNull()

    rendered.rerender([activeCountries[0]!])
    clickButton(rendered.mount, 'Change setup')

    expect(rendered.mount.querySelector('#world-countries-capitals-quiz-question')).toBeNull()
    expect(rendered.mount.querySelector('#world-countries-capitals-quiz-results-heading')).toBeNull()
    expect(rendered.mount.textContent).not.toContain('Quiz complete')
    expect(rendered.mount.querySelector('[aria-label="World selection summary"]')?.textContent).toContain('1 Country selected')
    expect((rendered.mount.querySelector('input[value="all"]') as HTMLInputElement).checked).toBe(true)

    clickButton(rendered.mount, 'Start Quiz')
    expect(rendered.mount.textContent).toContain('Question 1 / 1')
    expect(currentQuestionCountry(rendered.mount, [activeCountries[0]!]).id).toBe(activeCountries[0]?.id)
  })

  it('keeps an active run snapshot when the live population changes', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const activeCountries = [countries.find(country => country.id === 'NO')!, countries.find(country => country.id === 'SE')!, countries.find(country => country.id === 'FI')!]
    const rendered = renderRerenderableQuiz(activeCountries)
    startQuiz(rendered.mount)

    const firstCountry = currentQuestionCountry(rendered.mount, activeCountries)
    const laterLiveCountry = activeCountries.find(country => country.id !== firstCountry.id)!
    rendered.rerender([laterLiveCountry])
    expect(currentQuestionCountry(rendered.mount, activeCountries).id).toBe(firstCountry.id)

    const observedOrder: string[] = []
    for (let index = 0; index < activeCountries.length; index += 1) {
      const current = currentQuestionCountry(rendered.mount, activeCountries)
      observedOrder.push(current.id)
      answerCurrentQuestion(rendered.mount, activeCountries, current.capital, 500)
    }

    expect(observedOrder).toEqual(['SE', 'FI', 'NO'])
    expect(rendered.mount.querySelector('#world-countries-capitals-quiz-results-heading')?.textContent).toBe('3 / 3')

    clickButton(rendered.mount, 'New quiz')
    expect(rendered.mount.textContent).toContain('Question 1 / 1')
    expect(currentQuestionCountry(rendered.mount, [laterLiveCountry]).id).toBe(laterLiveCountry.id)
  })

  it('scores a fuzzy answer as correct through the shared spelling lifecycle', () => {
    const sweden = countries.find(country => country.id === 'SE')!
    const mount = renderQuiz([sweden])
    startQuiz(mount)

    act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, 'Stockholmm'))
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Check'))?.click())
    expect(mount.querySelector('[data-world-answer-outcome="fuzzy"]')).not.toBeNull()
    expect(mount.textContent).toContain('Correct')

    act(() => mount.querySelector<HTMLButtonElement>('[data-fuzzy-spelling-action="continue"]')?.click())
    expect(mount.textContent).toContain('1 / 1')
  })

  it('shows the canonical capital for an incorrect answer before advancing', () => {
    vi.useFakeTimers()
    const norway = countries.find(country => country.id === 'NO')!
    const mount = renderQuiz([norway])
    startQuiz(mount)

    act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, 'London'))
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Check'))?.click())
    expect(mount.querySelector('[data-world-answer-outcome="incorrect"]')).not.toBeNull()
    expect(mount.textContent).toContain(`The correct capital is ${norway.capital}.`)
    act(() => vi.advanceTimersByTime(1799))
    expect(mount.textContent).toContain(`The correct capital is ${norway.capital}.`)
    act(() => vi.advanceTimersByTime(1))
    expect(mount.textContent).toContain('0 / 1')
  })

  it('records the final answer before showing results exactly once', () => {
    vi.useFakeTimers()
    const norway = countries.find(country => country.id === 'NO')!
    const mount = renderQuiz([norway])
    startQuiz(mount)

    act(() => typeInto(mount.querySelector<HTMLInputElement>('input')!, 'London'))
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Check'))?.click())
    act(() => vi.advanceTimersByTime(1800))

    expect(mount.querySelector('#world-countries-capitals-quiz-results-heading')?.textContent).toBe('0 / 1')
    expect(mount.querySelectorAll('#world-countries-capitals-quiz-results-heading')).toHaveLength(1)
    expect(mount.textContent).toContain('Your answer: London')
  })
})
