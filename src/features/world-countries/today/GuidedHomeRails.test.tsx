import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import type { WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'
import {
  WORLD_COUNTRIES_STATUSES,
  deriveWorldCountriesScopeStatusFromCounts,
  type WorldCountriesScopeStatus,
  type WorldCountriesStatus,
} from '@/features/world-countries/learning/scopeStatus'
import { GuidedHomeRails } from './GuidedHomeRails'
import { WORLD_COUNTRIES_JOURNEY_STAGES, type WorldCountriesJourneyPresentation } from './journeyPresentation'
import type { WorldCountriesTodayReviewOpportunity } from './todayPlan'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const useRailsMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/layout/PageLayoutContext', () => ({ useRails: useRailsMock }))

let root: Root | null = null
let railRoot: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  act(() => railRoot?.unmount())
  railRoot = null
  useRailsMock.mockClear()
  document.body.replaceChildren()
})

function makeReviewOpportunity(kind: 'review' | 'consolidate', count: number): Exclude<WorldCountriesTodayReviewOpportunity, null> {
  return {
    kind,
    candidates: Array.from({ length: count }, () => ({ country: countries[0] })) as never,
  }
}

function renderRails(overrides: Partial<Parameters<typeof GuidedHomeRails>[0]> = {}) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const props: Parameters<typeof GuidedHomeRails>[0] = {
    level: 'world',
    activeCountryCount: 1,
    evidenceStatus: 'ready',
    reviewOpportunity: null,
    reviewAvailableCount: overrides.reviewAvailableCount ?? (overrides.reviewOpportunity?.candidates.length ?? 0),
    journey: null,
    refreshing: false,
    scopeSummaries: [],
    scopeProgress: null,
    scopeStatus: null,
    onWorld: vi.fn(),
    onOpenProgress: vi.fn(),
    ...overrides,
  }
  root = createRoot(mount)
  act(() => root?.render(createElement(GuidedHomeRails, props)))
  const rails = useRailsMock.mock.calls[useRailsMock.mock.calls.length - 1]?.[0] as { left?: ReactNode; right?: ReactNode } | undefined
  const railMount = document.createElement('div')
  document.body.append(railMount)
  railRoot = createRoot(railMount)
  act(() => railRoot?.render(createElement('div', null, rails?.left ?? null, rails?.right ?? null)))
  return railMount
}

/** Build a status through the real derivation so the rail tests exercise the rules. */
function makeStatus(
  partial: Partial<Record<WorldCountriesStatus, number>>,
  totalCountries: number,
): WorldCountriesScopeStatus {
  const tierCounts = {
    ...Object.fromEntries(WORLD_COUNTRIES_STATUSES.map(tier => [tier, 0])),
    ...partial,
  } as Record<WorldCountriesStatus, number>
  return deriveWorldCountriesScopeStatusFromCounts(tierCounts, totalCountries)
}

function makeProgress(overrides: Partial<WorldCountriesScopeProgress> = {}): WorldCountriesScopeProgress {
  const totalCountries = overrides.totalCountries ?? 1
  const countryCounts = overrides.locationToCountryStateCounts ?? { NOT_LEARNED: 0, learned: totalCountries,
    weak: 0,
    developing: 0,
    strong: 0,
    mastered: 0,
  }
  const capitalCounts = overrides.countryToCapitalStateCounts ?? { NOT_LEARNED: 0, learned: totalCountries,
    weak: 0,
    developing: 0,
    strong: 0,
    mastered: 0,
  }
  return {
    scopeId: 'scope',
    countryIds: [],
    totalCountries,
    completeCountries: 0,
    completionRatio: 0,
    coreMasteredSkills: 0,
    coreSkillCount: totalCountries * 2,
    coreMasteryRatio: 0,
    complete: false,
    countryStateCounts: { learned: totalCountries, weak: 0, developing: 0, strong: 0, complete: 0 },
    locationToCountryMasteredCountries: 0,
    locationToCountryMasteryRatio: 0,
    countryToCapitalMasteredCountries: 0,
    countryToCapitalMasteryRatio: 0,
    locationToCountryStateCounts: countryCounts,
    countryToCapitalStateCounts: capitalCounts,
    additionalMasteredSkills: 0,
    additionalSkillCount: 0,
    additionalMasteryRatio: 0,
    ...overrides,
  }
}

