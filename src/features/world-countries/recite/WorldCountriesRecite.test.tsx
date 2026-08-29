// @vitest-environment jsdom

import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PageLayout } from '@/app/layout/PageLayout'
import { PageLayoutProvider } from '@/app/layout/PageLayoutContext'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { countries } from '@/features/world-countries/data/countries'
import { WorldCountriesPopulationProvider } from '@/features/world-countries/WorldCountriesPopulationContext'
import { CONTINENT_METADATA_STORAGE_KEY, setContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { RECITE_PROGRESS_STORAGE_KEY } from './reciteProgress'
import { WorldCountriesRecite } from './WorldCountriesRecite'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mapRender = vi.hoisted(() => vi.fn())

vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: (props: Record<string, unknown>) => {
    mapRender(props)
    useEffect(() => {
      const onMapStateChange = props.onMapStateChange
      if (typeof onMapStateChange !== 'function') return
      onMapStateChange('loading')
      onMapStateChange('ready')
    }, [props.level, props.continent])
    return createElement('div', { 'data-testid': 'recite-map' })
  },
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  localStorage.clear()
  mapRender.mockClear()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function renderRecite(entries = countries.filter(country => country.id === 'NO')) {
  const mount = document.createElement('div')
  document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(PageLayoutProvider, null,
        createElement(PageLayout, null,
          createElement(WorldCountriesPopulationProvider, {
            countries: entries,
            children: createElement(WorldCountriesRecite, { answerMode: 'multiple-choice' }),
          }),
        ),
      ),
    ))
    await Promise.resolve()
    await Promise.resolve()
  })
  return mount
}

function buttonContaining(mount: HTMLElement, text: string): HTMLButtonElement {
  const button = [...mount.querySelectorAll<HTMLButtonElement>('button')]
    .find(candidate => candidate.textContent?.includes(text))
  if (!button) throw new Error(`Missing button containing ${text}`)
  return button
}

function openContinent(mount: HTMLElement, continent: string): void {
  const button = mount.querySelector<HTMLButtonElement>(`[aria-label="Open ${continent} setup"]`)
  if (!button) throw new Error(`Missing navigation button for ${continent}`)
  button.click()
}

function goToWorld(mount: HTMLElement): void {
  const button = mount.querySelector<HTMLButtonElement>('[aria-label="World Countries hierarchy"] button')
  if (!button) throw new Error('Missing World breadcrumb')
  button.click()
}

function activeMapProps(): Record<string, unknown> {
  const activeMaps = mapRender.mock.calls
    .map(([props]) => props as Record<string, unknown>)
    .filter(props => props.interactive === false)
  return activeMaps[activeMaps.length - 1] ?? {}
}

function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function selectRadio(mount: HTMLElement, index: number): void {
  const radio = mount.querySelectorAll<HTMLInputElement>('input[type="radio"]')[index]
  if (!radio) throw new Error(`Missing radio ${index}`)
  radio.click()
}

