// @vitest-environment jsdom

import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { countries } from '@/features/world-countries/data/countries'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { createNeighboursQuizRun, createNeighboursQuizSession, type NeighboursQuizRun, type NeighboursQuizSessionState } from './neighboursRun'
import { NeighboursQuizSession } from './NeighboursQuizSession'

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: ({ hiddenCountryIds, highlightedCountryIds, namedCountryIds, zoomCountryIds, interactive, onMapStateChange, highlightFill }: { hiddenCountryIds?: readonly string[]; highlightedCountryIds?: readonly string[]; namedCountryIds?: readonly string[]; zoomCountryIds?: readonly string[]; interactive?: boolean; onMapStateChange?: (state: 'loading' | 'ready' | 'error') => void; highlightFill?: string }) => {
    useEffect(() => {
      if (mockedMapState !== 'loading') onMapStateChange?.(mockedMapState)
    }, [onMapStateChange])
    return createElement('div', {
      'data-testid': 'neighbours-map',
      'data-hidden': hiddenCountryIds?.join(',') ?? '',
      'data-highlighted': highlightedCountryIds?.join(',') ?? '',
      'data-named': namedCountryIds?.join(',') ?? '',
      'data-zoom': zoomCountryIds?.join(',') ?? '',
      'data-interactive': String(interactive),
      'data-highlight-fill': highlightFill ?? '',
    })
  },
}))

let root: Root | null = null
let mockedMapState: 'loading' | 'ready' | 'error' = 'ready'

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  mockedMapState = 'ready'
})

function renderSession(run: NeighboursQuizRun) {
  const mount = document.createElement('div')
  document.body.append(mount)
  function Harness() {
    const [session, setSession] = useState<NeighboursQuizSessionState>(() => createNeighboursQuizSession(run))
    return createElement(NeighboursQuizSession, {
      run,
      session,
      onSessionChange: setSession,
      onAdvance: vi.fn(),
    })
  }
  act(() => {
    root = createRoot(mount)
    root.render(createElement(PageLayoutProvider, null, createElement(Harness)))
  })
  return mount
}

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function submit(mount: HTMLElement, value: string): void {
  const input = mount.querySelector<HTMLInputElement>('#world-countries-neighbours-answer')!
  act(() => typeInto(input, value))
  act(() => mount.querySelector<HTMLButtonElement>('button[type="submit"]')?.click())
}

describe('Neighbours Quiz session', () => {
  it('keeps the target active, reveals only correct neighbours, and supports hints/review', () => {
    vi.useFakeTimers()
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const mount = renderSession(run)
    const map = () => mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')!

    expect(mount.textContent).toContain('border Germany')
    expect(map().dataset.highlighted).toBe('DE')
    expect(map().dataset.highlightFill).toBe(getWorldCountriesTaskHighlightFill('country'))
    expect(map().dataset.zoom).toContain('DE')
    expect(map().dataset.interactive).toBe('false')

    submit(mount, 'Poland')
    expect(mount.textContent).toContain('border Germany')
    expect(mount.textContent).toContain('0 incorrect guesses')
    expect(map().dataset.hidden).not.toContain('PL')
    expect(document.activeElement?.id).toBe('world-countries-neighbours-answer')

    submit(mount, 'Czech Republic')
    expect(mount.textContent).toContain('Correct.')
    expect(map().dataset.hidden).not.toContain('CZ')

    submit(mount, 'Polan')
    expect(map().dataset.hidden).not.toContain('PL')

    submit(mount, 'Poland')
    expect(mount.textContent).toContain('Already found.')
    expect(mount.textContent).toContain('0 incorrect guesses')

    submit(mount, 'Japan')
    expect(mount.textContent).toContain('is not a neighbour')
    expect(mount.textContent).toContain('1 incorrect guess')
    expect(map().dataset.hidden).toContain('JP')

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Show number')?.click())
    expect(mount.textContent).toContain('Neighbours found: 2 / 9')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal map')?.click())
    expect(map().dataset.hidden).toBe('')

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal remaining')?.click())
    expect(mount.textContent).toContain('Review the revealed neighbours')
    expect(mount.textContent).toContain('Austria')
    expect(map().dataset.named).toContain('AT')
    expect([...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Continue')).toBeTruthy()
  })

  it('keeps the map hint unavailable while the map is loading', () => {
    mockedMapState = 'loading'
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const mount = renderSession(run)
    const revealMap = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal map')

    expect(revealMap?.disabled).toBe(true)
    expect(mount.querySelector('#world-countries-neighbours-answer')).not.toBeNull()
    expect(mount.textContent).toContain('Show number')
    expect(mount.textContent).toContain('Reveal remaining')
  })

  it('enables the map hint only after the map reports ready', () => {
    mockedMapState = 'ready'
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const mount = renderSession(run)
    const revealMap = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal map')

    expect(revealMap?.disabled).toBe(false)
    act(() => revealMap?.click())
    expect(mount.textContent).toContain('Map revealed')
  })

  it('keeps typed answering and remaining reveal available after map failure', () => {
    mockedMapState = 'error'
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const mount = renderSession(run)
    const revealMap = [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal map')

    expect(mount.textContent).toContain('The map is unavailable')
    expect(revealMap?.disabled).toBe(true)
    act(() => revealMap?.click())
    expect(mount.textContent).not.toContain('Map revealed')

    submit(mount, 'Poland')
    expect(mount.textContent).toContain('0 incorrect guesses')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Show number')?.click())
    expect(mount.textContent).toContain('Neighbours found: 1 / 9')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Reveal remaining')?.click())
    expect(mount.textContent).toContain('Review the revealed neighbours')
  })
})