describe('Guided World Countries home rails', () => {
  it('keeps a stable loading shell', () => {
    const mount = renderRails({ evidenceStatus: 'loading' })
    expect(mount.textContent).toMatch(/loading.*progress/i)
    expect(mount.textContent).toContain('map will stay visible')
    expect(mount.querySelector('[data-progress-action]')).toHaveProperty('disabled', true)
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Loading your progress')
  })

  it('explains evidence failure while leaving Playground available', () => {
    const mount = renderRails({ evidenceStatus: 'error' })
    expect(mount.textContent).toContain('Progress unavailable')
    expect(mount.textContent).toContain("couldn't load your progress")
    expect(mount.textContent).toContain('Playground remains available from the feature header')
    expect(mount.textContent).not.toContain('Play and progress')
    expect(mount.querySelector('[data-progress-action]')).toHaveProperty('disabled', true)
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Progress unavailable')
  })

  it('renders the zero-active-Country state', () => {
    const mount = renderRails({ activeCountryCount: 0 })
    expect(mount.textContent).toContain('No countries in this scope')
    expect(mount.textContent).toContain('There are no countries to review')
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Reviews caught up')
  })

  it('renders a compact caught-up Review state without a CTA', () => {
    const mount = renderRails()
    expect(mount.textContent).toContain('Reviews caught up')
    expect(mount.textContent).toContain('Nothing needs your attention right now')
    expect(mount.querySelector('[data-review-action]')).toBeNull()
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Reviews caught up')
  })

  it('presents scheduled Review as supporting information without an action', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 3),
    })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.querySelector('[aria-hidden="true"]')?.textContent).toBe('✦')
    expect(reviewPanel?.querySelector('h2')?.textContent).toBe('Review ready')
    expect(reviewPanel?.querySelector('h2')?.className).toContain('uppercase')
    expect(reviewPanel?.textContent).toContain('3 items')
    expect(reviewPanel?.textContent).toContain('See what stuck.')
    expect(reviewPanel?.querySelector('[data-review-action]')).toBeNull()
    expect(reviewPanel?.textContent).not.toContain('Review scope')
    expect(reviewPanel?.textContent).not.toContain('countries')
    expect(reviewPanel?.textContent).not.toContain('first review')
    expect(reviewPanel?.textContent).not.toContain('recent mistake')
    expect(reviewPanel?.textContent).not.toContain('extra practice')
    expect(reviewPanel?.querySelector('[data-review-completion]')).toBeNull()

  })

  it('uses singular grammar for one ready item', () => {
    const mount = renderRails({ reviewOpportunity: makeReviewOpportunity('review', 1) })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.textContent).toContain('1 item')
    expect(reviewPanel?.textContent).not.toContain('1 items')
    expect(reviewPanel?.querySelector('[data-review-action]')).toBeNull()
  })

  it('uses the full scheduled Review population count separately from the bounded block', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 8),
      reviewAvailableCount: 20,
    })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.textContent).toContain('20 items ready')
    expect(reviewPanel?.textContent).toContain('Next review: 8 items')
    expect(reviewPanel?.querySelector('[data-review-action]')).toBeNull()
    expect(reviewPanel?.textContent).not.toContain('countries')
  })

  it('keeps the Review card compact after completion while an opportunity remains', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 8),
      reviewCompletion: { mode: 'review', checkpoint: { reviewed: 8, correctFirstTry: 6, recoveredOnRetry: 1, stillNeedsWork: 1 } },
    })

    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')
    expect(reviewPanel?.textContent).toContain('8 items ready')
    expect(reviewPanel?.textContent).toContain('See what stuck.')
    expect(reviewPanel?.querySelector('[data-review-action]')).toBeNull()
    expect(reviewPanel?.querySelector('[data-review-completion]')).toBeNull()
  })

  it('keeps the completed Review result with the caught-up state', () => {
    const mount = renderRails({
      reviewCompletion: { mode: 'review', checkpoint: { reviewed: 8, correctFirstTry: 7, recoveredOnRetry: 1, stillNeedsWork: 0 } },
    })

    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Reviews caught up')
    expect(mount.textContent).toContain('8 reviewed · 7 first try · 1 recovered')
    expect(mount.textContent).toContain('Nothing else is ready right now.')
  })

  it('offers weak-spot practice only after scheduled reviews are caught up', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('consolidate', 4),
    })

    expect(mount.textContent).toContain('Reviews caught up')
    expect(mount.textContent).toContain('4 items available to strengthen')
    expect(mount.textContent).not.toContain('Next practice:')
    expect(mount.textContent).not.toContain('Strengthen 4')
    expect(mount.textContent).not.toContain('consolidation')
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Reviews caught up')
  })

  it('uses the full weak-spot population count separately from the bounded block', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('consolidate', 8),
      reviewAvailableCount: 20,
    })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.textContent).toContain('20 items available to strengthen')
    expect(reviewPanel?.textContent).toContain('Next practice: 8 items')
    expect(reviewPanel?.textContent).not.toContain('8 items available to strengthen')
    expect(reviewPanel?.querySelector('[data-review-action]')).toBeNull()
  })

  it('keeps Journey orientation separate from its specific next action', () => {
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'northern-europe',
      currentStageId: 'capitals',
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'countries' ? 'complete' : stage.id === 'capitals' ? 'current' : 'upcoming', detail: 'Detail' })),
      regionLearned: false,
      masteryStatus: 'building',
      hasCountryPractice: true,
      hasCapitalPractice: false,
      countriesLearned: true,
      countriesEstablished: true,
      capitalsLearned: false,
      capitalsEstablished: false,
      countryRecallMastered: false,
      capitalRecallMastered: false,
      coreRecallComplete: false,
    }
    const mount = renderRails({ journey })

    expect(mount.textContent).toContain('Countries')
    expect(mount.textContent).toContain('Capitals')
    expect(mount.textContent).toContain('Mastery')
    expect(mount.textContent).toContain('Complete')
    expect(mount.textContent).toContain('Current')
    expect(mount.textContent).toContain('Upcoming')
    expect(mount.textContent).not.toContain('Next in journey')
    expect(mount.querySelector('[data-journey-milestone="countries"]')?.getAttribute('data-journey-status')).toBe('complete')
    expect(mount.querySelector('[data-journey-milestone="capitals"]')?.getAttribute('data-journey-status')).toBe('current')
    expect(mount.querySelector('[data-journey-milestone="region-learned"]')?.getAttribute('data-journey-status')).toBe('upcoming')
  })

  it('marks the active Subregion with one semantic selected state', () => {
    const onSelect = vi.fn()
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'southern-europe',
      currentStageId: 'countries',
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'countries' ? 'current' : 'upcoming', detail: 'Progress detail' })),
      regionLearned: false,
      masteryStatus: 'building',
      hasCountryPractice: false,
      hasCapitalPractice: false,
      countriesLearned: false,
      countriesEstablished: false,
      capitalsLearned: false,
      capitalsEstablished: false,
      countryRecallMastered: false,
      capitalRecallMastered: false,
      coreRecallComplete: false,
    }
    const mount = renderRails({
      continent: 'Europe',
      journey,
      scopeSummaries: [{
        id: 'southern-europe',
        label: 'Southern Europe',
        progress: makeProgress({ completeCountries: 1, totalCountries: 2, completionRatio: 0.5 }),
        scopeStatus: makeStatus({ complete: 1, strong: 1 }, 2),
        onSelect,
        selected: true,
        status: 'Selected focus',
      }],
    })

    expect(mount.textContent).toContain('Your journey · Southern Europe')
    expect(mount.textContent).not.toContain("You're viewing")
    expect(mount.textContent).not.toContain('journey is still focused')
    expect(mount.textContent).not.toContain('next action')
    expect(mount.textContent).not.toContain('next step')
    const selectedRow = [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Southern Europe'))
    expect(selectedRow?.getAttribute('aria-current')).toBe('true')
    expect(selectedRow?.getAttribute('data-active-focus')).toBe('true')
    expect(selectedRow?.className).toContain('border-cyan-500')
    act(() => selectedRow?.click())
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('presents a fully learned region as mastery orientation after curriculum Learning is complete', () => {
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'northern-europe',
      currentStageId: null,
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: 'complete', detail: 'Complete' })),
      regionLearned: true,
      masteryStatus: 'building',
      hasCountryPractice: true,
      hasCapitalPractice: true,
      countriesLearned: true,
      countriesEstablished: true,
      capitalsLearned: true,
      capitalsEstablished: true,
      countryRecallMastered: false,
      capitalRecallMastered: false,
      coreRecallComplete: false,
    }
    const onRelearnCountries = vi.fn()
    const onRelearnCapitals = vi.fn()
    const mount = renderRails({ journey, activeLearningAvailable: false, onRelearnCountries, onRelearnCapitals })

    expect(mount.textContent).toContain('Learning complete')
    expect(mount.textContent).toContain('Mastery')
    expect(mount.textContent).toContain('Building through Review')
    expect(mount.textContent).not.toContain('Your journey · Northern Europe')
    expect(mount.textContent).not.toContain('Journey focus')
    expect(mount.querySelectorAll('[data-relearn-track="countries"]')).toHaveLength(1)
    expect(mount.querySelectorAll('[data-relearn-track="capitals"]')).toHaveLength(1)
    expect(mount.querySelector('[data-relearn-track="countries"]')?.getAttribute('aria-label')).toBe('Relearn Countries in Northern Europe')
    expect(mount.querySelector('[data-relearn-track="capitals"]')?.getAttribute('aria-label')).toBe('Relearn Capitals in Northern Europe')
    expect(mount.querySelector('[data-journey-milestone="region-learned"] [data-relearn-track]')).toBeNull()

    act(() => mount.querySelector<HTMLButtonElement>('[data-relearn-track="countries"]')?.click())
    act(() => mount.querySelector<HTMLButtonElement>('[data-relearn-track="capitals"]')?.click())
    expect(onRelearnCountries).toHaveBeenCalledOnce()
    expect(onRelearnCapitals).toHaveBeenCalledOnce()
  })

  it('only exposes Relearn controls for a fully learned Journey with callbacks', () => {
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'northern-europe',
      currentStageId: 'capitals',
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'countries' ? 'complete' : 'current', detail: 'Detail' })),
      regionLearned: false,
      masteryStatus: 'building',
      hasCountryPractice: true,
      hasCapitalPractice: false,
      countriesLearned: true,
      countriesEstablished: true,
      capitalsLearned: false,
      capitalsEstablished: false,
      countryRecallMastered: false,
      capitalRecallMastered: false,
      coreRecallComplete: false,
    }

    const incompleteMount = renderRails({ journey, onRelearnCountries: vi.fn(), onRelearnCapitals: vi.fn() })
    expect(incompleteMount.querySelector('[data-relearn-track="countries"]')).toBeNull()
    expect(incompleteMount.querySelector('[data-relearn-track="capitals"]')).toBeNull()

    act(() => root?.unmount())
    root = null
    act(() => railRoot?.unmount())
    railRoot = null
    document.body.replaceChildren()

    const completeJourney = { ...journey, regionLearned: true, currentStageId: null, stages: journey.stages.map(stage => ({ ...stage, status: 'complete' as const })) }
    const noCallbacksMount = renderRails({ journey: completeJourney })
    expect(noCallbacksMount.querySelector('[data-relearn-track="countries"]')).toBeNull()
    expect(noCallbacksMount.querySelector('[data-relearn-track="capitals"]')).toBeNull()
  })

  it('keeps geography choices and places Progress in the geography footer', () => {
    const onOpenProgress = vi.fn()
    const worldMount = renderRails({ level: 'world', scopeProgress: makeProgress({ completeCountries: 1, totalCountries: 1, completionRatio: 1, locationToCountryMasteryRatio: 1, countryToCapitalMasteryRatio: 1 }), scopeStatus: makeStatus({ complete: 1 }, 1), onOpenProgress })
    expect(worldMount.textContent).toContain('Explore the world')
    expect(worldMount.textContent).toContain('Choose a continent')
    expect(worldMount.textContent).toContain('World progress')
    expect(worldMount.textContent).toContain('1 / 1 Countries fully mastered')
    expect(worldMount.querySelector('[aria-label="World Countries secondary actions"]')).toBeNull()

    act(() => worldMount.querySelector<HTMLButtonElement>('[data-progress-action]')?.click())
    expect(onOpenProgress).toHaveBeenCalledOnce()

    act(() => root?.unmount())
    root = null
    act(() => railRoot?.unmount())
    railRoot = null
    document.body.replaceChildren()

    const continentMount = renderRails({ level: 'continent', continent: 'Europe', scopeProgress: makeProgress({ completeCountries: 1, totalCountries: 1, completionRatio: 1, locationToCountryMasteryRatio: 1, countryToCapitalMasteryRatio: 1 }), scopeStatus: makeStatus({ complete: 1 }, 1) })
    expect(continentMount.textContent).toContain('Learning regions')
    expect(continentMount.textContent).toContain('Choose a region')
    expect(continentMount.textContent).toContain('Europe progress')
    expect(continentMount.textContent).toContain('World')
    expect(continentMount.textContent).not.toContain('Back to World')
  })

  it('headlines the highest rung a scope has reached rather than its mastery share', () => {
    const mount = renderRails({
      scopeSummaries: [{
        id: 'northern-europe',
        label: 'Northern Europe',
        progress: makeProgress({ completeCountries: 9, totalCountries: 20, completionRatio: 0.45, locationToCountryMasteryRatio: 0.55, countryToCapitalMasteryRatio: 0.45 }),
        scopeStatus: makeStatus({ complete: 9, developing: 11 }, 20),
        onSelect: vi.fn(),
        selected: true,
        status: 'Selected focus',
      }],
      scopeProgress: makeProgress({ completeCountries: 12, totalCountries: 48, completionRatio: 0.25, locationToCountryMasteryRatio: 0.4, countryToCapitalMasteryRatio: 0.25 }),
      scopeStatus: makeStatus({ complete: 12, weak: 36 }, 48),
    })

    const geographyRow = [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Northern Europe'))
    expect(geographyRow?.textContent).toContain('Mastered 45%')
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('Mastered 25%')
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('12 / 48 Countries fully mastered')
  })

  it('headlines a mid-ladder rung when nothing above it has been reached', () => {
    const mount = renderRails({
      scopeSummaries: [{
        id: 'northern-europe',
        label: 'Northern Europe',
        progress: makeProgress({ totalCountries: 50 }),
        scopeStatus: makeStatus({ strong: 2, developing: 8, NOT_LEARNED: 40 }, 50),
        onSelect: vi.fn(),
      }],
    })
    const row = [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Northern Europe'))
    expect(row?.textContent).toContain('Strong 4%')
    expect(row?.textContent).toContain('2 / 50 Countries strong')
    expect(row?.textContent).not.toContain('Mastery')
  })

  it('renders the Learning rungs without a percentage', () => {
    const mount = renderRails({
      scopeSummaries: [
        {
          id: 'oceania',
          label: 'Oceania',
          progress: makeProgress({ totalCountries: 14 }),
          scopeStatus: makeStatus({ NOT_LEARNED: 14 }, 14),
          onSelect: vi.fn(),
        },
        {
          id: 'asia',
          label: 'Asia',
          progress: makeProgress({ totalCountries: 48 }),
          scopeStatus: makeStatus({ COUNTRIES_LEARNED: 12, NOT_LEARNED: 36 }, 48),
          onSelect: vi.fn(),
        },
      ],
    })
    const rows = [...mount.querySelectorAll<HTMLButtonElement>('button')]
    const oceania = rows.find(button => button.textContent?.includes('Oceania'))
    const asia = rows.find(button => button.textContent?.includes('Asia'))

    expect(oceania?.textContent).toContain('Not learned')
    expect(oceania?.textContent).toContain('0 / 14 Countries learned')
    expect(oceania?.textContent).not.toContain('%')

    expect(asia?.textContent).toContain('Learned')
    expect(asia?.textContent).toContain('12 / 48 Countries learned')
    expect(asia?.textContent).not.toContain('%')
  })

  it('shows the highest rung alongside both compact recall tracks', () => {
    const mount = renderRails({
      scopeSummaries: [{
        id: 'northern-europe',
        label: 'Northern Europe',
        progress: makeProgress({
          totalCountries: 4,
          completeCountries: 2,
          locationToCountryMasteredCountries: 3,
          locationToCountryMasteryRatio: 0.75,
          countryToCapitalMasteredCountries: 2,
          countryToCapitalMasteryRatio: 0.5,
          locationToCountryStateCounts: { NOT_LEARNED: 0, learned: 0, weak: 0, developing: 1, strong: 0, mastered: 3 },
          countryToCapitalStateCounts: { NOT_LEARNED: 0, learned: 0, weak: 1, developing: 1, strong: 0, mastered: 2 },
        }),
        scopeStatus: makeStatus({ complete: 2, developing: 2 }, 4),
        onSelect: vi.fn(),
      }],
    })
    const geographyRow = [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Northern Europe'))
    expect(geographyRow?.textContent).toContain('Mastered 50%')
    expect(geographyRow?.textContent).toContain('2 / 4 Countries fully mastered')
    expect(geographyRow?.querySelectorAll('[data-recall-track]')).toHaveLength(2)
    expect(geographyRow?.querySelector('[data-recall-track="country"]')).not.toBeNull()
    expect(geographyRow?.querySelector('[data-recall-track="capital"]')).not.toBeNull()
  })

  it('promotes a footer sitting at a full rung to the next rung at zero', () => {
    const mount = renderRails({
      scopeProgress: makeProgress({ totalCountries: 2, completeCountries: 0 }),
      scopeStatus: makeStatus({ strong: 2 }, 2),
    })
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('Mastered 0%')
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('0 / 2 Countries fully mastered')
  })

  it('preserves selected focus supporting text', () => {
    const mount = renderRails({
      scopeSummaries: [{
        id: 'southern-europe',
        label: 'Southern Europe',
        progress: makeProgress({ totalCountries: 2 }),
        scopeStatus: makeStatus({ NOT_LEARNED: 2 }, 2),
        selected: true,
        status: 'Selected focus',
      }],
    })
    const row = [...mount.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Southern Europe'))
    expect(row?.textContent).toContain('Selected focus')
  })

  it('uses the highest rung for the scope footer', () => {
    const mount = renderRails({
      scopeProgress: makeProgress({
        totalCountries: 2,
        completeCountries: 1,
        locationToCountryMasteryRatio: 0.75,
        countryToCapitalMasteryRatio: 0.5,
      }),
      scopeStatus: makeStatus({ complete: 1, strong: 1 }, 2),
    })
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('Mastered 50%')
    expect(mount.querySelector('[data-progress-entry]')?.textContent).toContain('1 / 2 Countries fully mastered')
  })

})