describe('World Countries Recite workflow', () => {
  it('opens at World setup, enters a Continent, and gates Start on scope and map readiness', async () => {
    const mount = await renderRecite()

    expect(mount.textContent).toContain('Countries + Capitals')
    expect(mount.textContent).toContain('Countries from Capitals')
    expect(mount.textContent).toContain('Countries setup may use a stronger Countries + Capitals result.')
    expect(mount.textContent).toContain('Visible')
    expect(mount.querySelector<HTMLButtonElement>('button:disabled')?.textContent).toContain('Choose a ready Country scope')

    await act(async () => openContinent(mount, 'Europe'))
    expect(mount.querySelector<HTMLButtonElement>('button:disabled')?.textContent).toContain('Choose a ready Country scope')

    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    expect(buttonContaining(mount, 'Start Recite').disabled).toBe(false)
  })

  it('keeps a wrong typed answer active, then completes and persists only Recite progress', async () => {
    vi.useFakeTimers()
    const mount = await renderRecite()
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const activeMap = () => {
      const activeMaps = mapRender.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter(props => props.interactive === false)
      return activeMaps[activeMaps.length - 1]
    }
    expect(activeMap()?.highlightedCountryIds).toEqual(['NO'])

    const input = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')
    expect(input).not.toBeNull()
    await act(async () => {
      typeInto(input!, 'Sweden')
      input?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Not quite. Try again')
    expect(input?.disabled).toBe(true)
    expect(mount.textContent).not.toContain('Answer: Norway')

    await act(async () => {
      vi.advanceTimersByTime(1800)
      await Promise.resolve()
    })
    const retryInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')!
    expect(retryInput.value).toBe('')
    expect(retryInput.disabled).toBe(false)
    await act(async () => {
      typeInto(retryInput, 'Norway')
      mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct')
    expect(mount.textContent).toContain('Norway')
    expect(mount.textContent).not.toContain('Recite complete')

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Recite complete')
    expect(JSON.parse(localStorage.getItem(RECITE_PROGRESS_STORAGE_KEY) ?? '{}')).toMatchObject({
      version: 1,
      outcomes: { countries: { NO: { outcome: 'recovered' } } },
    })
    expect(localStorage.getItem('world-countries:capital-to-country:NO')).toBeNull()
  })

  it('runs the Countries + Capitals prompts in order with automatic transitions', async () => {
    vi.useFakeTimers()
    const mount = await renderRecite()
    const setupMap = mapRender.mock.calls[mapRender.mock.calls.length - 1]?.[0] as Record<string, unknown>
    expect(setupMap.highlightFill).toBeUndefined()
    await act(async () => selectRadio(mount, 1))
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const countryInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')
    expect(countryInput).not.toBeNull()
    const activeMap = () => {
      const activeMaps = mapRender.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter(props => props.interactive === false)
      return activeMaps[activeMaps.length - 1]
    }
    expect(activeMap()?.highlightFill).toBe('#0891b2')
    expect(mount.querySelector('[data-world-countries-task-direction]')?.textContent).toBe('Ordered Country recall')
    await act(async () => {
      typeInto(countryInput!, 'Norway')
      countryInput?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct')
    expect(mount.textContent).toContain('Norway')
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Capital of Norway')
    expect(activeMap()?.highlightFill).toBe('#8b5cf6')
    expect(mount.querySelector('[data-world-countries-task-direction]')?.textContent).toBe('Country → Capital')

    const capitalInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the capital"]')
    await act(async () => {
      typeInto(capitalInput!, 'Oslo')
      capitalInput?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct')
    expect(mount.textContent).toContain('Oslo')
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Recite complete')
  })

  it('wires Reveal as you go to hidden Country IDs and reveals the Country after Skip', async () => {
    const mount = await renderRecite()
    await act(async () => selectRadio(mount, 4))
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const activeMap = () => {
      const activeMaps = mapRender.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter(props => props.interactive === false)
      return activeMaps[activeMaps.length - 1]
    }
    expect(activeMap()?.hiddenCountryIds).toEqual(['NO'])
    expect(activeMap()?.highlightedCountryIds).toEqual([])

    await act(async () => buttonContaining(mount, 'Reveal / Skip').click())
    expect(mount.textContent).toContain('Answer revealed')
    expect(mount.textContent).toContain('Norway')
    expect(activeMap()?.hiddenCountryIds).toEqual([])
  })

  it('keeps Countries from Capitals on the Country-answer color', async () => {
    const mount = await renderRecite()
    await act(async () => selectRadio(mount, 2))
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const activeMaps = mapRender.mock.calls
      .map(([props]) => props as Record<string, unknown>)
      .filter(props => props.interactive === false)
    expect(activeMaps[activeMaps.length - 1]).toMatchObject({ highlightFill: '#0891b2' })
  })

  it('keeps the active Recite geography rail on its start-time order snapshot', async () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'FR')
    localStorage.setItem(CONTINENT_METADATA_STORAGE_KEY, JSON.stringify([{ continentId: 'europe', subregionOrder: ['northern-europe', 'western-europe'], updatedAt: 9 }]))
    const mount = await renderRecite(entries)
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Western Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const rail = () => mount.querySelector('[aria-labelledby="world-countries-recite-session-geography-heading"]') as HTMLElement
    const initial = rail().textContent ?? ''
    expect(initial.indexOf('Northern Europe')).toBeLessThan(initial.indexOf('Western Europe'))

    await act(async () => {
      setContinentMetadata({ continentId: 'europe', subregionOrder: ['western-europe', 'northern-europe'], updatedAt: 10 })
      await Promise.resolve()
    })

    const afterImport = rail().textContent ?? ''
    expect(afterImport.indexOf('Northern Europe')).toBeLessThan(afterImport.indexOf('Western Europe'))
  })

  it('retains Europe while selecting Asia and runs one continuous World-ordered session', async () => {
    vi.useFakeTimers()
    const entries = countries.filter(country => ['NO', 'IN', 'JP'].includes(country.id))
    const mount = await renderRecite(entries)

    await act(async () => mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.click())
    await act(async () => openContinent(mount, 'Asia'))
    await act(async () => buttonContaining(mount, 'South Asia').click())
    await act(async () => goToWorld(mount))

    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.getAttribute('aria-checked')).toBe('true')
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Asia"]')?.getAttribute('aria-checked')).toBe('mixed')
    expect(mount.textContent).toContain('2 Continents · 2 Subregions · 2 Countries selected')

    await act(async () => buttonContaining(mount, 'Start Recite').click())
    const activeRail = () => mount.querySelector('[aria-labelledby="world-countries-recite-session-geography-heading"]') as HTMLElement
    expect(activeMapProps()).toMatchObject({ continent: 'Europe', highlightedCountryIds: ['NO'] })
    expect(activeRail().textContent).toContain('Europe')
    expect(activeRail().textContent).toContain('Northern Europe')
    expect(activeRail().textContent).toContain('Asia')
    expect(activeRail().textContent).toContain('South Asia')
    expect(activeRail().querySelectorAll('[data-current-continent="true"]')).toHaveLength(1)
    expect(activeRail().querySelector('[data-current-continent="true"]')?.textContent).toContain('Europe')

    const norwayInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')!
    await act(async () => {
      typeInto(norwayInput, 'Norway')
      norwayInput.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(activeMapProps()).toMatchObject({ continent: 'Asia', highlightedCountryIds: ['IN'] })
    expect(mount.querySelector('[data-current-continent="true"]')?.textContent).toContain('Asia')

    const indiaInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')!
    await act(async () => {
      typeInto(indiaInput, 'India')
      indiaInput.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Recite complete')
    expect(mount.textContent).toContain('World · 2 Countries')
    expect(JSON.parse(localStorage.getItem(RECITE_PROGRESS_STORAGE_KEY) ?? '{}')).toMatchObject({
      outcomes: { countries: { NO: { outcome: 'recalled' }, IN: { outcome: 'recalled' } } },
    })
    await act(async () => buttonContaining(mount, 'Recite again').click())
    expect(activeMapProps()).toMatchObject({ continent: 'Europe', highlightedCountryIds: ['NO'] })
  })

  it('supports World select-all, clear, and semantic none/all Continent state', async () => {
    const entries = countries.filter(country => ['NO', 'IN'].includes(country.id))
    const mount = await renderRecite(entries)

    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.getAttribute('aria-checked')).toBe('false')
    await act(async () => buttonContaining(mount, 'Select all World').click())
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.getAttribute('aria-checked')).toBe('true')
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Asia"]')?.getAttribute('aria-checked')).toBe('true')
    expect(mount.textContent).toContain('2 Continents')

    await act(async () => buttonContaining(mount, 'Clear').click())
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.getAttribute('aria-checked')).toBe('false')
    expect(mount.querySelector<HTMLButtonElement>('[aria-label="Select Asia"]')?.getAttribute('aria-checked')).toBe('false')
    expect(mount.textContent).toContain('0 Continents')
    expect(buttonContaining(mount, 'Choose a ready Country scope').disabled).toBe(true)
  })

  it('starts from World or a Continent with the same combined Country snapshot', async () => {
    vi.useFakeTimers()
    const entries = countries.filter(country => ['NO', 'IN'].includes(country.id))
    const mount = await renderRecite(entries)
    await act(async () => mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.click())
    await act(async () => openContinent(mount, 'Asia'))
    await act(async () => buttonContaining(mount, 'South Asia').click())
    await act(async () => goToWorld(mount))

    await act(async () => buttonContaining(mount, 'Start Recite').click())
    const fromWorldSequence = [activeMapProps().highlightedCountryIds]
    const worldInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')!
    await act(async () => {
      typeInto(worldInput, 'Norway')
      worldInput.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    fromWorldSequence.push(activeMapProps().highlightedCountryIds)
    await act(async () => buttonContaining(mount, 'Back to setup').click())
    await act(async () => openContinent(mount, 'Europe'))
    await act(async () => buttonContaining(mount, 'Start Recite').click())
    const fromContinentSequence = [activeMapProps().highlightedCountryIds]
    const continentInput = mount.querySelector<HTMLInputElement>('input[aria-label="Type the country name"]')!
    await act(async () => {
      typeInto(continentInput, 'Norway')
      continentInput.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    fromContinentSequence.push(activeMapProps().highlightedCountryIds)

    expect(fromWorldSequence).toEqual([['NO'], ['IN']])
    expect(fromContinentSequence).toEqual(fromWorldSequence)
  })

  it('keeps Reveal as you go scoped to the continuous run across a Continent boundary', async () => {
    vi.useFakeTimers()
    const entries = countries.filter(country => ['NO', 'IN'].includes(country.id))
    const mount = await renderRecite(entries)
    await act(async () => selectRadio(mount, 4))
    await act(async () => mount.querySelector<HTMLButtonElement>('[aria-label="Select Europe"]')?.click())
    await act(async () => openContinent(mount, 'Asia'))
    await act(async () => buttonContaining(mount, 'South Asia').click())
    await act(async () => goToWorld(mount))
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    expect(activeMapProps()).toMatchObject({ continent: 'Europe', hiddenCountryIds: ['NO'] })
    await act(async () => buttonContaining(mount, 'Reveal / Skip').click())
    expect(activeMapProps()).toMatchObject({ hiddenCountryIds: [] })
    await act(async () => {
      vi.advanceTimersByTime(1800)
      await Promise.resolve()
    })
    expect(activeMapProps()).toMatchObject({ continent: 'Asia', hiddenCountryIds: ['IN'] })
  })
})
