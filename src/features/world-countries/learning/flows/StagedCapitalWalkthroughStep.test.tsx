// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { StagedCapitalWalkthroughStep } from './StagedCapitalWalkthroughStep'

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
})

describe('Capital Learning Review keyboard behavior', () => {
  it('allows arrows from navigation buttons while preserving input ownership', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const onMove = vi.fn()
    act(() => {
      root = createRoot(mount)
      root.render(createElement(StagedCapitalWalkthroughStep, {
        entries, index: 0, onMove, onContinue: vi.fn(),
      }))
    })

    const next = mount.querySelector<HTMLButtonElement>('[data-primary-action]')
    next?.focus()
    act(() => next?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(onMove).toHaveBeenCalledWith(1)

    onMove.mockClear()
    const input = document.createElement('input')
    mount.append(input)
    input.focus()
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(onMove).not.toHaveBeenCalled()
  })
})
