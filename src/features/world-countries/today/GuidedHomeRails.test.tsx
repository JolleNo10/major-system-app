import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
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
    onStartReview: vi.fn(),
    journey: null,
    refreshing: false,
    scopeSummaries: [],
    onWorld: vi.fn(),
    onOpenPlay: vi.fn(),
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

describe('Guided World Countries home rails', () => {
  it('keeps a stable loading shell', () => {
    const mount = renderRails({ evidenceStatus: 'loading' })
    expect(mount.textContent).toMatch(/loading.*progress/i)
    expect(mount.textContent).toContain('map will stay visible')
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Loading your progress')
  })

  it('explains evidence failure while leaving Play available', () => {
    const mount = renderRails({ evidenceStatus: 'error' })
    expect(mount.textContent).toContain('Progress unavailable')
    expect(mount.textContent).toContain("couldn't load your progress")
    expect(mount.textContent).toContain('Play remains available')
    expect(mount.textContent).toContain('Play and progress')
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

  it('presents scheduled Review as a compact actionable opportunity', () => {
    const onStartReview = vi.fn()
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 3),
      onStartReview,
    })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.querySelector('[aria-hidden="true"]')?.textContent).toBe('✦')
    expect(reviewPanel?.querySelector('h2')?.textContent).toBe('Review ready')
    expect(reviewPanel?.querySelector('h2')?.className).toContain('uppercase')
    expect(reviewPanel?.textContent).toContain('3 items')
    expect(reviewPanel?.textContent).toContain('See what stuck.')
    expect(reviewPanel?.querySelector('[data-review-action]')?.textContent).toBe('Review now')
    expect(reviewPanel?.textContent).not.toContain('Review scope')
    expect(reviewPanel?.textContent).not.toContain('countries')
    expect(reviewPanel?.textContent).not.toContain('first review')
    expect(reviewPanel?.textContent).not.toContain('recent mistake')
    expect(reviewPanel?.textContent).not.toContain('extra practice')
    expect(reviewPanel?.querySelector('[data-review-completion]')).toBeNull()

    act(() => reviewPanel?.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(onStartReview).toHaveBeenCalledOnce()
  })

  it('uses singular grammar for one ready item', () => {
    const mount = renderRails({ reviewOpportunity: makeReviewOpportunity('review', 1) })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.textContent).toContain('1 item')
    expect(reviewPanel?.textContent).not.toContain('1 items')
    expect(reviewPanel?.querySelector('[data-review-action]')?.textContent).toBe('Review now')
  })

  it('uses the bounded Review block count without extra due metadata', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 8),
    })
    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')

    expect(reviewPanel?.textContent).toContain('8 items')
    expect(reviewPanel?.querySelector('[data-review-action]')?.textContent).toBe('Review now')
    expect(reviewPanel?.textContent).not.toContain('ready overall')
    expect(reviewPanel?.textContent).not.toContain('countries')
  })

  it('keeps the Review card compact after completion while an opportunity remains', () => {
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('review', 8),
      reviewCompletion: { mode: 'review', checkpoint: { reviewed: 8, correctFirstTry: 6, recoveredOnRetry: 1, stillNeedsWork: 1 } },
    })

    const reviewPanel = mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"]')
    expect(reviewPanel?.textContent).toContain('8 items')
    expect(reviewPanel?.querySelector('[data-review-action]')?.textContent).toBe('Review now')
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
    const onStartReview = vi.fn()
    const mount = renderRails({
      reviewOpportunity: makeReviewOpportunity('consolidate', 4),
      onStartReview,
    })

    expect(mount.textContent).toContain('Reviews caught up')
    expect(mount.textContent).toContain('4 weak spots available')
    expect(mount.textContent).toContain('Strengthen weak spots')
    expect(mount.textContent).not.toContain('consolidation')
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Reviews caught up')
    act(() => mount.querySelector<HTMLButtonElement>('[data-review-action]')?.click())
    expect(onStartReview).toHaveBeenCalledOnce()
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

  it('keeps an inspected Subregion separate from the guided Journey focus', () => {
    const onFocusGuidedSubregion = vi.fn()
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
      guidedSubregionId: 'northern-europe',
      onFocusGuidedSubregion,
    })

    expect(mount.textContent).toContain("You're viewing Southern Europe")
    expect(mount.textContent).toContain('Your journey is still focused on Northern Europe')
    expect(mount.textContent).not.toContain('next action')
    expect(mount.textContent).not.toContain('next step')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Back to Northern Europe')?.click())
    expect(onFocusGuidedSubregion).toHaveBeenCalledOnce()
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
    const mount = renderRails({ journey, curriculumRecommendationAvailable: false })

    expect(mount.textContent).toContain('Learning complete')
    expect(mount.textContent).toContain('Mastery')
    expect(mount.textContent).toContain('Building through Review')
    expect(mount.textContent).not.toContain('Your journey · Northern Europe')
    expect(mount.textContent).not.toContain('Journey focus')
  })

  it('keeps geography choices and secondary actions available', () => {
    const worldMount = renderRails({ level: 'world' })
    expect(worldMount.textContent).toContain('Explore the world')
    expect(worldMount.textContent).toContain('Choose a continent')
    expect(worldMount.textContent).toContain('Play and progress')

    act(() => root?.unmount())
    root = null
    act(() => railRoot?.unmount())
    railRoot = null
    document.body.replaceChildren()

    const continentMount = renderRails({ level: 'continent', continent: 'Europe' })
    expect(continentMount.textContent).toContain('Learning regions')
    expect(continentMount.textContent).toContain('Choose a region')
    expect(continentMount.textContent).toContain('Back to World')
  })
})
