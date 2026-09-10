import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const loadHistoryMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Map())))
const buildPlanMock = vi.hoisted(() => vi.fn())
const useRailsMock = vi.hoisted(() => vi.fn())
const countryLearningFlowMock = vi.hoisted(() => vi.fn())
const capitalLearningFlowMock = vi.hoisted(() => vi.fn())
let activeCountries = [countries[0]]
let milestoneWritten = false

vi.mock('@/app/settings/SettingsContext', () => ({
  useSettings: () => ({ settings: { worldCountriesFuzzyAnswerMatching: false, worldCountriesNewItemsPerSet: 3 } }),
}))
vi.mock('@/app/layout/PageLayoutContext', () => ({ usePageLayoutPresentation: vi.fn(), useRails: useRailsMock }))
vi.mock('@/features/world-countries/WorldCountriesPopulationContext', () => ({
  useWorldCountriesPopulation: () => activeCountries,
}))
vi.mock('@/features/world-countries/geography/effectiveOrder', () => ({
  getWorldCountriesInEffectiveOrder: () => ({ countries: activeCountries, subregionIds: [...new Set(activeCountries.map(country => country.subregionId))] }),
}))
vi.mock('@/features/world-countries/learning/recallHistory', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/world-countries/learning/recallHistory')>(),
  loadWorldCountriesRecallHistory: loadHistoryMock,
}))
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({ GeographyOverviewMap: () => null }))
vi.mock('@/features/world-countries/ui/WorldMasterySummary', () => ({ WorldMasterySummary: () => null }))
vi.mock('@/features/world-countries/learning/flows/CountryLearningFlow', () => ({
  CountryLearningFlow: (props: Record<string, unknown>) => {
    countryLearningFlowMock(props)
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
      createElement('button', {
        key: 'done',
        type: 'button',
        'data-testid': 'country-learning-done',
        onClick: props.onDone as () => void,
      }, 'Back to Home'),
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
  TodayReviewSession: (props: Record<string, unknown>) => createElement('div', null,
    createElement('button', {
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
    createElement('button', {
      type: 'button',
      'data-testid': 'today-review-exit',
      onClick: props.onExit as () => void,
    }, 'Exit review'),
  ),
}))

import { WorldCountriesToday } from './WorldCountriesToday'

let root: Root | null = null
let railRoot: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  act(() => railRoot?.unmount())
  root = null
  railRoot = null
  document.body.replaceChildren()
  loadHistoryMock.mockClear()
  buildPlanMock.mockReset()
  capitalLearningFlowMock.mockReset()
  countryLearningFlowMock.mockReset()
  useRailsMock.mockReset()
  activeCountries = [countries[0]]
  milestoneWritten = false
  localStorage.clear()
})

function recommendation(track: 'learn-countries' | 'learn-capitals', countryIds: readonly string[] = [countries[0].id]) {
  return {
    track,
    subregionId: countries[0].subregionId,
    continent: countries[0].continent,
    subregionLabel: 'Northern Europe',
    countryIds,
  }
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    dueCandidates: [],
    reviewQueue: [],
    consolidationCandidates: [],
    consolidationQueue: [],
    dueCount: 0,
    dueCountryCount: 0,
    introductions: new Map(),
    curriculumRecommendation: null,
    journeyFocusSubregionId: null,
    incompleteCountryCount: 1,
    incompleteSubregionLabels: ['Northern Europe'],
    scopeComplete: false,
    reviewReasonSummary: { mistakes: 0, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
    reviewOpportunity: null,
    ...overrides,
  }
}

async function renderToday(props: Partial<Parameters<typeof WorldCountriesToday>[0]> = {}) {
  const mount = document.createElement('div')
  document.body.append(mount)
  await act(async () => {
    root = createRoot(mount)
    root.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn(), ...props }))
    await Promise.resolve()
  })
  return mount
}

function renderLatestRails() {
  act(() => railRoot?.unmount())
  const config = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode; right?: ReactNode } | undefined
  const railMount = document.createElement('div')
  document.body.append(railMount)
  railRoot = createRoot(railMount)
  act(() => railRoot?.render(createElement('div', null, config?.left, config?.right)))
  return railMount
}

