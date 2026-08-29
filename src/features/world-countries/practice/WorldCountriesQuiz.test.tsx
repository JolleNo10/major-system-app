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
  localStorage.clear()
})

function renderQuiz(activeCountries: readonly Country[] = countries.slice(0, 2)) {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountriesPopulationProvider, { countries: activeCountries, children: createElement(WorldCountriesQuiz, { answerMode: 'typing' }) }),
        ),
      ),
    ))
  })
  return mount
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
})
