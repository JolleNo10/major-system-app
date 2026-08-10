// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Country } from '@/features/world-countries/data/countries'
import { SubregionOverview } from './SubregionOverview'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => <div data-testid="country-learning-map" />,
}))

const entries: Country[] = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
]

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
})

function renderOverview(capitalsLearned: boolean, onStartCapitals = vi.fn(), onPracticeCapitals = vi.fn()): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <SubregionOverview
        continent="Europe"
        subregion="northern-europe"
        entries={entries}
        learned={false}
        capitalsLearned={capitalsLearned}
        onStart={() => undefined}
        onPracticeStageB={() => undefined}
        onStartCapitals={onStartCapitals}
        onPracticeCapitals={onPracticeCapitals}
      />,
    )
  })
  return container
}

describe('Subregion Capital overview', () => {
  it('exposes an ungated Capital action and recommends Countries first', () => {
    const onStartCapitals = vi.fn()
    const container = renderOverview(false, onStartCapitals)
    expect(container.textContent).toContain('Recommended after learning the countries.')
    const button = [...container.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Start learning capitals'))
    expect(button).toBeTruthy()

    act(() => button!.click())
    expect(onStartCapitals).toHaveBeenCalledTimes(1)
  })

  it('shows the durable review status after Capital completion', () => {
    const onPracticeCapitals = vi.fn()
    const container = renderOverview(true, vi.fn(), onPracticeCapitals)
    expect(container.textContent).toContain('You completed a clean Country → Capital recall round.')
    expect(container.textContent).toContain('Review capitals')
    const button = [...container.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Practice capital recall'))
    expect(button).toBeTruthy()

    act(() => button!.click())
    expect(onPracticeCapitals).toHaveBeenCalledTimes(1)
  })
})