describe('World Countries Today', () => {
  it('shows Review and Continue Learning independently when both are available', async () => {
    const northernEntries = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 3)
    const southernEntry = countries.find(country => country.subregionId === 'southern-europe')!
    activeCountries = [...northernEntries, southernEntry]
    const reviewCandidates = [{ country: southernEntry }, { country: southernEntry }]
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: reviewCandidates,
      reviewQueue: reviewCandidates,
      dueCount: 20,
      dueCountryCount: 15,
      curriculumRecommendation: recommendation('learn-countries', northernEntries.map(country => country.id)),
      journeyFocusSubregionId: 'northern-europe',
      incompleteCountryCount: activeCountries.length,
      incompleteSubregionLabels: ['Northern Europe', 'Southern Europe'],
      reviewOpportunity: { kind: 'review', candidates: reviewCandidates },
    }))

    const mount = await renderToday({ continent: 'Europe' })
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Review ready')
    expect(railMount.textContent).toContain('Review 2 items')
    expect(railMount.textContent).toContain('20 ready overall')
    expect(railMount.textContent).toContain('Your journey · Northern Europe')
    expect(railMount.textContent).not.toContain('Next in journey')
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Continue learning')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Continue your journey')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Learn 3 countries · Northern Europe')
  })

  it('keeps equal total and bounded Review counts from duplicating the item count across Home surfaces', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate, candidate, candidate],
      reviewQueue: [candidate, candidate, candidate],
      dueCount: 3,
      dueCountryCount: 2,
      reviewReasonSummary: { mistakes: 1, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
      reviewOpportunity: { kind: 'review', candidates: [candidate, candidate, candidate] },
    }))

    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Review 3 items')
    expect(railMount.textContent).toContain('2 countries')
    expect(railMount.textContent).toContain('recent mistake')
    expect(railMount.textContent).not.toContain('3 reviews ready')
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })

  it('launches Review from the independent panel', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('review')
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })

  it('returns focus to the Review action after completion without focusing Journey', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()
    let railMount = renderLatestRails()

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    const reviewAction = railMount.querySelector<HTMLButtonElement>('[data-review-action]')
    expect(reviewAction).not.toBeNull()
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Continue learning')
    expect(document.activeElement).toBe(reviewAction)
    expect(railMount.textContent).toContain('Last review: 1 reviewed · 1 first try · 0 recovered')
  })

  it('does not focus Journey when Review completion leaves no Review opportunity', async () => {
    const candidate = { country: countries[0] }
    let reviewCompleted = false
    const initialPlan = plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    })
    const caughtUpPlan = plan({
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
    })
    buildPlanMock.mockImplementation(() => reviewCompleted ? caughtUpPlan : initialPlan)
    const mount = await renderToday()
    let railMount = renderLatestRails()

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    await act(async () => {
      reviewCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    renderLatestRails()

    const journeyAction = mount.querySelector<HTMLButtonElement>('[data-primary-action]')
    expect(journeyAction).not.toBeNull()
    expect(document.activeElement).not.toBe(journeyAction)
  })

  it('returns focus to Review after exiting while the opportunity remains', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()
    let railMount = renderLatestRails()

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review-exit"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    const reviewAction = railMount.querySelector<HTMLButtonElement>('[data-review-action]')
    expect(reviewAction).not.toBeNull()
    expect(document.activeElement).toBe(reviewAction)
    expect(railMount.querySelector('[data-review-completion]')).toBeNull()
  })

  it('launches the Journey recommendation from the map dock', async () => {
    const countryIds = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 3).map(country => country.id)
    activeCountries = countries.filter(country => countryIds.includes(country.id))
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries', countryIds),
      journeyFocusSubregionId: 'northern-europe',
    }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: 'northern-europe',
      entries: countryIds.map(countryId => countries.find(country => country.id === countryId)),
    }))
  })

  it('keeps inspected geography local while the dock continues the guided Journey', async () => {
    const northernEntries = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 3)
    const southernEntry = countries.find(country => country.subregionId === 'southern-europe')!
    activeCountries = [...northernEntries, southernEntry]
    const reviewCandidates = [{ country: southernEntry }, { country: southernEntry }]
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: reviewCandidates,
      reviewQueue: reviewCandidates,
      dueCount: 20,
      dueCountryCount: 15,
      curriculumRecommendation: recommendation('learn-countries', northernEntries.map(country => country.id)),
      journeyFocusSubregionId: 'northern-europe',
      incompleteCountryCount: activeCountries.length,
      incompleteSubregionLabels: ['Northern Europe', 'Southern Europe'],
      reviewOpportunity: { kind: 'review', candidates: reviewCandidates },
    }))
    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Southern Europe'))?.click())
    railMount = renderLatestRails()

    expect(railMount.textContent).toContain("You're viewing Southern Europe")
    expect(railMount.textContent).toContain('Your journey is still focused on Northern Europe')
    expect(railMount.textContent).toContain('Journey focus')
    expect(railMount.textContent).toContain('Review scope: Southern Europe')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Learn 3 countries · Northern Europe')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain("You're inspecting Southern Europe")

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: 'northern-europe' }))
  })

  it('shows weak-spot practice alongside Journey Learning when reviews are caught up', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      reviewOpportunity: { kind: 'consolidate', candidates: [candidate] },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Reviews caught up')
    expect(railMount.textContent).toContain('Strengthen weak spots')
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Continue learning')
    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
  })

  it('labels completed weak-spot practice as practice after returning Home', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      reviewOpportunity: { kind: 'consolidate', candidates: [candidate] },
    }))
    const mount = await renderToday()
    let railMount = renderLatestRails()

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Last practice: 1 practised')
    expect(railMount.textContent).not.toContain('Last review:')
  })

  it('shows a caught-up Review state while keeping Journey Learning available', async () => {
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Reviews caught up')
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Continue learning')
  })

  it('does not render a fake Journey dock when only Review is available', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })

  it('hands Learning completion to the next Journey recommendation, not Review', async () => {
    const country = activeCountries[0]
    const initialPlan = plan({
      curriculumRecommendation: recommendation('learn-countries'),
      journeyFocusSubregionId: 'northern-europe',
    })
    const postMilestonePlan = plan({
      dueCandidates: [{ country: countries[0] }],
      reviewQueue: [{ country: countries[0] }],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-capitals'),
      journeyFocusSubregionId: 'northern-europe',
      reviewOpportunity: { kind: 'review', candidates: [{ country: countries[0] }] },
    })
    buildPlanMock.mockImplementation(() => milestoneWritten ? postMilestonePlan : initialPlan)
    const mount = await renderToday()
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Next: add the capitals to these countries.')
    expect(mount.textContent).toContain('Add the capitals')
    expect(mount.textContent).not.toContain('Review 1 item')
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-handoff"]')?.click())
    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: country.subregionId }))
  })

  it('passes recall-derived Country establishment into Capital Learning', async () => {
    const country = activeCountries[0]
    const countryItemId = `world-countries:location-to-country:${country.id}`
    loadHistoryMock.mockResolvedValueOnce(new Map([[countryItemId, [
      { itemId: countryItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: countryItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
    ]]]))
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-capitals') }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })

    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ countriesEstablished: true }))
    expect(capitalLearningFlowMock.mock.calls[0]?.[0]).not.toHaveProperty('countriesLearned')
  })

  it('returns Home after Learning when no further Journey recommendation exists', async () => {
    const initialPlan = plan({ curriculumRecommendation: recommendation('learn-countries'), journeyFocusSubregionId: 'northern-europe' })
    const postMilestonePlan = plan({
      dueCandidates: [{ country: countries[0] }],
      reviewQueue: [{ country: countries[0] }],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [{ country: countries[0] }] },
      curriculumRecommendation: null,
      journeyFocusSubregionId: null,
    })
    buildPlanMock.mockImplementation(() => milestoneWritten ? postMilestonePlan : initialPlan)
    const mount = await renderToday()
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="country-learning-handoff"]')).toBeNull()
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-testid="country-learning-flow"]')).toBeNull()
    const railMount = renderLatestRails()
    expect(railMount.querySelector('[data-review-action]')).not.toBeNull()
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })
})
