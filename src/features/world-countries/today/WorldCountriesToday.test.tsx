// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const loadHistoryMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Map())))
const buildPlanMock = vi.hoisted(() => vi.fn())
const capitalLearningFlowMock = vi.hoisted(() => vi.fn())
const activeCountries = [countries[0]]
let milestoneWritten = false

vi.mock('@/app/settings/SettingsContext', () => ({
  useSettings: () => ({ settings: { worldCountriesFuzzyAnswerMatching: false, worldCountriesNewItemsPerSet: 3 } }),
}))
vi.mock('@/app/layout/PageLayoutContext', () => ({ usePageLayoutPresentation: vi.fn(), useRails: vi.fn() }))
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
vi.mock('@/features/world-countries/learning/flows/CountryLearningFlow', () => ({
  CountryLearningFlow: (props: Record<string, unknown>) => {
    const handoff = props.completionHandoff as { description: string; label: string; onContinue: () => void } | undefined
    return createElement('div', { 'data-testid': 'country-learning-flow' }, [
      createElement('button', {
        key: 'complete',
        type: 'button',
        'data-testid': 'complete-country-learning',
        onClick: () => {
          milestoneWritten = true
          markSubregionCountriesLearned(countries[0].subregionId, Date.now(), activeCountries)
        },
      }, 'Finish Country Learning'),
      handoff ? createElement('button', {
        key: 'handoff',
        type: 'button',
        'data-testid': 'country-learning-handoff',
        onClick: handoff.onContinue,
      }, `${handoff.description} ${handoff.label}`) : null,
    ])
  },
}))
vi.mock('@/features/world-countries/learning/flows/CapitalLearningFlow', () => ({
  CapitalLearningFlow: (props: Record<string, unknown>) => {
    capitalLearningFlowMock(props)
    return createElement('div', { 'data-testid': 'capital-learning-flow' }, 'Capital Learning flow')
  },
}))
vi.mock('./todayPlan', async importOriginal => ({
  ...await importOriginal<typeof import('./todayPlan')>(),
  buildWorldCountriesTodayPlan: buildPlanMock,
}))
vi.mock('./TodayReviewSession', () => ({
  TodayReviewSession: (props: Record<string, unknown>) => createElement('button', {
    type: 'button',
    'data-testid': 'today-review',
    'data-review-mode': props.mode,
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
  capitalLearningFlowMock.mockReset()
  milestoneWritten = false
  localStorage.clear()
})

describe('World Countries Today', () => {
  it('focuses the review action after finishing a review block', async () => {
    buildPlanMock.mockReturnValue({
      dueCandidates: [{}],
      reviewQueue: [{}],
      consolidationCandidates: [],
      consolidationQueue: [],
      dueCount: 1,
      dueCountryCount: 1,
      introductions: new Map(),
      nextLearning: null,
      incompleteCountryCount: 1,
      incompleteSubregionLabels: [],
      scopeComplete: false,
      caughtUpForToday: false,
      action: { kind: 'review', candidates: [{}] },
    })
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    const reviewAction = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Review 1 item')
    act(() => reviewAction?.click())
    await act(async () => {
      const finishReview = [...mount.querySelectorAll('button')].find(button => button.textContent === 'Finish review')
      finishReview?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(document.activeElement?.textContent).toBe('Review 1 item')
  })

  it('delegates the specific Country Learning action to the recommended flow', async () => {
    buildPlanMock.mockReturnValue({
      dueCandidates: [],
      reviewQueue: [],
      consolidationCandidates: [],
      consolidationQueue: [],
      dueCount: 0,
      dueCountryCount: 0,
      introductions: new Map(),
      nextLearning: {
        track: 'learn-countries',
        subregionId: countries[0].subregionId,
        continent: countries[0].continent,
        subregionLabel: 'Northern Europe',
      },
      incompleteCountryCount: 1,
      incompleteSubregionLabels: ['Northern Europe'],
      scopeComplete: false,
      caughtUpForToday: false,
      action: { kind: 'learn', recommendation: {
        track: 'learn-countries',
        subregionId: countries[0].subregionId,
        continent: countries[0].continent,
        subregionLabel: 'Northern Europe',
        countryIds: [countries[0].id],
      } },
    })
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    await act(async () => {
      [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Learn 1 country')?.click()
    })

    expect(mount.querySelector('[data-testid="country-learning-flow"]')).not.toBeNull()
  })

  it('offers the latest post-milestone learn-capitals action and launches it directly', async () => {
    const country = activeCountries[0]
    const initialPlan = {
      dueCandidates: [], reviewQueue: [], consolidationCandidates: [], consolidationQueue: [], dueCount: 0, dueCountryCount: 0,
      introductions: new Map(),
      nextLearning: { track: 'learn-countries', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe' },
      incompleteCountryCount: 1, incompleteSubregionLabels: ['Northern Europe'], scopeComplete: false, caughtUpForToday: false,
      action: { kind: 'learn', recommendation: { track: 'learn-countries', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe', countryIds: [country.id] } },
    }
    const postMilestonePlan = {
      ...initialPlan,
      nextLearning: { track: 'learn-capitals', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe' },
      action: { kind: 'learn', recommendation: { track: 'learn-capitals', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe', countryIds: [country.id] } },
    }
    buildPlanMock.mockImplementation(() => milestoneWritten ? postMilestonePlan : initialPlan)
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    await act(async () => {
      [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Learn 1 country')?.click()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Next: add the capitals to these countries.')
    expect(mount.textContent).toContain('Add the capitals')
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-handoff"]')?.click()
    })

    expect(mount.querySelector('[data-testid="country-learning-flow"]')).toBeNull()
    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: country.subregionId,
      entries: [country],
    }))
  })

  it.each([
    ['review', 'Review 1 item', 'review'],
    ['consolidate', 'Strengthen 1 item', 'consolidation'],
  ] as const)('replaces the completed Learning run before a %s handoff', async (kind, label, mode) => {
    const country = activeCountries[0]
    const initialPlan = {
      dueCandidates: [], reviewQueue: [], consolidationCandidates: [], consolidationQueue: [], dueCount: 0, dueCountryCount: 0,
      introductions: new Map(),
      nextLearning: { track: 'learn-countries', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe' },
      incompleteCountryCount: 1, incompleteSubregionLabels: ['Northern Europe'], scopeComplete: false, caughtUpForToday: false,
      action: { kind: 'learn', recommendation: { track: 'learn-countries', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe', countryIds: [country.id] } },
    }
    const postMilestonePlan = {
      ...initialPlan,
      dueCandidates: kind === 'review' ? [{}] : [],
      reviewQueue: kind === 'review' ? [{}] : [],
      consolidationCandidates: kind === 'consolidate' ? [{}] : [],
      consolidationQueue: kind === 'consolidate' ? [{}] : [],
      dueCount: kind === 'review' ? 1 : 0,
      caughtUpForToday: kind === 'consolidate',
      action: kind === 'review' ? { kind: 'review', candidates: [{ country }] } : { kind: 'consolidate', candidates: [{ country }] },
    }
    buildPlanMock.mockImplementation(() => milestoneWritten ? postMilestonePlan : initialPlan)
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    await act(async () => {
      [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Learn 1 country')?.click()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain(label)
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-handoff"]')?.click()
    })

    expect(mount.querySelector('[data-testid="country-learning-flow"]')).toBeNull()
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe(mode)
  })

  it('passes recall-derived Country establishment into Capital Learning presentation', async () => {
    const country = activeCountries[0]
    const countryItemId = `world-countries:location-to-country:${country.id}`
    loadHistoryMock.mockResolvedValueOnce(new Map([[countryItemId, [
      { itemId: countryItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: countryItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
    ]]]))
    buildPlanMock.mockReturnValue({
      dueCandidates: [], reviewQueue: [], consolidationCandidates: [], consolidationQueue: [], dueCount: 0, dueCountryCount: 0,
      introductions: new Map(),
      nextLearning: { track: 'learn-capitals', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe' },
      incompleteCountryCount: 1, incompleteSubregionLabels: ['Northern Europe'], scopeComplete: false, caughtUpForToday: false,
      action: { kind: 'learn', recommendation: { track: 'learn-capitals', subregionId: country.subregionId, continent: country.continent, subregionLabel: 'Northern Europe', countryIds: [country.id] } },
    })
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    await act(async () => {
      [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Add the capitals')?.click()
    })

    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ countriesEstablished: true }))
    expect(capitalLearningFlowMock.mock.calls[0]?.[0]).not.toHaveProperty('countriesLearned')
  })

  it('starts targeted consolidation instead of generic Play when the scope is unfinished', async () => {
    buildPlanMock.mockReturnValue({
      dueCandidates: [],
      reviewQueue: [],
      consolidationCandidates: [{}],
      consolidationQueue: [{}],
      dueCount: 0,
      dueCountryCount: 0,
      introductions: new Map(),
      nextLearning: null,
      incompleteCountryCount: 1,
      incompleteSubregionLabels: ['Northern Europe'],
      scopeComplete: false,
      caughtUpForToday: true,
      action: { kind: 'consolidate', candidates: [{}] },
    })
    const mount = document.createElement('div')
    document.body.append(mount)

    await act(async () => {
      root = createRoot(mount)
      root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn() }))
      await Promise.resolve()
    })
    expect(mount.textContent).toContain('Strengthen 1 item')
    expect([...mount.querySelectorAll<HTMLButtonElement>('button')].filter(button => button.textContent === 'Strengthen 1 item')).toHaveLength(1)
    await act(async () => {
      [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Strengthen 1 item')?.click()
    })

    expect(mount.textContent).toContain('Finish review')
  })
})
