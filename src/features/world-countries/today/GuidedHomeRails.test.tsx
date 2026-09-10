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
    dueCount: 0,
    dueCountryCount: 0,
    reviewOpportunity: null,
    reviewReasonSummary: { mistakes: 0, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
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

  it('presents scheduled Review as a positive independent opportunity', () => {
    const mount = renderRails({
      dueCount: 3,
      dueCountryCount: 2,
      reviewOpportunity: makeReviewOpportunity('review', 3),
      reviewReasonSummary: { mistakes: 1, firstRecall: 0, firstReviewAfterLearning: 1, spaced: 2, repeated: 1 },
    })

    expect(mount.textContent).toContain('Review ready')
    expect(mount.textContent).toContain('3 items')
    expect(mount.textContent).toContain('See what stuck.')
    expect(mount.textContent).toContain('Review 3 items')
    expect(mount.textContent).toContain('2 countries')
    expect(mount.textContent).toContain('recent mistake')
    expect(mount.textContent).not.toContain('Why review now')
    expect(mount.textContent).not.toContain('Guided consolidation')
    expect(mount.querySelector('[aria-labelledby="world-countries-review-opportunity-heading"] h2')?.textContent).toBe('Review ready')
  })

  it('labels total due work separately from the bounded Review block', () => {
    const mount = renderRails({
      dueCount: 20,
      dueCountryCount: 15,
      reviewOpportunity: makeReviewOpportunity('review', 12),
    })

    expect(mount.textContent).toContain('12 items')
    expect(mount.textContent).toContain('Review 12 items')
    expect(mount.textContent).toContain('20 ready overall')
    expect(mount.textContent).toContain('15 countries')
    expect(mount.textContent).not.toContain('20 reviews ready')
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
      currentStageId: 'add-capitals',
      complete: false,
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'add-capitals' ? 'current' : 'upcoming', detail: 'Detail' })),
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
    expect(mount.querySelector('[data-journey-milestone="mastery"]')?.getAttribute('data-journey-status')).toBe('upcoming')
  })

  it('keeps an inspected Subregion separate from the guided Journey focus', () => {
    const onFocusGuidedSubregion = vi.fn()
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'southern-europe',
      currentStageId: 'meet-countries',
      complete: false,
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'meet-countries' ? 'current' : 'upcoming', detail: 'Progress detail' })),
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
