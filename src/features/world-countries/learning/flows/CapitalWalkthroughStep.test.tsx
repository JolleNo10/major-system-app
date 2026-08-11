// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createCapitalLearningFlow } from '@/features/world-countries/learning/capitalLearningFlow'
import { CapitalWalkthroughStep } from './CapitalWalkthroughStep'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => <div data-testid="country-learning-map" />,
}))

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

describe('CapitalWalkthroughStep', () => {
  it('keeps the relationship summary compact', () => {
    const mount = document.createElement('div')
    document.body.appendChild(mount)

    act(() => {
      root = createRoot(mount)
      root.render(
        <CapitalWalkthroughStep
          continent="Europe"
          entries={[country]}
          flow={createCapitalLearningFlow({ countryIds: [country.id], countriesLearned: true })}
          onMove={() => undefined}
          onStartRecall={() => undefined}
          onExit={() => undefined}
        />,
      )
    })

    const relationshipPanel = mount.querySelector('[aria-labelledby="capital-relationship-heading"]')
    expect(relationshipPanel).not.toBeNull()
    expect(relationshipPanel?.className).toContain('py-3')
    expect(relationshipPanel?.className).not.toContain('p-4')
    expect(relationshipPanel?.querySelector('h2')?.textContent).toBe('Iceland')
    expect(relationshipPanel?.textContent).toContain('Reykjavík')
  })
})
