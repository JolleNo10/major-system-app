// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const loadHistoryMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Map())))
const buildPlanMock = vi.hoisted(() => vi.fn())
const activeCountries = [countries[0]]

vi.mock('@/app/settings/SettingsContext', () => ({
  useSettings: () => ({ settings: { worldCountriesFuzzyAnswerMatching: false } }),
}))
vi.mock('@/app/layout/PageLayoutContext', () => ({ usePageLayoutPresentation: vi.fn() }))
vi.mock('@/features/world-countries/WorldCountriesPopulationContext', () => ({
  useWorldCountriesPopulation: () => activeCountries,
}))
vi.mock('@/features/world-countries/geography/effectiveOrder', () => ({
  getWorldCountriesInEffectiveOrder: () => ({ countries: activeCountries, subregionIds: [countries[0].subregionId] }),
}))
vi.mock('@/features/world-countries/learning/recallHistory', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/world-countries/learning/recallHistory')>(),
  loadWorldCountriesRecallHistory: loadHistoryMock,
}))
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({ GeographyOverviewMap: () => null }))
vi.mock('@/features/world-countries/ui/WorldMasterySummary', () => ({ WorldMasterySummary: () => null }))
vi.mock('./TodayRails', () => ({ TodayHomeRails: () => null }))
vi.mock('./todayPlan', async importOriginal => ({
  ...await importOriginal<typeof import('./todayPlan')>(),
  buildWorldCountriesTodayPlan: buildPlanMock,
}))
vi.mock('./TodayReviewSession', () => ({
  TodayReviewSession: (props: Record<string, unknown>) => createElement('button', {
    type: 'button',
    onClick: () => (props.onDone as (checkpoint: Record<string, number>) => void)({
      reviewed: 1,
      correctFirstTry: 1,
      recoveredOnRetry: 0,
      stillNeedsWork: 0,
    }),
  }, 'Finish review'),
}))

import { WorldCountriesToday } from './WorldCountriesToday'

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  loadHistoryMock.mockClear()
  buildPlanMock.mockReset()
})

describe('World Countries Today', () => {
  it('focuses Continue review after finishing a review block', async () => {
    buildPlanMock.mockReturnValue({
      dueCandidates: [{}],
      reviewQueue: [{}],
      dueCount: 1,
      dueCountryCount: 1,
      introductions: new Map(),
      nextLearning: null,
    })
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    const continueReview = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Continue review')
    act(() => continueReview?.click())
    await act(async () => {
      const finishReview = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Finish review')
      finishReview?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.activeElement?.textContent).toBe('Continue review')
  })
})
