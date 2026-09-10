// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuidedHomeRails } from './GuidedHomeRails'
import { WORLD_COUNTRIES_JOURNEY_STAGES, type WorldCountriesJourneyPresentation } from './journeyPresentation'

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

function renderRails(overrides: Partial<Parameters<typeof GuidedHomeRails>[0]> = {}) {
  const mount = document.createElement('div')
  document.body.append(mount)
  const props: Parameters<typeof GuidedHomeRails>[0] = {
    level: 'world',
    activeCountryCount: 1,
    evidenceStatus: 'ready',
    dueCount: 0,
    dueCountryCount: 0,
    reviewReasonSummary: { mistakes: 0, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
    nextLearning: null,
    journey: null,
    refreshing: false,
    caughtUp: true,
    scopeComplete: true,
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

describe('Guided World Countries home status', () => {
  it('keeps a stable loading shell', () => {
    const mount = renderRails({ evidenceStatus: 'loading', caughtUp: false })
    expect(mount.textContent).toMatch(/loading.*progress/i)
    expect(mount.textContent).toContain('map will stay visible')
    expect(mount.textContent).not.toContain('Retained recall evidence')
  })

  it('explains evidence failure while leaving Play available', () => {
    const mount = renderRails({ evidenceStatus: 'error', caughtUp: false })
    expect(mount.textContent).toContain('Progress unavailable')
    expect(mount.textContent).toContain("couldn't load your progress")
    expect(mount.textContent).toContain('Play remains available')
    expect(mount.textContent).toContain('Play and progress')
  })

  it('renders the zero-active-Country state', () => {
    const mount = renderRails({ activeCountryCount: 0, caughtUp: false })
    expect(mount.textContent).toContain('No countries in this scope')
    expect(mount.textContent).toContain('There are no countries to learn')
  })

  it('renders a caught-up state without an actionable Continue control', () => {
    const mount = renderRails()
    expect(mount.textContent).toContain('Complete')
    expect(mount.textContent).not.toContain('Due reviews')
    expect(mount.textContent).not.toContain('Due Countries')
    expect(mount.querySelector('[data-primary-action]')).toBeNull()
  })

  it('keeps useful due counts and reasons when review is due', () => {
    const mount = renderRails({
      dueCount: 3,
      dueCountryCount: 2,
      reviewActionCount: 3,
      caughtUp: false,
      reviewReasonSummary: { mistakes: 1, firstRecall: 0, firstReviewAfterLearning: 1, spaced: 2, repeated: 1 },
    })

    expect(mount.textContent).not.toContain('3 reviews ready')
    expect(mount.textContent).toContain('2 countries')
    expect(mount.textContent).toContain('Why review now')
    expect(mount.textContent).toContain('recent mistake')
    expect(mount.textContent).toContain('first review')
    expect(mount.textContent).toContain('ready to revisit')
    expect(mount.textContent).toContain('item needs extra practice')
    expect(mount.textContent).not.toContain('spaced')
  })

  it('labels total due work separately from the bounded review block', () => {
    const mount = renderRails({
      dueCount: 20,
      dueCountryCount: 15,
      reviewActionCount: 12,
      caughtUp: false,
    })

    expect(mount.textContent).toContain('20 reviews due in total')
    expect(mount.textContent).toContain('15 countries')
    expect(mount.textContent).not.toContain('20 reviews ready')
  })

  it('leaves the equal review count to the primary action while keeping support context', () => {
    const mount = renderRails({
      dueCount: 3,
      dueCountryCount: 2,
      reviewActionCount: 3,
      caughtUp: false,
      reviewReasonSummary: { mistakes: 1, firstRecall: 0, firstReviewAfterLearning: 0, spaced: 0, repeated: 0 },
    })

    expect(mount.textContent).toContain('2 countries')
    expect(mount.textContent).toContain('Why review now')
    expect(mount.textContent).toContain('recent mistake')
    expect(mount.textContent).not.toContain('3 reviews ready')
    expect(mount.textContent).not.toContain('3 reviews due in total')
  })

  it('explains geography choices without showing a population card', () => {
    const worldMount = renderRails({ level: 'world' })
    expect(worldMount.textContent).toContain('Explore the world')
    expect(worldMount.textContent).toContain('Choose a continent')
    expect(worldMount.textContent).toContain('inspect your progress')
    expect(worldMount.textContent).not.toContain('Population')
    expect(worldMount.textContent).not.toContain('active Countries')

    act(() => root?.unmount())
    root = null
    act(() => railRoot?.unmount())
    railRoot = null
    document.body.replaceChildren()

    const continentMount = renderRails({ level: 'continent', continent: 'Europe' })
    expect(continentMount.textContent).toContain('Learning regions')
    expect(continentMount.textContent).toContain('Choose a region')
    expect(continentMount.textContent).toContain('inspect its learning journey')
  })

  it('keeps the planner action out of the normal Home rail', () => {
    const mount = renderRails({ nextLearning: { track: 'learn-capitals', subregionLabel: 'Northern Europe' } })

    expect(mount.textContent).not.toContain('Continue')
    expect(mount.textContent).not.toContain('The guided path continues')
  })

  it('projects the detailed journey into three learner milestones', () => {
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
    expect(mount.textContent).toContain('Next in journey: Add the capitals')
    expect(mount.querySelector('[data-journey-milestone="countries"]')?.getAttribute('data-journey-status')).toBe('complete')
    expect(mount.querySelector('[data-journey-milestone="capitals"]')?.getAttribute('data-journey-status')).toBe('current')
    expect(mount.querySelector('[data-journey-milestone="mastery"]')?.getAttribute('data-journey-status')).toBe('upcoming')
    expect(mount.textContent).not.toContain('Meet the countries')
  })

  it('explains why review comes before new learning', () => {
    const mount = renderRails({ dueCount: 1, caughtUp: false, nextLearning: null })

    expect(mount.textContent).toContain('Why review now')
    expect(mount.textContent).toContain('1 review ready')
  })

  it('distinguishes caught-up scheduled work from unfinished core progress', () => {
    const mount = renderRails({
      level: 'continent',
      continent: 'Europe',
      scopeComplete: false,
      scopeProgress: {
        scopeId: 'continent:Europe',
        countryIds: ['NO'],
        totalCountries: 46,
        completeCountries: 45,
        completionRatio: 45 / 46,
        complete: false,
        countryStateCounts: { unpractised: 0, weak: 0, developing: 1, strong: 0, complete: 45 },
        additionalMasteredSkills: 0,
        additionalSkillCount: 0,
        additionalMasteryRatio: 0,
      },
      incompleteSubregionLabels: ['Eastern Europe'],
      consolidationAvailable: true,
    })

    expect(mount.textContent).toContain('Still in progress')
    expect(mount.textContent).toContain('45 of 46 countries complete')
    expect(mount.textContent).toContain('Eastern Europe')
    expect(mount.textContent).not.toContain('Complete')
    expect(mount.textContent).not.toContain('Unfinished guided knowledge')
    expect([...mount.querySelectorAll<HTMLButtonElement>('button')].some(button => button.textContent === 'Practice unfinished area')).toBe(false)
  })

  it('labels an inspected Subregion without replacing the guided recommendation', () => {
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
      nextLearning: { track: 'learn-countries', subregionLabel: 'Northern Europe' },
      onFocusGuidedSubregion,
    })

    expect(mount.textContent).toContain("You're viewing Southern Europe")
    expect(mount.textContent).toContain('Your journey is still focused on Northern Europe')
    expect(mount.textContent).not.toContain('Your next step')
    expect(mount.textContent).not.toContain('next action')
    expect(mount.textContent).not.toContain('The guided path continues in Northern Europe.')
    expect(mount.textContent).toContain('Next in journey: Learn the countries')
    act(() => [...mount.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Back to Northern Europe')?.click())
    expect(onFocusGuidedSubregion).toHaveBeenCalledOnce()
  })

  it('labels inspected geography as separate from available consolidation', () => {
    const journey: WorldCountriesJourneyPresentation = {
      subregionId: 'southern-europe',
      currentStageId: 'put-it-together',
      complete: false,
      stages: WORLD_COUNTRIES_JOURNEY_STAGES.map(stage => ({ ...stage, status: stage.id === 'put-it-together' ? 'current' : 'upcoming', detail: 'Progress detail' })),
      countriesLearned: true,
      countriesEstablished: true,
      capitalsLearned: true,
      capitalsEstablished: true,
      countryRecallMastered: false,
      capitalRecallMastered: false,
      coreRecallComplete: false,
    }
    const mount = renderRails({
      continent: 'Europe',
      journey,
      caughtUp: true,
      scopeComplete: false,
      consolidationAvailable: true,
    })

    expect(mount.textContent).toContain('There is nothing new to learn here right now, but you can keep practising unfinished recall.')
    expect(mount.textContent).not.toContain('targeted guided practice')
  })
})
