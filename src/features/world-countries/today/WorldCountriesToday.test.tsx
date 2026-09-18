import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { markSubregionCapitalsLearned, markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES, WORLD_COUNTRIES_PROGRESS_LABELS, getCountryProgressColor } from '@/features/world-countries/learning/progressPresentation'
import { JOURNEY_PREFERENCE_STORAGE_KEY } from './journeyPreferenceStore'

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
  getWorldCountriesInEffectiveOrder: (population: readonly { subregionId: string }[] = activeCountries) => ({ countries: population, subregionIds: [...new Set(population.map(country => country.subregionId))] }),
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
    const completionCelebration = props.completionCelebration as string | undefined
    const completedRegionAction = props.completedRegionAction as { label: string; onAction: () => void } | undefined
    return createElement('div', { 'data-testid': 'country-learning-flow' }, [
      completionCelebration ? createElement('span', { key: 'celebration', 'data-celebration-level': completionCelebration }) : null,
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
      createElement('button', {
        key: 'exit',
        type: 'button',
        'data-testid': 'country-learning-exit',
        onClick: props.onExit as () => void,
      }, 'Exit Learning'),
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
    const completionCelebration = props.completionCelebration as string | undefined
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
      completionCelebration ? createElement('span', { key: 'celebration', 'data-celebration-level': completionCelebration }) : null,
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
      createElement('button', {
        key: 'exit',
        type: 'button',
        'data-testid': 'capital-learning-exit',
        onClick: props.onExit as () => void,
      }, 'Exit Learning'),
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
    consolidationPressure: {
      establishedNonMasteredTargetCount: 0,
      fragileTargetCount: 0,
      fragileRatio: 0,
      isHigh: false,
    },
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

function configureContinentCompletionPlans({
  continentRecommendation,
  worldRecommendation,
  continentReviewOpportunity = null,
}: {
  continentRecommendation: ReturnType<typeof recommendation> | null
  worldRecommendation: ReturnType<typeof recommendation> | null
  continentReviewOpportunity?: { kind: 'review' | 'consolidate'; candidates: readonly unknown[] } | null
}) {
  buildPlanMock.mockImplementation((input: { activeCountries: readonly unknown[] }) => {
    if (input.activeCountries.length === activeCountries.length) {
      return plan({ curriculumRecommendation: worldRecommendation })
    }
    return plan({
      curriculumRecommendation: continentRecommendation,
      plannerFocusSubregionId: continentRecommendation?.subregionId ?? null,
      reviewOpportunity: continentReviewOpportunity,
    })
  })
}

describe('World Countries Today', () => {
  it('uses a compact authoritative map legend instead of the large Home mastery summary', async () => {
    const mount = await renderToday()
    const legend = mount.querySelector('[data-testid="world-countries-map-legend"]')
    const states = [...legend?.querySelectorAll<HTMLElement>('[data-progress-state]') ?? []]

    expect(mount.querySelector('[data-testid="world-mastery-summary"]')).toBeNull()
    expect(legend?.getAttribute('aria-label')).toBe('Map legend: learning and recall health')
    expect(states.map(entry => entry.dataset.progressState)).toEqual([...WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES])
    expect(states.map(entry => entry.textContent)).toEqual(WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES.map(state => WORLD_COUNTRIES_PROGRESS_LABELS[state]))
    expect(states.map(entry => entry.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.backgroundColor)).toEqual(
      WORLD_COUNTRIES_ATOMIC_PROFICIENCY_STATES.map(state => {
        const expectedSwatch = document.createElement('span')
        expectedSwatch.style.backgroundColor = getCountryProgressColor(state)
        return expectedSwatch.style.backgroundColor
      }),
    )
    const learningStates = [...legend?.querySelectorAll<HTMLElement>('[data-learning-state]') ?? []]
    expect(learningStates.map(entry => entry.textContent)).toEqual(['Not learned', 'Countries learned'])
    expect(learningStates[1]?.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.backgroundImage).toContain('135deg')
    expect(learningStates[1]?.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.backgroundImage).toContain('rgba(62, 55, 25, 0.46)')
    expect(learningStates[1]?.querySelector<HTMLElement>('[aria-hidden="true"]')?.style.backgroundImage).not.toContain('#d6c7ad')
    expect(legend?.textContent).toContain('Learning')
    expect(legend?.textContent).toContain('Recall health')
    expect(legend?.textContent).toContain('Not learned')
    expect(legend?.textContent).toContain('Countries learned')
    expect(legend?.textContent).not.toContain('Countries + Capitals learned')
    expect(legend?.textContent).toContain('Mastered')
    expect(legend?.textContent).toContain('Country = fill')
    expect(legend?.textContent).toContain('Capital = inner edge')
    expect(legend?.textContent).not.toContain('Complete')
  })

  it('keeps the center context concise on a Continent hub', async () => {
    const mount = await renderToday({ continent: 'Africa' })
    const heading = mount.querySelector('#world-countries-today-heading')

    expect(heading?.textContent).toBe('Africa')
    expect(mount.textContent).not.toContain('World Countries · Continent hub')
    expect(mount.textContent).not.toContain('Africa learning hub')
    expect(mount.textContent).not.toContain('Explore the map to see what you\'ve learned and what\'s still ahead.')
    expect(mount.querySelector('[aria-label="Learning"]')).not.toBeNull()
    expect(mount.querySelector('[aria-label="Recall health"]')).not.toBeNull()
  })

  it('uses the neutral diagonal pattern while Countries learning is established', async () => {
    markSubregionCountriesLearned(countries[0].subregionId, Date.now(), activeCountries)
    await renderToday()
    const mapProps = [...geographyOverviewMapMock.mock.calls].pop()?.[0] as {
      countryPatternsById?: ReadonlyMap<string, { kind: string }>
      countryColorsById?: ReadonlyMap<string, string>
      countryInnerGlowsById?: ReadonlyMap<string, { color: string }>
    } | undefined

    expect(mapProps?.countryPatternsById?.get(countries[0].id)?.kind).toBe('diagonal')
    expect(mapProps?.countryColorsById?.get(countries[0].id)).toBeUndefined()
    expect(mapProps?.countryInnerGlowsById?.get(countries[0].id)).toBeUndefined()
  })

  it('maps Country proficiency to fill and Capital proficiency to inner edge after handoff', async () => {
    const country = countries[0]
    const at = Date.now()
    markSubregionCountriesLearned(country.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(country.subregionId, at + 1, activeCountries)
    const countryItemId = `world-countries:location-to-country:${country.id}`
    const capitalItemId = `world-countries:country-to-capital:${country.id}`
    loadHistoryMock.mockResolvedValueOnce(new Map([
      [countryItemId, [
        { itemId: countryItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' },
        { itemId: countryItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11', attemptType: 'review' },
      ]],
      [capitalItemId, [
        { itemId: capitalItemId, at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' },
      ]],
    ]))
    await renderToday()
    const mapProps = [...geographyOverviewMapMock.mock.calls].pop()?.[0] as {
      countryColorsById?: ReadonlyMap<string, string>
      countryInnerGlowsById?: ReadonlyMap<string, { color: string }>
      countryAccessibleDescriptionsById?: ReadonlyMap<string, string>
    } | undefined

    expect(mapProps?.countryColorsById?.get(country.id)).toBe('#769A70')
    expect(mapProps?.countryInnerGlowsById?.get(country.id)?.color).toBe('#B5A678')
    expect(mapProps?.countryAccessibleDescriptionsById?.get(country.id)).toBe('Country recall: Strong. Capital recall: Developing.')
  })

  it('keeps the two map channels independent when Capital is stronger than Country', async () => {
    const country = countries[0]
    const at = Date.now()
    markSubregionCountriesLearned(country.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(country.subregionId, at + 1, activeCountries)
    const countryItemId = `world-countries:location-to-country:${country.id}`
    const capitalItemId = `world-countries:country-to-capital:${country.id}`
    loadHistoryMock.mockResolvedValueOnce(new Map([
      [countryItemId, [{ itemId: countryItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' }]],
      [capitalItemId, [
        { itemId: capitalItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' },
        { itemId: capitalItemId, at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11', attemptType: 'review' },
      ]],
    ]))
    await renderToday()
    const mapProps = [...geographyOverviewMapMock.mock.calls].pop()?.[0] as {
      countryColorsById?: ReadonlyMap<string, string>
      countryInnerGlowsById?: ReadonlyMap<string, { color: string }>
    } | undefined

    expect(mapProps?.countryColorsById?.get(country.id)).toBe('#B5A678')
    expect(mapProps?.countryInnerGlowsById?.get(country.id)?.color).toBe('#769A70')
  })

  it('exposes both recall and Learning dimensions in Country map descriptions', async () => {
    await renderToday()
    const mapProps = [...geographyOverviewMapMock.mock.calls].pop()?.[0] as {
      countryAccessibleDescriptionsById?: ReadonlyMap<string, string>
      countryPatternsById?: ReadonlyMap<string, unknown>
      countryEdgeTreatmentsById?: ReadonlyMap<string, string>
    } | undefined

    expect(mapProps?.countryAccessibleDescriptionsById?.get(countries[0].id)).toBe(
      'Learning: Not learned.',
    )
    expect(mapProps?.countryPatternsById?.get(countries[0].id)).toBeUndefined()
    expect(mapProps?.countryEdgeTreatmentsById).toBeUndefined()
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
    expect(progressEntry?.textContent).toContain('0 / 1 Countries fully mastered')
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
    expect(railMount.querySelector('[data-progress-entry]')?.textContent).toContain('0 / 2 Countries fully mastered')

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

    expect(mount.querySelector('[data-active-subregion]')?.textContent).toContain('Focus: Northern Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Focus · Northern Europe')
    expect(mapProps?.selectedSubregionIds).toEqual(['northern-europe'])
    expect(mapProps?.selectionPresentation).toBe('outline-only')
  })

  it('recommends Review while keeping Journey and Playground in the hub', async () => {
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
    const hub = mount.querySelector('[data-today-action-hub]')

    expect(railMount.textContent).toContain('Review ready')
    expect(railMount.textContent).toContain('20 items ready')
    expect(railMount.textContent).toContain('Next review: 2 items')
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(railMount.textContent).not.toContain('20 ready overall')
    expect(railMount.textContent).toContain('Your journey · Northern Europe')
    expect(railMount.textContent).not.toContain('Next in journey')
    expect(hub?.querySelector('[data-today-action="review"]')?.textContent).toContain('Review 2 now')
    expect(hub?.querySelector('[data-today-action="review"]')?.getAttribute('data-recommended')).toBe('true')
    expect(hub?.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 5 countries · Northern Europe')
    expect(hub?.querySelector('[data-today-action="playground"]')).not.toBeNull()
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

    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(railMount.textContent).toContain('5 items ready')
    expect(railMount.textContent).not.toContain('Next review:')
    expect(railMount.textContent).not.toContain('2 countries')
    expect(railMount.textContent).not.toContain('recent mistake')
    expect(railMount.textContent).not.toContain('3 reviews ready')
    expect(mount.querySelector('[data-today-action="review"]')?.textContent).toContain('Review 5 now')
  })

  it('launches Review from the recommended hub action', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()
    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('review')
    expect(mount.querySelector('[data-today-action="journey"]')).toBeNull()
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
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-today-action="review"]')?.textContent).toContain('Review 8 now')
    expect(mount.querySelector('[data-today-action="review"]')?.textContent).toContain('20 items due · next review 8')

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('8')
  })

  it('shows the Review completion popup and returns focus to the hub after Back', async () => {
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

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    expect(loadHistoryMock).toHaveBeenCalledTimes(2)
    const completionDialog = mount.querySelector('[data-testid="review-completion-dialog"]')
    expect(completionDialog?.textContent).toContain('Review complete!')
    expect(completionDialog?.querySelector('[data-completion-stat="Reviewed"]')?.textContent).toContain('1')
    expect(completionDialog?.querySelector('[data-completion-stat="First try"]')?.textContent).toContain('1')
    expect(completionDialog?.querySelector('[data-completion-stat="Recovered"]')?.textContent).toContain('0')
    expect(completionDialog?.querySelector('[data-completion-stat="Resolved"]')?.textContent).toContain('All')
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-continue"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-back"]')?.click())

    const reviewAction = mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')
    expect(reviewAction).not.toBeNull()
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Northern Europe')
    expect(document.activeElement).toBe(reviewAction)
    expect(railMount.querySelector('[data-review-completion]')).toBeNull()
  })

  it('focuses the new recommended hub action when Review completion leaves no Review opportunity', async () => {
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

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      reviewCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    renderLatestRails()

    const journeyAction = mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')
    expect(mount.querySelector('[data-testid="review-completion-continue"]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-back"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-back"]')?.click())
    railMount = renderLatestRails()

    expect(journeyAction).not.toBeNull()
    expect(document.activeElement).toBe(journeyAction)
    expect(railMount.textContent).toContain('Last review:')
  })

  it('continues with the freshly refreshed Review block and its bounded size', async () => {
    const candidate = { country: countries[0] }
    const nextCandidates = [candidate, candidate, candidate]
    let reviewCompleted = false
    buildPlanMock.mockImplementation(() => reviewCompleted
      ? plan({ reviewOpportunity: { kind: 'review', candidates: nextCandidates } })
      : plan({
          dueCandidates: [candidate],
          reviewQueue: [candidate],
          dueCount: 1,
          dueCountryCount: 1,
          reviewOpportunity: { kind: 'review', candidates: [candidate] },
        }))
    const mount = await renderToday()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      reviewCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="review-completion-continue"]')?.textContent).toContain('3 items')
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-continue"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-continue"]')?.click())

    expect(mount.querySelector('[data-testid="review-completion-dialog"]')).toBeNull()
    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('3')
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('review')
  })

  it('does not cross from Review to Strengthen after the refresh', async () => {
    const candidate = { country: countries[0] }
    let reviewCompleted = false
    buildPlanMock.mockImplementation(() => reviewCompleted
      ? plan({ reviewOpportunity: { kind: 'consolidate', candidates: [candidate, candidate] } })
      : plan({
          dueCandidates: [candidate],
          reviewQueue: [candidate],
          dueCount: 1,
          dueCountryCount: 1,
          reviewOpportunity: { kind: 'review', candidates: [candidate] },
        }))
    const mount = await renderToday()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      reviewCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="review-completion-continue"]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-back"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-back"]')?.click())

    expect(mount.querySelector('[data-today-action="strengthen"]')?.textContent).toContain('Strengthen 2')
    expect(mount.querySelector('[data-testid="today-review"]')).toBeNull()
  })

  it('keeps a completed set dismissible when the evidence refresh fails', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    loadHistoryMock
      .mockResolvedValueOnce(new Map())
      .mockRejectedValueOnce(new Error('refresh failed'))
    const mount = await renderToday()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="review-completion-dialog"]')?.textContent).toContain('Review complete!')
    expect(mount.querySelector('[data-testid="review-completion-continue"]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-back"]'))
  })

  it('continues Strengthen with another refreshed Strengthen block', async () => {
    const candidate = { country: countries[0] }
    const nextCandidates = [candidate, candidate, candidate]
    let strengthenCompleted = false
    buildPlanMock.mockImplementation(() => strengthenCompleted
      ? plan({ reviewOpportunity: { kind: 'consolidate', candidates: nextCandidates } })
      : plan({ reviewOpportunity: { kind: 'consolidate', candidates: [candidate] } }))
    const mount = await renderToday()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')

    await act(async () => {
      strengthenCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="review-completion-dialog"]')?.textContent).toContain('Strengthen complete!')
    expect(mount.querySelector('[data-testid="review-completion-continue"]')?.textContent).toContain('Next strengthen set')
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-continue"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-continue"]')?.click())

    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('3')
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
  })

  it('does not cross from Strengthen to Review after the refresh', async () => {
    const candidate = { country: countries[0] }
    let strengthenCompleted = false
    buildPlanMock.mockImplementation(() => strengthenCompleted
      ? plan({ reviewOpportunity: { kind: 'review', candidates: [candidate, candidate] } })
      : plan({ reviewOpportunity: { kind: 'consolidate', candidates: [candidate] } }))
    const mount = await renderToday()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
    await act(async () => {
      strengthenCompleted = true
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="review-completion-continue"]')).toBeNull()
    expect(document.activeElement).toBe(mount.querySelector('[data-testid="review-completion-back"]'))

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="review-completion-back"]')?.click())

    expect(mount.querySelector('[data-today-action="review"]')?.textContent).toContain('Review 2 now')
    expect(mount.querySelector('[data-testid="today-review"]')).toBeNull()
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

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="today-review-exit"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()

    const reviewAction = mount.querySelector<HTMLButtonElement>('[data-today-action="review"]')
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
      mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({
      subregion: 'northern-europe',
      entries: countryIds.map(countryId => countries.find(country => country.id === countryId)),
      newItemsPerSet: 3,
    }))
  })

  it('launches a same-Continent Journey immediately', async () => {
    const europe = countries.find(country => country.subregionId === 'central-europe')!
    activeCountries = [europe]
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [europe.id], europe) }))
    const mount = await renderToday({ continent: 'Europe', worldJourneyContinent: 'Europe' })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())

    expect(mount.querySelector('[role="dialog"]')).toBeNull()
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: europe.subregionId }))
  })

  it('asks before starting an Africa Journey while Europe is current', async () => {
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [africa]
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [africa.id], africa) }))
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Europe' })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())

    expect(mount.querySelector('[role="dialog"]')?.textContent).toContain('Make Africa your current journey?')
    expect(countryLearningFlowMock).not.toHaveBeenCalled()
  })

  it('learns the selected out-of-current-continent Subregion without persisting a switch', async () => {
    const centralAfrica = countries.find(country => country.subregionId === 'central-africa')!
    const eastAfrica = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [centralAfrica, eastAfrica]
    const centralRecommendation = recommendation('learn-countries', [centralAfrica.id], centralAfrica)
    const eastRecommendation = recommendation('learn-countries', [eastAfrica.id], eastAfrica)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: centralRecommendation,
      curriculumRecommendationsBySubregion: new Map([
        [centralAfrica.subregionId, centralRecommendation],
        [eastAfrica.subregionId, eastRecommendation],
      ]),
    }))
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Europe' })
    let railMount = renderLatestRails()

    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('East Africa'))?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    expect(mount.querySelector('[role="dialog"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="journey-switch-learn-only"]')?.click())

    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: eastAfrica.subregionId }))
  })

  it('makes the selected Continent current and launches the same Journey', async () => {
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [africa]
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [africa.id], africa) }))
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Europe' })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="journey-switch-make-current"]')?.click())

    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBe('africa')
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: africa.subregionId }))
  })

  it('does not prompt when the selected Journey already matches the preference', async () => {
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [africa]
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [africa.id], africa) }))
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Europe' })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())

    expect(mount.querySelector('[role="dialog"]')).toBeNull()
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: africa.subregionId }))
  })

  it('passes the persisted Journey preference only to the World-scoped plan', async () => {
    const africa = countries.find(country => country.subregionId === 'central-africa')!
    activeCountries = [countries[0], africa]
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [africa.id], africa) }))
    await renderToday()
    expect(buildPlanMock.mock.calls[buildPlanMock.mock.calls.length - 1]?.[0]).toEqual(expect.objectContaining({ preferredJourneyContinent: 'africa' }))

    await act(async () => {
      root?.render(createElement(WorldCountriesToday, { answerMode: 'typing', onNavigate: vi.fn(), continent: 'Africa' }))
      await Promise.resolve()
    })

    expect(buildPlanMock.mock.calls[buildPlanMock.mock.calls.length - 1]?.[0]).toEqual(expect.not.objectContaining({ preferredJourneyContinent: expect.anything() }))
  })

  it('clears a preferred Continent when its refreshed plan has no Journey work', async () => {
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    buildPlanMock.mockReturnValue(plan())

    await renderToday({ continent: 'Africa' })

    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('clears a preferred Continent from an exhausted World plan', async () => {
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    buildPlanMock.mockReturnValue(plan())

    await renderToday()

    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('does not clear a preferred Continent from an unrelated Continent hub', async () => {
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    buildPlanMock.mockReturnValue(plan())

    await renderToday({ continent: 'Europe' })

    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBe('africa')
  })

  it('dismisses the switch dialog without launching or persisting', async () => {
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [africa]
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-countries', [africa.id], africa) }))
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Europe' })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    const dialog = mount.querySelector<HTMLElement>('[role="dialog"]')!
    await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))

    expect(mount.querySelector('[role="dialog"]')).toBeNull()
    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
    expect(countryLearningFlowMock).not.toHaveBeenCalled()
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
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Southern Europe')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click()
      await Promise.resolve()
    })
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: 'southern-europe' }))
  })

  it('keeps Playground for an explicitly selected incomplete Subregion', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const southern = countries.find(country => country.subregionId === 'southern-europe')!
    activeCountries = [northern, southern]
    const northernRecommendation = recommendation('learn-countries', [northern.id], northern)
    const southernRecommendation = recommendation('learn-countries', [southern.id], southern)
    const onNavigate = vi.fn()
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: northernRecommendation,
      plannerFocusSubregionId: northern.subregionId,
      curriculumRecommendationsBySubregion: new Map([
        [northern.subregionId, northernRecommendation],
        [southern.subregionId, southernRecommendation],
      ]),
    }))

    const mount = await renderToday({ continent: 'Europe', onNavigate })
    const railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Southern Europe'))?.click())

    expect(mount.querySelector('[data-today-action="drill"]')).toBeNull()
    expect(mount.querySelector('[data-today-action="playground"]')?.textContent).toContain('Playground')
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="playground"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'play' })
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
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Northern Europe')
  })

  it('recommends Journey over weak-spot consolidation when reviews are caught up', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      consolidationPressure: {
        establishedNonMasteredTargetCount: 8,
        fragileTargetCount: 3,
        fragileRatio: 0.375,
        isHigh: false,
      },
      reviewOpportunity: { kind: 'consolidate', candidates: [candidate] },
    }))
    const mount = await renderToday()
    const railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Reviews caught up')
    expect(railMount.textContent).not.toContain('Strengthen 1 now')
    expect(mount.querySelector('[data-today-action="journey"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="strengthen"]')?.textContent).toContain('Strengthen 1')
    expect(mount.querySelector('[data-today-action="playground"]')).not.toBeNull()
    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
  })

  it('promotes Strengthen under high consolidation pressure while keeping Journey in Other options', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: recommendation('learn-countries'),
      plannerFocusSubregionId: 'northern-europe',
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      consolidationPressure: {
        establishedNonMasteredTargetCount: 8,
        fragileTargetCount: 4,
        fragileRatio: 0.5,
        isHigh: true,
      },
      reviewOpportunity: { kind: 'consolidate', candidates: [candidate] },
    }))
    const mount = await renderToday()
    const hub = mount.querySelector('[data-today-action-hub]')

    expect(hub?.querySelector('[data-today-action="strengthen"]')?.getAttribute('data-recommended')).toBe('true')
    expect(hub?.querySelector('[data-today-action="journey"]')).not.toBeNull()
    expect(hub?.querySelector('[data-today-action="journey"]')?.getAttribute('data-recommended')).toBeNull()

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('consolidation')
  })

  it('keeps scheduled Review recommended above high consolidation pressure', async () => {
    const candidate = { country: countries[0] }
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [candidate],
      reviewQueue: [candidate],
      dueCount: 1,
      dueCountryCount: 1,
      curriculumRecommendation: recommendation('learn-countries'),
      consolidationCandidates: [candidate],
      consolidationQueue: [candidate],
      consolidationPressure: {
        establishedNonMasteredTargetCount: 8,
        fragileTargetCount: 4,
        fragileRatio: 0.5,
        isHigh: true,
      },
      reviewOpportunity: { kind: 'review', candidates: [candidate] },
    }))
    const mount = await renderToday()

    expect(mount.querySelector('[data-today-action="review"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="journey"]')).not.toBeNull()
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

    expect(railMount.textContent).toContain('20 items available to strengthen')
    expect(railMount.textContent).toContain('Next practice: 8 items')
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-today-action="strengthen"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="strengthen"]')?.textContent).toContain('Strengthen 8')
    expect(mount.querySelector('[data-today-action="strengthen"]')?.textContent).toContain('20 items available to strengthen · next practice 8')
    expect(mount.querySelector('[data-today-action="playground"]')).not.toBeNull()
    expect(mount.textContent).not.toContain('Drill the world')
    expect(mount.textContent).not.toContain('Drill Northern Europe')

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
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

    act(() => mount.querySelector<HTMLButtonElement>('[data-today-action="strengthen"]')?.click())
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
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Northern Europe')
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
    expect(mount.querySelector('[data-today-action="review"]')?.getAttribute('data-recommended')).toBe('true')
  })

  it('keeps a selected learned Subregion visible without suppressing the planner Journey', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const central = countries.find(country => country.subregionId === 'central-europe')!
    activeCountries = [northern, central]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, Date.now(), activeCountries)
    const centralRecommendation = recommendation('learn-countries', [central.id], central)
    const onNavigate = vi.fn()
    buildPlanMock.mockReturnValue(plan({
      dueCandidates: [{ country: northern }],
      reviewQueue: [{ country: northern }],
      dueCount: 1,
      dueCountryCount: 1,
      reviewOpportunity: { kind: 'review', candidates: [{ country: northern }] },
      curriculumRecommendation: centralRecommendation,
      plannerFocusSubregionId: central.subregionId,
      curriculumRecommendationsBySubregion: new Map([
        [central.subregionId, centralRecommendation],
        [northern.subregionId, null],
      ]),
    }))

    const mount = await renderToday({ continent: 'Europe', onNavigate })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Northern Europe'))?.click())
    railMount = renderLatestRails()

    expect(railMount.textContent).toContain('Learning complete · Northern Europe')
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Northern Europe')
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-today-action="review"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Central Europe')
    expect(mount.querySelector('[data-today-action="drill"]')?.textContent).toContain('Drill Northern Europe')
    expect(mount.querySelector('[data-today-action="drill"]')?.textContent).toContain('Focus your drill on this region')
    expect(mount.querySelector('[data-today-action="playground"]')).toBeNull()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="drill"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', scope: { kind: 'subregion', subregionId: northern.subregionId } })

    expect(railMount.querySelector('[data-relearn-track="countries"]')?.getAttribute('aria-label')).toBe('Relearn Countries in Northern Europe')
    expect(railMount.querySelector('[data-relearn-track="capitals"]')?.getAttribute('aria-label')).toBe('Relearn Capitals in Northern Europe')
    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: northern.subregionId,
      entries: [northern],
      recordCompletion: false,
      completionCelebration: 'subregion',
      completionHandoff: undefined,
      completedRegionAction: undefined,
    }))
    expect(mount.querySelector('[data-testid="country-learning-handoff"]')).toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })
    railMount = renderLatestRails()
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Northern Europe')
    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="capitals"]')?.click())
    expect(capitalLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: northern.subregionId,
      entries: [northern],
      recordCompletion: false,
      completionCelebration: 'subregion',
      completionHandoff: undefined,
      completedRegionAction: undefined,
    }))
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenCalledWith(expect.objectContaining({ subregion: 'central-europe' }))
  })

  it('recommends the selected completed Subregion Drill when no higher-priority work remains', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, Date.now() + 1, activeCountries)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: null,
      plannerFocusSubregionId: northern.subregionId,
      scopeComplete: true,
    }))
    const onNavigate = vi.fn()
    const mount = await renderToday({ continent: 'Europe', onNavigate })
    const railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Northern Europe'))?.click())

    expect(mount.querySelector('[data-today-action="drill"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="drill"]')?.textContent).toContain('Drill Northern Europe')
    expect(mount.querySelector('[data-today-action="drill"]')?.textContent).toContain('Focus your drill on this region')
    expect(mount.querySelector('[data-today-action="playground"]')).toBeNull()
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="drill"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', scope: { kind: 'subregion', subregionId: northern.subregionId } })
  })

  it('celebrates the Continent after a non-final Subregion Relearn in a fully learned Continent', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const nonFinalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[0]?.id)!
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 3, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: recommendation('learn-countries', [africa.id], africa),
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(nonFinalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())

    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: nonFinalSubregion.subregionId,
      recordCompletion: false,
      completionCelebration: 'continent',
    }))
    expect(mount.querySelector('[data-celebration-level="continent"]')).not.toBeNull()
    expect(mount.querySelector('[data-celebration-level="subregion"]')).toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).not.toBeNull()
  })

  it('keeps the Subregion celebration when a Relearn leaves the Continent incomplete', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const finalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[effectiveSubregions.length - 1]?.id)!
    const at = Date.now()
    // Only the Relearn target is learned: the other Europe Subregion keeps the Continent incomplete.
    markSubregionCountriesLearned(finalSubregion.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(finalSubregion.subregionId, at + 1, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: recommendation('learn-countries', [africa.id], africa),
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(finalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())

    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: finalSubregion.subregionId,
      recordCompletion: false,
      completionCelebration: 'subregion',
    }))
    expect(mount.querySelector('[data-celebration-level="continent"]')).toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
  })

  it('shows the Continent completion popup after final effective Subregion Relearn', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const finalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[effectiveSubregions.length - 1]?.id)!
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 3, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: recommendation('learn-countries', [africa.id], africa),
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(finalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())

    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: finalSubregion.subregionId,
      recordCompletion: false,
      completionCelebration: 'continent',
      completionHandoff: undefined,
      completedRegionAction: undefined,
    }))
    expect(mount.querySelector('[data-celebration-level="continent"]')).not.toBeNull()
    expect(mount.querySelector('[data-celebration-level="subregion"]')).toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const dialog = mount.querySelector<HTMLElement>('[data-continent-completion-dialog]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('EUROPE')
    expect(dialog?.textContent).toContain('Complete!')
    expect(dialog?.textContent).toContain('Continue journey → Africa')
    expect(dialog?.textContent).toContain('View the World')
  })

  it('shows the Continent completion popup after final effective Capital Relearn', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const finalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[effectiveSubregions.length - 1]?.id)!
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 3, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: recommendation('learn-countries', [africa.id], africa),
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(finalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="capitals"]')?.click())

    expect(capitalLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      subregion: finalSubregion.subregionId,
      recordCompletion: false,
      completionCelebration: 'continent',
      completionHandoff: undefined,
      completedRegionAction: undefined,
    }))
    expect(mount.querySelector('[data-celebration-level="continent"]')).not.toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).not.toBeNull()
  })

  it('shows the Continent completion popup without a handoff when the World Journey is complete', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const finalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[effectiveSubregions.length - 1]?.id)!
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 3, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: null,
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(finalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      recordCompletion: false,
      completionCelebration: 'continent',
    }))

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const dialog = mount.querySelector<HTMLElement>('[data-continent-completion-dialog]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Complete!')
    expect(dialog?.textContent).toContain('View the World')
    expect(dialog?.querySelector('[data-testid="continent-completion-continue"]')).toBeNull()
    expect(dialog?.textContent).not.toContain('Continue journey')
  })

  it('does not show the Continent completion popup when a Relearn exits early', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, western, africa]
    const effectiveSubregions = getSubregionsForContinentInEffectiveOrder('Europe', activeCountries, getContinentMetadata('Europe'))
    const finalSubregion = activeCountries.find(country => country.subregionId === effectiveSubregions[effectiveSubregions.length - 1]?.id)!
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 3, activeCountries)
    configureContinentCompletionPlans({
      continentRecommendation: null,
      worldRecommendation: recommendation('learn-countries', [africa.id], africa),
    })

    const mount = await renderToday({ continent: 'Europe' })
    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.startsWith(finalSubregion.subregion))?.click())
    railMount = renderLatestRails()

    await act(async () => railMount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())
    expect(countryLearningFlowMock).toHaveBeenLastCalledWith(expect.objectContaining({
      recordCompletion: false,
      completionCelebration: 'continent',
    }))

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="country-learning-exit"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
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
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', scope: { kind: 'subregion', subregionId: northern.subregionId } })

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
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Western Europe')
  })

  it('releases an explicitly selected region after completing Learning when the planner advances', async () => {
    const central = countries.find(country => country.subregionId === 'central-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [central, western]
    markSubregionCountriesLearned(central.subregionId, Date.now(), activeCountries)
    const initialPlan = plan({
      curriculumRecommendation: recommendation('learn-capitals', [central.id], central),
      plannerFocusSubregionId: central.subregionId,
    })
    const nextRecommendation = recommendation('learn-countries', [western.id], western)
    const postMilestonePlan = plan({
      curriculumRecommendation: nextRecommendation,
      plannerFocusSubregionId: western.subregionId,
    })
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten ? postMilestonePlan : initialPlan)
    const mount = await renderToday({ continent: 'Europe' })

    let railMount = renderLatestRails()
    act(() => [...railMount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.startsWith('Central Europe'))?.click())

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="region-completion"]')?.textContent).toContain('Region learned')
    expect(mount.textContent).toContain('Back to Europe')
    expect(mount.textContent).toContain('Start Western Europe')

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-stop"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    railMount = renderLatestRails()
    expect(railMount.querySelector('[data-active-focus="true"]')?.textContent).toContain('Western Europe')
    expect(railMount.textContent).not.toContain('Learning complete · Central Europe')
    expect(mount.querySelector('[data-active-subregion]')?.textContent).toBe('Focus: Western Europe')
    const mapProps = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]?.[0] as {
      selectedSubregionIds?: readonly string[]
    } | undefined
    expect(mapProps?.selectedSubregionIds).toEqual([western.subregionId])
    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Learn 1 country · Western Europe')
  })

  it('recognizes a Country-finished region boundary from post-milestone readiness truth', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    const capitalItemId = `world-countries:country-to-capital:${northern.id}`
    loadHistoryMock.mockImplementation(() => Promise.resolve(new Map([[capitalItemId, [
      { itemId: capitalItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' },
      { itemId: capitalItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11', attemptType: 'review' },
      { itemId: capitalItemId, at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-12', attemptType: 'review' },
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

  it('resolves a Subregion celebration when another active Subregion in the Continent is not learned', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    const currentRecommendation = recommendation('learn-capitals', [northern.id], northern)
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten
      ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
      : plan({ curriculumRecommendation: currentRecommendation, plannerFocusSubregionId: northern.subregionId }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="region-completion"]')).not.toBeNull()
    expect(mount.querySelector('[data-celebration-level]')?.getAttribute('data-celebration-level')).toBe('subregion')
  })

  it('resolves the Continent celebration when the final active Subregion completes from the World scope', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 1, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 2, activeCountries)
    const currentRecommendation = recommendation('learn-capitals', [northern.id], northern)
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten
      ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
      : plan({ curriculumRecommendation: currentRecommendation, plannerFocusSubregionId: northern.subregionId }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="region-completion"]')).not.toBeNull()
    expect(mount.querySelectorAll('[data-celebration-level]')).toHaveLength(1)
    expect(mount.querySelector('[data-celebration-level]')?.getAttribute('data-celebration-level')).toBe('continent')
  })

  it('resolves the same Continent celebration from a Continent hub', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCountriesLearned(western.subregionId, at + 1, activeCountries)
    markSubregionCapitalsLearned(western.subregionId, at + 2, activeCountries)
    const currentRecommendation = recommendation('learn-capitals', [northern.id], northern)
    buildPlanMock.mockImplementation(() => capitalMilestoneWritten
      ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
      : plan({ curriculumRecommendation: currentRecommendation, plannerFocusSubregionId: northern.subregionId }))
    const mount = await renderToday({ continent: 'Europe' })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-celebration-level]')?.getAttribute('data-celebration-level')).toBe('continent')
  })

  it('does not resolve a medium or big celebration for a Country-only completion', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const western = countries.find(country => country.subregionId === 'western-europe')!
    activeCountries = [northern, western]
    const currentRecommendation = recommendation('learn-countries', [northern.id], northern)
    buildPlanMock.mockImplementation(() => milestoneWritten
      ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
      : plan({ curriculumRecommendation: currentRecommendation, plannerFocusSubregionId: northern.subregionId }))
    const mount = await renderToday()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-primary-action]')?.click()
      await Promise.resolve()
    })
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="complete-country-learning"]')?.click()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-testid="country-region-completion"]')).toBeNull()
    expect(mount.querySelector('[data-celebration-level]')).toBeNull()
  })

  it('celebrates world mastery on the home map once every country and capital is learned', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: null, plannerFocusSubregionId: null, scopeComplete: true }))

    const mount = await renderToday()

    expect(mount.querySelector('[data-celebration-level="world"]')).not.toBeNull()
  })

  it('does not celebrate world mastery while a country is still unlearned', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, africa]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: null, plannerFocusSubregionId: null }))

    const mount = await renderToday()

    expect(mount.querySelector('[data-celebration-level="world"]')).toBeNull()
  })

  it('keeps world mastery scoped to the world map rather than a Continent', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [northern]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: null, plannerFocusSubregionId: null, scopeComplete: true }))

    const mount = await renderToday({ continent: 'Europe' })

    expect(mount.querySelector('[data-celebration-level="world"]')).toBeNull()
  })

  it('does not celebrate an already-completed Continent on entry', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, africa]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: null, plannerFocusSubregionId: northern.subregionId, scopeComplete: true }))

    const mount = await renderToday({ continent: 'Europe' })

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
  })

  it('queues Continent completion after the final Learning flow returns to the hub', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [northern, africa]
    markSubregionCountriesLearned(northern.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [northern.id], northern)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation })
    const mount = await renderToday({ continent: 'Europe' })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click()
      await Promise.resolve()
    })
    expect(mount.querySelector('[data-testid="capital-learning-flow"]')).not.toBeNull()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    expect(mount.querySelector('[data-testid="capital-learning-flow"]')).not.toBeNull()
    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).not.toBeNull()
  })

  it('shows the Continent milestone copy without adding Playground to the dialog', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({
      continentRecommendation,
      worldRecommendation,
      continentReviewOpportunity: { kind: 'review', candidates: [{}] },
    })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const dialog = mount.querySelector<HTMLElement>('[data-continent-completion-dialog]')
    expect(dialog?.textContent).toContain('EUROPE')
    expect(dialog?.textContent).toContain('Complete!')
    expect(dialog?.textContent).toContain("You've learned all countries and capitals in Europe.")
    expect(dialog?.textContent).toContain('Continue journey → Africa')
    expect(dialog?.textContent).toContain('View the World')
    expect(dialog?.textContent).toContain('Strengthen Europe')
    expect(dialog?.textContent).not.toContain('Playground')
    expect(document.activeElement).toBe(dialog?.querySelector('[data-testid="continent-completion-continue"]'))
  })

  it('continues the Journey through the existing Continent navigation seam', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation })
    const onSelectContinent = vi.fn()
    const mount = await renderToday({ continent: 'Europe', onSelectContinent })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="continent-completion-continue"]')?.click())

    expect(onSelectContinent).toHaveBeenCalledWith('Africa', 'Africa')
    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
    expect(countryLearningFlowMock).not.toHaveBeenCalled()
  })

  it('returns to the World from the Continent celebration without changing Journey state', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation })
    const onWorld = vi.fn()
    const mount = await renderToday({ continent: 'Europe', onWorld })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="continent-completion-view-world"]')?.click())

    expect(onWorld).toHaveBeenCalledOnce()
    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('reuses the current Review opportunity for Strengthen from the celebration', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({
      continentRecommendation,
      worldRecommendation,
      continentReviewOpportunity: { kind: 'review', candidates: [{}] },
    })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="continent-completion-strengthen"]')?.click())

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
    expect(mount.querySelector('[data-testid="today-review"]')?.getAttribute('data-review-mode')).toBe('review')
    expect(mount.querySelector('[data-review-candidate-count]')?.getAttribute('data-review-candidate-count')).toBe('1')
  })

  it('omits Strengthen when the completed Continent has no Review opportunity', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const dialog = mount.querySelector<HTMLElement>('[data-continent-completion-dialog]')
    expect(dialog?.querySelector('[data-testid="continent-completion-strengthen"]')).toBeNull()
    expect(dialog?.querySelector('[data-testid="continent-completion-continue"]')).not.toBeNull()
    expect(dialog?.querySelector('[data-testid="continent-completion-view-world"]')).not.toBeNull()
  })

  it('shows the Continent celebration without a handoff when the World Journey is complete', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation: null })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const dialog = mount.querySelector<HTMLElement>('[data-continent-completion-dialog]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Complete!')
    expect(dialog?.querySelector('[data-testid="continent-completion-continue"]')).toBeNull()
    expect(dialog?.textContent).not.toContain('Continue journey')
  })

  it('does not show the Continent celebration while the World planner still recommends this Continent', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    configureContinentCompletionPlans({
      continentRecommendation,
      worldRecommendation: recommendation('learn-capitals', [europe.id], europe),
    })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
  })

  it('uses the World planner fallback after a preferred Continent is completed', async () => {
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    activeCountries = [africa, europe]
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'africa')
    markSubregionCountriesLearned(africa.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [africa.id], africa)
    const worldRecommendation = recommendation('learn-countries', [europe.id], europe)
    buildPlanMock.mockImplementation((input: { activeCountries: readonly unknown[] }) => {
      if (input.activeCountries.length === activeCountries.length) return plan({ curriculumRecommendation: worldRecommendation })
      return capitalMilestoneWritten
        ? plan({ curriculumRecommendation: null, plannerFocusSubregionId: null })
        : plan({ curriculumRecommendation: continentRecommendation, plannerFocusSubregionId: continentRecommendation.subregionId })
    })
    const mount = await renderToday({ continent: 'Africa', worldJourneyContinent: 'Africa' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')?.textContent).toContain('Continue journey → Europe')
  })

  it('does not reopen the Continent celebration after dismissal', async () => {
    const europe = countries.find(country => country.subregionId === 'northern-europe')!
    const africa = countries.find(country => country.subregionId === 'east-africa')!
    activeCountries = [europe, africa]
    markSubregionCountriesLearned(europe.subregionId, Date.now(), activeCountries)
    const continentRecommendation = recommendation('learn-capitals', [europe.id], europe)
    const worldRecommendation = recommendation('learn-countries', [africa.id], africa)
    configureContinentCompletionPlans({ continentRecommendation, worldRecommendation })
    const mount = await renderToday({ continent: 'Europe' })
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="journey"]')?.click())
    await act(async () => mount.querySelector<HTMLButtonElement>('[data-testid="complete-capital-learning"]')?.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="capital-learning-done"]')?.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="continent-completion-continue"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(mount.querySelector('[data-continent-completion-dialog]')).toBeNull()
  })

  it('makes Playground the recommendation after curriculum Learning is complete without weak spots', async () => {
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

    expect(mount.querySelector('[data-today-action="playground"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="playground"]')?.textContent).toContain('Learning complete · You\'re caught up for now')
    expect(mount.textContent).not.toContain('Drill Northern Europe')
    const railMount = renderLatestRails()
    expect(railMount.textContent).toContain('Learning complete')
    expect(railMount.textContent).toContain('Mastery')
    expect(railMount.textContent).toContain('Building through Review')
    expect(railMount.textContent).not.toContain('Journey focus')
    expect([...railMount.querySelectorAll('[data-journey-milestone]')].every(node => node.getAttribute('data-journey-status') === 'complete')).toBe(true)
  })

  it('makes Playground the recommendation after all active Countries complete Learning', async () => {
    const northern = countries.find(country => country.subregionId === 'northern-europe')!
    const eastern = countries.find(country => country.subregionId === 'eastern-europe')!
    activeCountries = [northern, eastern]
    const at = Date.now()
    markSubregionCountriesLearned(northern.subregionId, at, activeCountries)
    markSubregionCapitalsLearned(northern.subregionId, at + 1, activeCountries)
    markSubregionCountriesLearned(eastern.subregionId, at + 2, activeCountries)
    markSubregionCapitalsLearned(eastern.subregionId, at + 3, activeCountries)
    buildPlanMock.mockReturnValue(plan({
      curriculumRecommendation: null,
      plannerFocusSubregionId: eastern.subregionId,
      scopeComplete: true,
      incompleteCountryCount: 0,
      incompleteSubregionLabels: [],
    }))
    const onNavigate = vi.fn()
    const mount = await renderToday({ onNavigate })

    const railMount = renderLatestRails()
    expect(railMount.textContent).toContain('Learning complete')
    expect(mount.querySelector('[data-today-action="playground"]')?.getAttribute('data-recommended')).toBe('true')
    expect(mount.querySelector('[data-today-action="playground"]')?.textContent).toContain('Learning complete · You\'re caught up for now')
    expect(mount.textContent).not.toContain('Drill Eastern Europe')
    expect(mount.querySelector('[aria-label="Learning"]')).toBeNull()
    expect(mount.querySelector('[aria-label="Recall health"]')).not.toBeNull()

    const mapProps = geographyOverviewMapMock.mock.calls[geographyOverviewMapMock.mock.calls.length - 1]?.[0] as {
      countryColorsById?: ReadonlyMap<string, string>
      countryPatternsById?: ReadonlyMap<string, unknown>
      countryEdgeTreatmentsById?: ReadonlyMap<string, unknown>
    } | undefined
    expect(mapProps?.countryColorsById?.size).toBe(activeCountries.length)
    expect(mapProps?.countryPatternsById?.size).toBe(0)
    expect(mapProps?.countryEdgeTreatmentsById).toBeUndefined()

    await act(async () => mount.querySelector<HTMLButtonElement>('[data-today-action="playground"]')?.click())
    expect(onNavigate).toHaveBeenCalledWith({ area: 'play' })
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
    expect(onNavigate).toHaveBeenCalledWith({ area: 'drill', scope: { kind: 'subregion', subregionId: northern.subregionId } })
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
      { itemId: countryItemId, at: 1, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-10', attemptType: 'review' },
      { itemId: countryItemId, at: 2, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-11', attemptType: 'review' },
      { itemId: countryItemId, at: 3, ok: true, ms: 100, evidenceKind: 'recall', localDate: '2026-08-12', attemptType: 'review' },
    ]]]))
    buildPlanMock.mockReturnValue(plan({ curriculumRecommendation: recommendation('learn-capitals') }))
    const mount = await renderToday()

    expect(mount.querySelector('[data-today-action="journey"]')?.textContent).toContain('Add the capitals · Northern Europe')

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
    expect(railMount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[data-today-action="review"]')?.getAttribute('data-recommended')).toBe('true')
  })
})
