import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { markSubregionCapitalsLearned, markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { WORLD_COUNTRIES_PROGRESS_LABELS, getCountryProgressColor } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES } from '@/features/world-countries/learning/scopeProgress'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const loadHistoryMock = vi.hoisted(() => vi.fn(() => Promise.resolve(new Map())))
const buildPlanMock = vi.hoisted(() => vi.fn())
const useRailsMock = vi.hoisted(() => vi.fn())
const geographyOverviewMapMock = vi.hoisted(() => vi.fn())
const countryLearningFlowMock = vi.hoisted(() => vi.fn())
const capitalLearningFlowMock = vi.hoisted(() => vi.fn())
let activeCountries = [countries[0]]
let milestoneWritten = false
let capitalMilestoneWritten = false

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
vi.mock('@/features/world-countries/maps/GeographyOverviewMap', () => ({
  GeographyOverviewMap: (props: Record<string, unknown>) => {
    geographyOverviewMapMock(props)
    return null
  },
}))
vi.mock('@/features/world-countries/learning/flows/CountryLearningFlow', () => ({
  CountryLearningFlow: (props: Record<string, unknown>) => {
    countryLearningFlowMock(props)
    const handoff = props.completionHandoff as { description: string; label: string; onContinue: () => void; stopLabel?: string; onStop?: () => void } | undefined
    const regionCompletion = props.regionCompletion as { masteryStatus: string } | undefined
    const completedRegionAction = props.completedRegionAction as { label: string; onAction: () => void } | undefined
    return createElement('div', { 'data-testid': 'country-learning-flow' }, [
      createElement('button', {
        key: 'complete',
        type: 'button',
        'data-testid': 'complete-country-learning',
        onClick: () => {
          milestoneWritten = true
          markSubregionCountriesLearned(props.subregion as typeof countries[number]['subregionId'], Date.now(), activeCountries)
        },
      }, 'Finish Country Learning'),
      completedRegionAction ? createElement('button', { key: 'region-action', type: 'button', 'data-testid': 'country-learning-region-action', onClick: completedRegionAction.onAction }, completedRegionAction.label) : null,
      regionCompletion ? createElement('p', { key: 'region', 'data-testid': 'country-region-completion' }, `Region learned · Mastery ${regionCompletion.masteryStatus}`) : null,
      createElement('button', {
        key: 'done',
        type: 'button',
        'data-testid': 'country-learning-done',
        onClick: props.onDone as () => void,
      }, 'Back to Home'),
      handoff?.onStop && handoff.stopLabel ? createElement('button', {
        key: 'stop',
        type: 'button',
        'data-testid': 'country-learning-stop',
        onClick: handoff.onStop,
      }, handoff.stopLabel) : null,
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
    const handoff = props.completionHandoff as { description: string; label: string; onContinue: () => void; stopLabel?: string; onStop?: () => void } | undefined
    const regionCompletion = props.regionCompletion as { masteryStatus: string } | undefined
    const completedRegionAction = props.completedRegionAction as { label: string; onAction: () => void } | undefined
    return createElement('div', { 'data-testid': 'capital-learning-flow' }, [
      createElement('button', {
        key: 'complete',
        type: 'button',
        'data-testid': 'complete-capital-learning',
        onClick: () => {
          capitalMilestoneWritten = true
          markSubregionCapitalsLearned(props.subregion as typeof countries[number]['subregionId'], Date.now(), activeCountries)
        },
      }, 'Finish Capital Learning'),
      completedRegionAction ? createElement('button', { key: 'region-action', type: 'button', 'data-testid': 'capital-learning-region-action', onClick: completedRegionAction.onAction }, completedRegionAction.label) : null,
      regionCompletion ? createElement('p', { key: 'region', 'data-testid': 'region-completion' }, `Region learned · Mastery ${regionCompletion.masteryStatus}`) : null,
      handoff ? createElement('button', {
        key: 'handoff',
        type: 'button',
        'data-testid': 'capital-learning-handoff',
        onClick: handoff.onContinue,
      }, `${handoff.description} ${handoff.label}`) : null,
      handoff?.onStop && handoff.stopLabel ? createElement('button', {
        key: 'stop',
        type: 'button',
        'data-testid': 'capital-learning-stop',
        onClick: handoff.onStop,
      }, handoff.stopLabel) : null,
      createElement('button', {
        key: 'done',
        type: 'button',
        'data-testid': 'capital-learning-done',
        onClick: props.onDone as () => void,
      }, 'Back to Home'),
    ])
  },
}))
vi.mock('./todayPlan', async importOriginal => ({
  ...await importOriginal<typeof import('./todayPlan')>(),
  buildWorldCountriesTodayPlan: buildPlanMock,
}))
vi.mock('./TodayReviewSession', () => ({
  TodayReviewSession: (props: Record<string, unknown>) => createElement('div', null,
    createElement('span', { 'data-review-candidate-count': String((props.candidates as readonly unknown[]).length) }),
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
  loadHistoryMock.mockImplementation(() => Promise.resolve(new Map()))
  buildPlanMock.mockReset()
  geographyOverviewMapMock.mockReset()
  capitalLearningFlowMock.mockReset()
  countryLearningFlowMock.mockReset()
  useRailsMock.mockReset()
  activeCountries = [countries[0]]
  milestoneWritten = false
  capitalMilestoneWritten = false
  localStorage.clear()
})

function recommendation(track: 'learn-countries' | 'learn-capitals', countryIds: readonly string[] = [countries[0].id], country = countries.find(candidate => candidate.id === countryIds[0]) ?? countries[0]) {
  return {
    track,
    subregionId: country.subregionId,
    continent: country.continent,
    subregionLabel: country.subregion,
    countryIds,
  }
}

function plan(overrides: Record<string, unknown> = {}) {
  const curriculumRecommendation = overrides.curriculumRecommendation ?? null
  return {
    dueCandidates: [],
    reviewQueue: [],
    consolidationCandidates: [],
    consolidationQueue: [],
    dueCount: 0,
    dueCountryCount: 0,
    introductions: new Map(),
    curriculumRecommendation,
    plannerFocusSubregionId: null,
    curriculumRecommendationsBySubregion: curriculumRecommendation
      ? new Map([[(curriculumRecommendation as { subregionId: string }).subregionId, curriculumRecommendation]])
      : new Map(),
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
  it('uses a compact authoritative map legend instead of the large Home mastery summary', async () => {
    const mount = await renderToday()
    const legend = mount.querySelector('[data-testid="world-countries-map-legend"]')
    const states = [...legend?.querySelectorAll<HTMLElement>('[data-progress-state]') ?? []]

    expect(mount.querySelector('[data-testid="world-mastery-summary"]')).toBeNull()
    expect(legend?.getAttribute('aria-label')).toBe('Map progress states')
    expect(states.map(entry => entry.dataset.progressState)).toEqual([...WORLD_COUNTRIES_COUNTRY_CORE_STATES])
    expect(states.map(entry => entry.textContent)).toEqual(WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => WORLD_COUNTRIES_PROGRESS_LABELS[state]))
    expect(states.map(entry => entry.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.backgroundColor)).toEqual(
      WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => {
        const expectedSwatch = document.createElement('span')
        expectedSwatch.style.backgroundColor = getCountryProgressColor(state)
        return expectedSwatch.style.backgroundColor
      }),
    )
  })

  it('does not open Progress while recall evidence is unavailable', async () => {
    loadHistoryMock.mockRejectedValueOnce(new Error('storage unavailable'))
    const mount = await renderToday()
    const railMount = renderLatestRails()
    const progressAction = railMount.querySelector<HTMLButtonElement>('[data-progress-action]')

    expect(progressAction?.disabled).toBe(true)

    await act(async () => progressAction?.click())

    expect(mount.querySelector('#world-countries-progress-heading')).toBeNull()
  })

  it('places the derived World progress in the geography footer and opens the existing Progress view', async () => {
    const mount = await renderToday()
    const railMount = renderLatestRails()
    const progressEntry = railMount.querySelector('[data-progress-entry]')

    expect(progressEntry?.textContent).toContain('World progress')
    expect(progressEntry?.textContent).toContain('0 / 1 complete')
    expect(progressEntry?.textContent).toContain('0%')
    expect(railMount.querySelector('[aria-label="World Countries secondary actions"]')).toBeNull()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-progress-action]')?.click())

    expect(mount.querySelector('#world-countries-progress-heading')?.textContent).toBe('World progress')
  })

  it('uses the current Continent scope for the geography progress footer', async () => {
    activeCountries = countries.filter(country => country.continent === 'Europe').slice(0, 2)
    const mount = await renderToday({ continent: 'Europe' })
    const railMount = renderLatestRails()

    expect(railMount.querySelector('[data-progress-entry]')?.textContent).toContain('Europe progress')
    expect(railMount.querySelector('[data-progress-entry]')?.textContent).toContain('0 / 2 complete')

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-progress-action]')?.click())

    expect(mount.querySelector('#world-countries-progress-heading')?.textContent).toBe('Europe progress')
  })

  it('names the planner-derived World focus and associates its Continent rail row', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    const northernRecommendation = recommendation('learn-countries', [northern.id], northern)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: northernRecommendation,
      plannerFocusSubregionId: northern.subregionId,
    }))

    const mount = await renderToday()
    const railMount = renderLatestRails()
    const mapProps = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]?.[0] as { selectedSubregionIds?: readonly string[]; selectionPresentation?: string } | undefined

    expect(mount.querySelector('[data-active-subregion]')?.textContent).toContain('Northern Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Focus · Northern Europe')
    expect(mapProps?.selectedSubregionIds).toEqual(['northern-europe'])
    expect(mapProps?.selectionPresentation).toBe('outline-only')
  })

  it('shows Review and Continue Learning independently when both are available', async () => {
    const northernEntries = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 5)
    const southernEntry = countries.find(country => country.subregionId === 'southern-europe')!
    activeCountries = [...northernEntries, southernEntry]
    const reviewCandidates = [{ country: southernEntry }, { country: southernEntry }]
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: reviewCandidates,
      reviewQueue: reviewCandidates,
      dueCount: 20,
      dueCountryCount: 15,
      curriculumRecommendation: recommendation('learn-countries', northernEntries.map(country => country.id)),
      plannerFocusSubregionId: 'northern-europe',
      incompleteCountryCount: activeCountries.length,
      incompleteSubregionLabels: ['Northern Europe', 'Southern Europe'],
      reviewOpportunity: { kind: 'review', candidates: reviewCandidates },
    }))

    const mount = await renderToday({ continent: 'Europe' })
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Review ready')
    expect(railMount.textContent).toContain('20 items ready')
    expect(railMount.textContent).toContain('Next review: 2 items')
    expect(railMount.querySelector('[data-review-action]')?.textContent).toBe('Review 2 now')
    expect(railMount.textContent).not.toContain('20 ready overall')
    expect(railMount.textContent).toContain('Your journey · Northern Europe')
    expect(railMount.textContent).not.toContain('Next in journey')
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Learn 5 countries')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Continue your journey')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Learn 5 countries · Northern Europe')
  })

  it('keeps equal total and bounded Review counts from duplicating the item count across Home surfaces', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate, candidate, candidate, candidate, candidate],
      reviewQueue: [candidate, candidate, candidate, candidate, candidate],
      dueCount: 5,
      dueCountryCount: 2,
      reviewReasonSummary: { mistakes: 1, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
      reviewOpportunity: { kind: 'review', candidates: [candidate, candidate, candidate, candidate, candidate] },
    }))

    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.querySelector('[data-review-action]')?.textContent).toBe('Review 5 now')
    expect(railMount.textContent).toContain('5 items ready')
    expect(railMount.textContent).not.toContain('Next review:')
    expect(railMount.textContent).not.toContain('2 countries')
    expect(railMount.textContent).not.toContain('recent mistake')
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

  it('shows the full scheduled Review total while launching only the bounded block', async () => {
    const candidate = { country: countries[0] }
    const reviewQueue = Array.from({ length: 8 }, () => candidate)
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: Array.from({ length: 20 }, () => candidate),
      reviewQueue,
      dueCount: 20,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: reviewQueue },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('20 items ready')
    expect(railMount.textContent).toContain('Next review: 8 items')
    expect(railMount.querySelector('[data-review-action]')?.textContent).toBe('Review 8 now')

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('8')
  })

  it('returns focus to the Review action after completion without focusing Journey', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
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
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Learn 1 country')
    expect(document.activeElement).toBe(reviewAction)
    expect(railMount.querySelector('[data-review-completion]')).toBeNull()
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
      plannerFocusSubregionId: 'northern-europe',
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    })
    const caughtUpPlan = plan({
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
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
      plannerFocusSubregionId: 'northern-europe',
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
    const countryIds = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 5).map(country => country.id)
    activeCountries = countries.filter(country => countryIds.includes(country.id))
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries', countryIds),
      plannerFocusSubregionId: 'northern-europe',
    }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: 'northern-europe',
      entries: countryIds.map(countryId => countries.find(country => country.id === countryId)),
      newItemsPerSet: 3,
    }))
  })

  it('uses one selected Subregion for the rail, Journey, dock, and Learning launch', async () => {
    const northernEntries = countries.filter(country => country.subregionId === 'northern-europe').slice(0, 3)
    const southernEntry = countries.find(country => country.subregionId === 'southern-europe')!
    const northernRecommendation = recommendation('learn-countries', northernEntries.map(country => country.id))
    const southernRecommendation = recommendation('learn-countries', [southernEntry.id], southernEntry)
    activeCountries = [...northernEntries, southernEntry]
    const reviewCandidates = [{ country: southernEntry }, { country: southernEntry }]
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: reviewCandidates,
      reviewQueue: reviewCandidates,
      dueCount: 20,
      dueCountryCount: 15,
      curriculumRecommendation: northernRecommendation,
      curriculumRecommendationsBySubregion: new Map([
        ['northern-europe', northernRecommendation],
        ['southern-europe', southernRecommendation],
      ]),
      plannerFocusSubregionId: 'northern-europe',
      incompleteCountryCount: activeCountries.length,
      incompleteSubregionLabels: ['Northern Europe', 'Southern Europe'],
      reviewOpportunity: { kind: 'review', candidates: reviewCandidates },
    }))
    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Southern Europe'))?.click())
    railMount = renderLatestRails()

    const mapProps = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]?.[0] as { selectedSubregionIds?: readonly string[]; selectionPresentation?: string } | undefined
    expect(railMount.textContent).toContain('Your journey · Southern Europe')
    expect(railMount.textContent).not.toContain("You're viewing")
    expect(railMount.textContent).not.toContain('Journey focus')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Southern Europe')
    expect(mapProps?.selectedSubregionIds).toEqual(['southern-europe'])
    expect(mapProps?.selectionPresentation).toBe('outline-only')
    expect(railMount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')?.textContent).not.toContain('Review scope: Southern Europe')
    expect(mount.querySelector('[data-active-subregion]')?.textContent).toContain('Southern Europe')
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Learn 1 country · Southern Europe')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: 'southern-europe' }))
  })

  it('falls back to the planner focus when the selected Subregion leaves the active population', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    activeCountries = [northern, central]
    buildPlanMock.mockImplementation(() => {
      const first = activeCountries[0]!
      const firstRecommendation = recommendation('learn-countries', [first.id], first)
      return plan({
        curriculumRecommendation: firstRecommendation,
        plannerFocusSubregionId: first.subregionId,
        curriculumRecommendationsBySubregion: new Map(activeCountries.map(country => [
          country.subregionId,
          recommendation('learn-countries', [country.id], country),
        ])),
      })
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Central Europe'))?.click())
    railMount = renderLatestRails()
    expect(railMount.textContent).toContain('Your journey · Central Europe')

    await act(async () => {
      activeCountries = [northern]
      root?.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn(), continent: 'Europe' }))
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Your journey · Northern Europe')
    expect(railMount.textContent).not.toContain('Central Europe')
    const mapProps = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]?.[0] as { selectedSubregionIds?: readonly string[] } | undefined
    expect(mapProps?.selectedSubregionIds).toEqual(['northern-europe'])
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Northern Europe')
  })

  it('shows weak-spot practice alongside Journey Learning when reviews are caught up', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      reviewOpportunity: { kind: 'consolidate', candidates: [candidate] },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Reviews caught up')
    expect(railMount.textContent).toContain('Strengthen 1 now')
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Learn 1 country')
    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
  })

  it('shows the full weak-spot total while launching only the bounded consolidation block', async () => {
    const candidate = { country: countries[0] }
    const consolidationQueue = Array.from({ length: 8 }, () => candidate)
    buildPlanMock.mockReturnValue(plan({
      consolidationCandidates: Array.from({ length: 20 }, () => candidate),
      consolidationQueue,
      reviewOpportunity: { kind: 'consolidate', candidates: consolidationQueue },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('20 weak spots available')
    expect(railMount.textContent).toContain('Next practice: 8 items')
    expect(railMount.querySelector('[data-review-action]')?.textContent).toBe('Strengthen 8 now')

    act(() => railMount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('8')
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
      plannerFocusSubregionId: 'northern-europe',
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Reviews caught up')
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Learn 1 country')
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

  it('keeps a selected learned Subregion active without fabricating a Learning CTA', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    activeCountries = [northern, central]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, Date.now(), activeCountries)
    const centralRecommendation = recommendation('learn-countries', [central.id], central)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: centralRecommendation,
      plannerFocusSubregionId: central.subregionId,
      curriculumRecommendationsBySubregion: new Map([
        [central.subregionId, centralRecommendation],
        [northern.subregionId, null],
      ]),
    }))

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Northern Europe'))?.click())
    railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Learning complete · Northern Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Northern Europe')
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
    expect(mount.querySelector('[data-task-scope-context]')).toBeNull()
  })

  it('hands Learning completion to the next Journey recommendation, not Review', async () => {
    const country = activeCountries[0]
    const initialPlan = plan({
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
    })
    const postMilestonePlan = plan({
      dueCandidates: [{ country: countries[0] }],
      reviewQueue: [{ country: countries[0] }],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-capitals'),
      plannerFocusSubregionId: 'northern-europe',
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

  it('keeps Country to Capital continuation inside an out-of-order selected Subregion', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    activeCountries = [northern, central]
    const northernRecommendation = recommendation('learn-countries', [northern.id], northern)
    const centralCountryRecommendation = recommendation('learn-countries', [central.id], central)
    const centralCapitalRecommendation = recommendation('learn-capitals', [central.id], central)
    const initialPlan = plan({
      curriculumRecommendation: northernRecommendation,
      plannerFocusSubregionId: northern.subregionId,
      curriculumRecommendationsBySubregion: new Map([
        [northern.subregionId, northernRecommendation],
        [central.subregionId, centralCountryRecommendation],
      ]),
    })
    const postCountryPlan = plan({
      curriculumRecommendation: northernRecommendation,
      plannerFocusSubregionId: northern.subregionId,
      curriculumRecommendationsBySubregion: new Map([
        [northern.subregionId, northernRecommendation],
        [central.subregionId, centralCapitalRecommendation],
      ]),
    })
    buildPlanMock.mockImplementation(() => milestoneWritten ? postCountryPlan : initialPlan)

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Central Europe'))?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: central.subregionId }))

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.textContent).toContain('Next: add the capitals to these countries.')
    expect(mount.textContent).not.toContain('Start Northern Europe')
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-handoff"]')?.click())
    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: central.subregionId }))
  })

  it('presents a learned Capital region before offering the exact next planner recommendation', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    const initialPlan = plan({
      curriculumRecommendation: recommendation('learn-capitals', [northern.id], northern),
      plannerFocusSubregionId: northern.subregionId,
    })
    const nextRecommendation = recommendation('learn-countries', [western.id], western)
    const postMilestonePlan = plan({
      curriculumRecommendation: nextRecommendation,
      plannerFocusSubregionId: western.subregionId,
    })
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten ? postMilestonePlan : initialPlan)
    const onNavigate = vi.fn()
    const mount = await renderToday({ continent: 'Europe', onNavigate })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="region-completion"]')?.textContent).toContain('Region learned')
    expect(mount.textContent).toContain('Start Western Europe')
    expect(mount.textContent).toContain('Back to Europe')
    expect(mount.querySelector('[data-testid="capital-learning-region-action"]')?.textContent).toBe('Drill Northern Europe')
    expect(mount.textContent).not.toContain('Learn again')
    expect(mount.textContent).not.toContain('Learn 1 country')
    expect(countryLearningFlowMock).not.toHaveBeenCalled()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-region-action"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', subregionId: northern.subregionId })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-handoff"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: western.subregionId,
      entries: [western],
    }))
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-testid="country-learning-flow"]')).toBeNull()
    expect(mount.querySelector('[data-task-scope-context]')?.textContent).toContain('Western Europe')
  })

  it('recognizes a Country-finished region boundary from post-milestone readiness truth', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    const capitalItemId = `world-countries:country-to-capital:${northern.id}`
    loadHistoryMock.mockImplementation(() => Promise.resolve(new Map([[capitalItemId, [
      { itemId: capitalItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10' },
      { itemId: capitalItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11' },
    ]]])))
    const initialPlan = plan({
      curriculumRecommendation: recommendation('learn-countries', [northern.id], northern),
      plannerFocusSubregionId: northern.subregionId,
    })
    const nextRecommendation = recommendation('learn-countries', [western.id], western)
    const postMilestonePlan = plan({
      curriculumRecommendation: nextRecommendation,
      plannerFocusSubregionId: western.subregionId,
    })
    buildPlanMock.mockImplementation(() => milestoneWritten ? postMilestonePlan : initialPlan)
    const mount = await renderToday({ continent: 'Europe' })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="country-region-completion"]')?.textContent).toContain('Region learned')
    expect(mount.textContent).toContain('Start Western Europe')
    expect(mount.textContent).toContain('Back to Europe')
    expect(mount.textContent).not.toContain('Add the capitals')
    expect(capitalLearningFlowMock).not.toHaveBeenCalled()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-handoff"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: western.subregionId,
      entries: [western],
    }))
  })

  it('orients Home toward mastery development after curriculum Learning is complete', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, Date.now(), activeCountries)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: null,
      plannerFocusSubregionId: northern.subregionId,
      scopeComplete: true,
    }))
    const mount = await renderToday({ continent: 'Europe' })

    expect(mount.querySelector('[data-primary-action]')).toBeNull()
    const railMount = renderLatestRails()
    expect(railMount.textContent).toContain('Learning complete')
    expect(railMount.textContent).toContain('Mastery')
    expect(railMount.textContent).toContain('Building through Review')
    expect(railMount.textContent).not.toContain('Journey focus')
    expect([...railMount.querySelectorAll('[data-journey-milestone]')].every(node => node.getAttribute('data-journey-status') === 'complete')).toBe(true)
  })

  it('keeps a learned Capital region truthful when no next recommendation exists', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten
      ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
      : plan({ curriculumRecommendation: recommendation('learn-capitals', [northern.id], northern), plannerFocusSubregionId: northern.subregionId }))
    const onNavigate = vi.fn()
    const mount = await renderToday({ continent: 'Europe', onNavigate })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="region-completion"]')).not.toBeNull()
    expect(mount.querySelector('[data-testid="capital-learning-handoff"]')).toBeNull()
    expect(mount.querySelector('[data-testid="capital-learning-region-action"]')?.textContent).toBe('Drill Northern Europe')
    expect(mount.textContent).not.toContain('Start Western Europe')
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-region-action"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', subregionId: northern.subregionId })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-testid="capital-learning-flow"]')).toBeNull()
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

    expect(mount.querySelector('[data-primary-action]')?.textContent).toBe('Add the capitals')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })

    expect(capitalLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ countriesEstablished: true }))
    expect(capitalLearningFlowMock.mock.calls[0]?.[0]).not.toHaveProperty('countriesLearned')
  })

  it('returns Home after Learning when no further Journey recommendation exists', async () => {
    const initialPlan = plan({ curriculumRecommendation: recommendation('learn-countries'), plannerFocusSubregionId: 'northern-europe' })
    const postMilestonePlan = plan({
      dueCandidates: [{ country: countries[0] }],
      reviewQueue: [{ country: countries[0] }],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [{ country: countries[0] }] },
      curriculumRecommendation: null,
      plannerFocusSubregionId: null,
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
