// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { WorldCountriesPopulationProvider } from '@/features/world-countries/WorldCountriesPopulationContext'
import { WorldCountriesQuiz } from './WorldCountriesQuiz'

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: ({ level, onCountryClick }: { level: string; onCountryClick?: (country: Country) => void }) => createElement('button', {
    type: 'button',
    'data-testid': `quiz-map-${level}`,
    onClick: () => onCountryClick?.({ continent: 'Europe', subregionId: 'northern-europe' } as Country),
  }, `map-${level}`),
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
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
