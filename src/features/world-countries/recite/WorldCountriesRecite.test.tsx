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

    expect(mount.textContent).toContain('Choose a Continent to enter its Recite setup.')
    expect(mount.textContent).toContain('Countries + Capitals')
    expect(mount.textContent).toContain('Countries from Capitals')
    expect(mount.textContent).toContain('Visible')
    expect(mount.querySelector<HTMLButtonElement>('button:disabled')?.textContent).toContain('Choose a ready Country scope')

    await act(async () => buttonContaining(mount, 'Europe').click())
    expect(mount.textContent).toContain('Select one or more Subregions')
    expect(mount.querySelector<HTMLButtonElement>('button:disabled')?.textContent).toContain('Choose a ready Country scope')

    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    expect(buttonContaining(mount, 'Start Recite').disabled).toBe(false)
  })

  it('keeps a wrong typed answer active, then completes and persists only Recite progress', async () => {
    const mount = await renderRecite()
    await act(async () => buttonContaining(mount, 'Europe').click())
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const activeMap = () => {
      const activeMaps = mapRender.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter(props => props.interactive === false)
      return activeMaps[activeMaps.length - 1]
    }
    expect(activeMap()?.highlightedCountryIds).toEqual(['NO'])

    const input = mount.querySelector<HTMLInputElement>('input[placeholder="Type the country…"]')
    expect(input).not.toBeNull()
    await act(async () => {
      typeInto(input!, 'Sweden')
      input?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Not quite. Try again')
    expect(mount.querySelector<HTMLInputElement>('input[placeholder="Type the country…"]')).not.toBeNull()

    await act(async () => {
      typeInto(mount.querySelector<HTMLInputElement>('input[placeholder="Type the country…"]')!, 'Norway')
      mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct. Norway')
    expect(mount.textContent).not.toContain('Recite complete')

    await act(async () => buttonContaining(mount, 'Continue').click())
    expect(mount.textContent).toContain('Recite complete')
    expect(JSON.parse(localStorage.getItem(RECITE_PROGRESS_STORAGE_KEY) ?? '{}')).toMatchObject({
      version: 1,
      outcomes: { countries: { NO: { outcome: 'recovered' } } },
    })
    expect(localStorage.getItem('world-countries:capital-to-country:NO')).toBeNull()
  })

  it('runs the Countries + Capitals prompts in order and supports Enter continuation', async () => {
    const mount = await renderRecite()
    await act(async () => selectRadio(mount, 1))
    await act(async () => buttonContaining(mount, 'Europe').click())
    await act(async () => buttonContaining(mount, 'Northern Europe').click())
    await act(async () => buttonContaining(mount, 'Start Recite').click())

    const countryInput = mount.querySelector<HTMLInputElement>('input[placeholder="Type the country…"]')
    expect(countryInput).not.toBeNull()
    await act(async () => {
      typeInto(countryInput!, 'Norway')
      countryInput?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct. Norway')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(mount.textContent).toContain('Capital of Norway')

    const capitalInput = mount.querySelector<HTMLInputElement>('input[placeholder="Type the capital…"]')
    await act(async () => {
      typeInto(capitalInput!, 'Oslo')
      capitalInput?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(mount.textContent).toContain('Correct. Oslo')
  })

  it('wires Reveal as you go to hidden Country IDs and reveals the Country after Skip', async () => {
    const mount = await renderRecite()
    await act(async () => selectRadio(mount, 4))
    await act(async () => buttonContaining(mount, 'Europe').click())
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
    expect(mount.textContent).toContain('Answer: Norway')
    expect(activeMap()?.hiddenCountryIds).toEqual([])
  })

  it('keeps the active Recite geography rail on its start-time order snapshot', async () => {
    const entries = countries.filter(country => country.id === 'NO' || country.id === 'FR')
    localStorage.setItem(CONTINENT_METADATA_STORAGE_KEY, JSON.stringify([{ continentId: 'europe', subregionOrder: ['northern-europe', 'western-europe'], updatedAt: 9 }]))
    const mount = await renderRecite(entries)
    await act(async () => buttonContaining(mount, 'Europe').click())
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
})
