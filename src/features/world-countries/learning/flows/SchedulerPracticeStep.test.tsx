// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Country } from '@/features/world-countries/data/countries'
import { createSchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { SchedulerPracticeStep } from './SchedulerPracticeStep'

vi.mock('@/features/world-countries/learning/CountryLearningMap', () => ({
  CountryLearningMap: () => createElement('div', { 'data-testid': 'country-learning-map' }),
}))

const country: Country = {
  id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe',
  subregionId: 'northern-europe', subregion: 'Northern Europe',
}
const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('SchedulerPracticeStep', () => {
  it('can render typed Combined practice without a map-location prompt', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    const session = createSchedulerLearningSession([country.id], settings)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SchedulerPracticeStep, {
        continent: 'Europe', entries: [country], session,
        stepLabel: 'Combined practice', questionLabel: 'Country name',
        questionTitle: 'Name the country', answerLabel: 'Type the country name',
        placeholder: 'Type the country…', showCountryName: false, showMap: false,
        promptText: 'Name the country', evaluateAnswer: () => ({ correct: true, fuzzyMatch: false, canonicalAnswer: country.country }),
        formatFeedback: () => 'Correct.', onSubmit: vi.fn(), onBack: vi.fn(), onExit: vi.fn(),
      }))
    })

    expect(mount.textContent).toContain('Name the country')
    expect(mount.querySelector('[data-testid="country-learning-map"]')).toBeNull()
  })
})
