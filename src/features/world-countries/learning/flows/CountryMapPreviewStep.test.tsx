// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { CountryMapPreviewStep } from './CountryMapPreviewStep'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: ({ showNames, showHoverNames }: { showNames?: boolean; showHoverNames?: boolean }) => (
    <div
      data-testid="country-learning-map"
      data-show-names={String(showNames)}
      data-show-hover-names={String(showHoverNames)}
    />
  ),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const country: Country = {
  id: 'IS',
  country: 'Iceland',
  capital: 'Reykjavík',
  continent: 'Europe',
  subregionId: 'northern-europe',
  subregion: 'Northern Europe',
}

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('CountryMapPreviewStep', () => {
  it('shows the scoped map names before starting the walkthrough', async () => {
    const onStart = vi.fn()
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(
        <CountryMapPreviewStep
          continent="Europe"
          entries={[country]}
          onStart={onStart}
          onExit={() => undefined}
        />,
      )
      await Promise.resolve()
    })

    const map = mount.querySelector('[data-testid="country-learning-map"]')
    expect(map?.getAttribute('data-show-names')).toBe('true')
    expect(map?.getAttribute('data-show-hover-names')).toBe('true')
    expect(mount.textContent).toContain('Intro')

    await act(async () => {
      ;[...mount.querySelectorAll('button')].find(button => button.textContent === 'Start walkthrough')?.click()
    })
    expect(onStart).toHaveBeenCalledOnce()
  })
})
