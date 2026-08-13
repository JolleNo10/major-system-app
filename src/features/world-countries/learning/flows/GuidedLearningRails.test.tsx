// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { GuidedLearningRails } from './GuidedLearningRails'

const useRailsMock = vi.hoisted(() => vi.fn())
vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicView', () => ({ GeographyMnemonicView: () => null }))
vi.mock('@/features/world-countries/mnemonics/GeographyMnemonicEditor', () => ({ GeographyMnemonicEditor: () => null }))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  useRailsMock.mockReset()
})

function renderRails(phase: 'walkthrough' | 'location-practice') {
  const mount = document.createElement('div')
  document.body.append(mount)
  const onOrderDraftChanged = vi.fn()
  act(() => {
    root = createRoot(mount)
    root.render(createElement(GuidedLearningRails, {
      continent: 'Europe',
      subregion: 'northern-europe',
      entries,
      activeCountries: entries,
      phase,
      track: 'countries',
      learned: false,
      capitalsLearned: false,
      mnemonicVersion: 0,
      onGeographyChanged: vi.fn(),
      onMnemonicChanged: vi.fn(),
      onOrderDraftChanged,
    }))
  })
  return { mount, onOrderDraftChanged, config: useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode } }
}

describe('GuidedLearningRails contextual authoring visibility', () => {
  it('shows order and mnemonic actions in a stable Learning rail', () => {
    const { mount, config } = renderRails('walkthrough')
    act(() => root?.render(createElement('div', null, config.left)))
    expect(mount.textContent).toContain('Edit order')
    expect(mount.textContent).toContain('Edit mnemonics')
    expect(mount.querySelector('.rounded-xl.border.border-zinc-800.bg-zinc-900')).not.toBeNull()
  })

  it('hides authoring and discards any draft during active location recall', () => {
    const { config, onOrderDraftChanged } = renderRails('location-practice')
    expect(config.left).toBeUndefined()
    expect(onOrderDraftChanged).toHaveBeenCalledWith(null)
  })
})
