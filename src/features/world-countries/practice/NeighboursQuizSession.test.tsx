// @vitest-environment jsdom

import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { countries } from '@/features/world-countries/data/countries'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { createNeighboursQuizRun, createNeighboursQuizSession, type NeighboursQuizRun, type NeighboursQuizSessionState } from './neighboursRun'
import { NeighboursQuizSession } from './NeighboursQuizSession'

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: ({ countryPopulation, hiddenCountryIds, highlightedCountryIds, namedCountryIds, neighbourhoodZoom, zoomCountryIds, hideCountriesOutsidePopulation, interactive, onMapStateChange, highlightFill }: { countryPopulation?: readonly { id: string }[]; hiddenCountryIds?: readonly string[]; highlightedCountryIds?: readonly string[]; namedCountryIds?: readonly string[]; neighbourhoodZoom?: { targetCountryId: string; contextCountryIds?: readonly string[] }; zoomCountryIds?: readonly string[]; hideCountriesOutsidePopulation?: boolean; interactive?: boolean; onMapStateChange?: (state: 'loading' | 'ready' | 'error') => void; highlightFill?: string }) => {
    useEffect(() => {
      if (mockedMapState !== 'loading') onMapStateChange?.(mockedMapState)
    }, [onMapStateChange])
    return createElement('div', {
      'data-testid': 'neighbours-map',
      'data-population': countryPopulation?.map(country => country.id).join(',') ?? '',
      'data-hidden': hiddenCountryIds?.join(',') ?? '',
      'data-highlighted': highlightedCountryIds?.join(',') ?? '',
      'data-named': namedCountryIds?.join(',') ?? '',
      'data-neighbourhood-target': neighbourhoodZoom?.targetCountryId ?? '',
      'data-neighbourhood-context': neighbourhoodZoom?.contextCountryIds?.join(',') ?? '',
      'data-zoom': zoomCountryIds?.join(',') ?? '',
      'data-hide-outside-population': String(hideCountriesOutsidePopulation),
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
  const onAdvance = vi.fn()
  function Harness() {
    const [session, setSession] = useState<NeighboursQuizSessionState>(() => createNeighboursQuizSession(run))
    return createElement(NeighboursQuizSession, {
      run,
      session,
      onSessionChange: setSession,
      onAdvance,
    })
  }
  act(() => {
    root = createRoot(mount)
    root.render(createElement(PageLayoutProvider, null, createElement(PageLayout, null, createElement(Harness))))
  })
  return { mount, onAdvance }
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

function toolButton(mount: HTMLElement, text: string): HTMLButtonElement {
  const button = [...mount.querySelectorAll<HTMLButtonElement>('[data-neighbours-session-tools] button')].find(candidate => candidate.textContent === text)
  if (!button) throw new Error(`Session tool button not found: ${text}`)
  return button
}

describe('Neighbours Quiz session', () => {
  it('keeps found names on the map and accumulates one Found row per Country', () => {
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const { mount } = renderSession(run)
    const map = () => mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')!
    const dock = () => mount.querySelector<HTMLElement>('[data-task-dock]')!

    expect(mount.textContent).toContain('border Germany')
    expect(map().dataset.highlighted).toBe('DE')
    expect(map().dataset.highlightFill).toBe(getWorldCountriesTaskHighlightFill('country'))
    expect(map().dataset.neighbourhoodTarget).toBe('DE')
    expect(map().dataset.neighbourhoodContext).toContain('PL')
    expect(map().dataset.interactive).toBe('false')
    expect(dock().textContent).not.toContain('Show number')
    expect(dock().textContent).not.toContain('Show map')
    expect(dock().textContent).not.toContain('Reveal remaining')

    submit(mount, 'Poland')
    expect(map().dataset.neighbourhoodTarget).toBe('DE')
    expect(map().dataset.hidden).not.toContain('PL')
    expect(map().dataset.named).toContain('DE')
    expect(map().dataset.named).toContain('PL')
    expect(mount.querySelector('[data-neighbours-progress]')?.textContent).toBe('1 found')
    expect(mount.querySelectorAll('[aria-label="Found neighbours"] li')).toHaveLength(1)
    expect(mount.textContent).toContain('Poland')

    submit(mount, 'Poland')
    expect(mount.textContent).toContain('Already found.')
    expect(mount.querySelectorAll('[aria-label="Found neighbours"] li')).toHaveLength(1)

    submit(mount, 'Czech Republic')
    expect(mount.querySelectorAll('[aria-label="Found neighbours"] li')).toHaveLength(2)
    expect(mount.querySelector('[data-neighbours-progress]')?.textContent).toBe('2 found')
  })

  it('keeps Show number, Show map, and Reveal remaining in session tools', () => {
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const { mount } = renderSession(run)

    expect(mount.textContent).toContain('Show number')
    expect(mount.textContent).toContain('Show map')
    expect(mount.textContent).toContain('Reveal remaining')
    act(() => toolButton(mount, 'Show number').click())
    expect(mount.querySelector('[data-neighbours-progress]')?.textContent).toBe('0 / 9 found')
    act(() => toolButton(mount, 'Show map').click())
    expect(mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')?.dataset.hidden).toBe('')
    expect(mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')?.dataset.neighbourhoodTarget).toBe('DE')
  })

  it('leaves natural completion at a checkpoint without timer-driven advancement', () => {
    vi.useFakeTimers()
    const norway = countries.find(country => country.id === 'NO')!
    const sweden = countries.find(country => country.id === 'SE')!
    const run = createNeighboursQuizRun({ scopeCountries: [norway], activeCountries: [norway, sweden], questionCount: 'all' })!
    const { mount, onAdvance } = renderSession(run)

    act(() => toolButton(mount, 'Show number').click())
    submit(mount, sweden.country)
    expect(mount.textContent).toContain('All neighbours found.')
    expect(mount.textContent).toContain('1 hint used')
    expect(mount.querySelectorAll<HTMLButtonElement>('button[data-primary-action]')).toHaveLength(1)
    expect(mount.textContent).toContain('See results →')
    expect(mount.querySelector<HTMLInputElement>('#world-countries-neighbours-answer')).toBeNull()
    expect(mount.querySelector('[data-neighbours-session-tools]')).toBeNull()
    expect(mount.querySelector('[data-neighbours-checkpoint-rail]')).not.toBeNull()
    expect(mount.querySelector('[data-neighbours-checkpoint-rail] button')).toBeNull()
    expect(mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')?.dataset.neighbourhoodTarget).toBe('NO')
    act(() => vi.advanceTimersByTime(500))
    expect(onAdvance).not.toHaveBeenCalled()

    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'See results →')?.click())
    expect(onAdvance).toHaveBeenCalledOnce()
  })

  it('uses the same checkpoint for Reveal remaining and distinguishes found from revealed', () => {
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all' })!
    const { mount } = renderSession(run)

    submit(mount, 'Poland')
    act(() => toolButton(mount, 'Reveal remaining').click())

    expect(mount.textContent).toContain('Review this target.')
    expect(mount.querySelector('[data-neighbours-session-tools]')).toBeNull()
    expect(mount.querySelector('[data-neighbours-checkpoint-rail]')).not.toBeNull()
    expect(mount.textContent).toContain('Poland')
    expect(mount.textContent).toContain('Named')
    expect(mount.textContent).toContain('Austria')
    expect(mount.textContent).toContain('Revealed / missed')
    const named = mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')?.dataset.named ?? ''
    for (const neighbourId of run.questions[0]!.requiredNeighbourIds) expect(named).toContain(neighbourId)
    expect(mount.querySelector<HTMLElement>('[data-testid="neighbours-map"]')?.dataset.neighbourhoodTarget).toBe('DE')
  })

  it('keeps non-map controls usable when the map is loading or fails', () => {
    mockedMapState = 'loading'
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all', fuzzyMatching: true })!
    const { mount } = renderSession(run)

    expect(toolButton(mount, 'Show map').disabled).toBe(true)
    expect(toolButton(mount, 'Show number').disabled).toBe(false)
    expect(toolButton(mount, 'Reveal remaining').disabled).toBe(false)
    expect(mount.querySelector('#world-countries-neighbours-answer')).not.toBeNull()

    mockedMapState = 'error'
    act(() => root?.render(createElement(PageLayoutProvider, null, createElement(PageLayout, null, createElement(() => {
      const [session, setSession] = useState<NeighboursQuizSessionState>(() => createNeighboursQuizSession(run))
      return createElement(NeighboursQuizSession, { run, session, onSessionChange: setSession, onAdvance: vi.fn() })
    })))))
    expect(mount.textContent).toContain('The map is unavailable')
    expect(toolButton(mount, 'Show map').disabled).toBe(true)
    submit(mount, 'Poland')
    act(() => toolButton(mount, 'Show number').click())
    act(() => toolButton(mount, 'Reveal remaining').click())
    expect(mount.textContent).toContain('Review this target.')
  })

  it('uses the active run Country snapshot as the map population', () => {
    const germany = countries.find(country => country.id === 'DE')!
    const poland = countries.find(country => country.id === 'PL')!
    const austria = countries.find(country => country.id === 'AT')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: [germany, poland, austria], questionCount: 'all' })!
    const { mount } = renderSession(run)

    const map = mount.querySelector('[data-testid="neighbours-map"]')
    expect(map?.getAttribute('data-population')).toBe('DE,PL,AT')
    expect(map?.getAttribute('data-hide-outside-population')).toBe('true')
    expect(map?.getAttribute('data-hidden')).toContain('PL')
    expect(map?.getAttribute('data-hidden')).toContain('AT')

    act(() => toolButton(mount, 'Show map').click())
    expect(map?.getAttribute('data-hidden')).toBe('')
    expect(map?.getAttribute('data-hide-outside-population')).toBe('true')
  })

  it('uses focused expanded presentation and restores standard tools on collapse', () => {
    const germany = countries.find(country => country.id === 'DE')!
    const run = createNeighboursQuizRun({ scopeCountries: [germany], activeCountries: countries, questionCount: 'all' })!
    const { mount } = renderSession(run)

    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click())
    expect(mount.querySelector('[data-map-surface-companion]')).toBeNull()
    expect(mount.querySelector('[data-map-surface-presentation="expanded"]')).not.toBeNull()
    expect(mount.querySelector('[data-world-countries-task-progress]')?.textContent).toContain('Target 1 /')
    expect(mount.querySelector('#world-countries-neighbours-answer')).not.toBeNull()
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Show number')
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Show map')
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Reveal remaining')

    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Collapse map"]')?.click())
    expect(mount.querySelector('[data-map-surface-companion]')).toBeNull()
    expect(mount.querySelector('[data-neighbours-session-tools]')).not.toBeNull()
    expect(mount.textContent).toContain('Show number')
    expect(mount.textContent).toContain('Show map')
    expect(mount.textContent).toContain('Reveal remaining')
  })

  it('keeps the focused checkpoint below the expanded map with one continuation action', () => {
    const norway = countries.find(country => country.id === 'NO')!
    const sweden = countries.find(country => country.id === 'SE')!
    const run = createNeighboursQuizRun({ scopeCountries: [norway], activeCountries: [norway, sweden], questionCount: 'all' })!
    const { mount } = renderSession(run)

    submit(mount, sweden.country)
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Expand map"]')?.click())

    expect(mount.querySelector('[data-map-surface-companion]')).toBeNull()
    expect(mount.querySelector('[data-world-countries-task-progress]')?.textContent).toContain('Target 1 / 1')
    expect(mount.querySelectorAll<HTMLButtonElement>('[data-primary-action]')).toHaveLength(1)
    expect([...mount.querySelectorAll<HTMLButtonElement>('[data-primary-action]')].some(button => button.textContent?.includes('See results'))).toBe(true)
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Show number')
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Show map')
    expect(mount.querySelector('[data-map-surface-dock]')?.textContent).not.toContain('Reveal remaining')
  })
})
