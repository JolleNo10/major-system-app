// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { countryCapitalMnemonicId } from './geographyMnemonicIds'
import { CountryCapitalMnemonicPanel } from './CountryCapitalMnemonicPanel'

const viewProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const editorProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))

vi.mock('./GeographyMnemonicView', () => ({
  GeographyMnemonicView: (props: Record<string, unknown>) => {
    viewProps.current = props
    return createElement('div', null, props.headerAction as ReactNode)
  },
}))

vi.mock('./GeographyMnemonicEditor', () => ({
  GeographyMnemonicEditor: (props: Record<string, unknown>) => {
    editorProps.current = props
    return createElement('div', null, props.headerAction as ReactNode)
  },
}))

const norway: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const sweden: Country = {
  id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe',
}

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  viewProps.current = null
  editorProps.current = null
})

function renderPanel(mount: HTMLElement, country: Country) {
  act(() => {
    root = createRoot(mount)
    root.render(createElement(CountryCapitalMnemonicPanel, {
      country,
      refreshKey: 0,
      onChanged: vi.fn(),
    }))
  })
}

describe('CountryCapitalMnemonicPanel', () => {
  it('uses one Country ↔ Capital target for both viewing and editing', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    renderPanel(mount, norway)

    expect(viewProps.current?.targetId).toBe(countryCapitalMnemonicId(norway))
    expect(mount.textContent).toContain('Edit mnemonics')

    act(() => mount.querySelector<HTMLButtonElement>('button')?.click())
    expect(editorProps.current?.targetId).toBe(countryCapitalMnemonicId(norway))
    expect(mount.textContent).toContain('Close mnemonic editor')
  })

  it('switches the existing target when the current Country changes', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    renderPanel(mount, norway)

    act(() => root?.render(createElement(CountryCapitalMnemonicPanel, {
      country: sweden,
      refreshKey: 0,
      onChanged: vi.fn(),
    })))

    expect(viewProps.current?.targetId).toBe(countryCapitalMnemonicId(sweden))
    expect(viewProps.current?.targetId).not.toBe(countryCapitalMnemonicId(norway))
  })
})
