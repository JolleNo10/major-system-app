// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createCapitalLearningFlow, startCapitalRecall } from '@/features/world-countries/learning/capitalLearningFlow'
import { CapitalRecallStep } from './CapitalRecallStep'

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

describe('CapitalRecallStep', () => {
  it('reports the correction country only after an incorrect answer', () => {
    const onSubmit = vi.fn()
    const onCorrectionCountryChange = vi.fn()
    const mount = document.createElement('div')
    document.body.appendChild(mount)
    const flow = startCapitalRecall(createCapitalLearningFlow({ countryIds: [country.id], countriesLearned: true }), () => 0)

    act(() => {
      root = createRoot(mount)
      root.render(
        <CapitalRecallStep
          continent="Europe"
          entries={[country]}
          flow={flow}
          fuzzyMatching={false}
          onSubmit={onSubmit}
          onExit={() => undefined}
          onCorrectionCountryChange={onCorrectionCountryChange}
        />,
      )
    })

    expect(onCorrectionCountryChange).toHaveBeenLastCalledWith(null)
    const input = mount.querySelector<HTMLInputElement>('#capital-answer')!
    const form = mount.querySelector('form')!
    const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

    act(() => {
      setInputValue?.call(input, 'Bergen')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(onSubmit).toHaveBeenCalledWith(false)
    expect(onCorrectionCountryChange).toHaveBeenLastCalledWith('IS')
  })
})
