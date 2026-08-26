// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '@/app/settings/SettingsContext'
import { WorldCountriesPopulationProvider } from '@/features/world-countries/WorldCountriesPopulationContext'
import type { Country } from '@/features/world-countries/data/countries'
import { markSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningStore'
import { WorldCountriesDrill } from './WorldCountriesDrill'
import { getCurrentDrillStep, getDrillSessionSkills, type DrillAnswerRecord, type DrillSessionState } from './drillSessionState'

const capitalFlowProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const drillSessionProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const drillResultsProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const drillSetupProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }))
const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
const recordWorldCountriesAttemptMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const resolveProficiencyScopeMock = vi.hoisted(() => vi.fn(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })))

vi.mock('./DrillSetup', () => ({
  DrillSetup: (props: Record<string, unknown>) => {
    drillSetupProps.current = props
    const { onLearnPracticeStart, onProficiencySelectionChange } = props as { onLearnPracticeStart: (mode: string) => void; onProficiencySelectionChange: (selection: readonly string[]) => void }
    return createElement(
      'div',
      null,
      createElement('button', { type: 'button', 'data-testid': 'start-drill', onClick: () => (props.onStart as () => void)() }, 'Start Drill'),
      createElement('button', { type: 'button', 'data-testid': 'select-proficiency', onClick: () => onProficiencySelectionChange(['weak']) }, 'Select weak'),
      createElement('button', { type: 'button', 'data-testid': 'start-capital-learning', onClick: () => onLearnPracticeStart('learn-capitals') }, 'Start capital learning'),
      createElement('button', { type: 'button', 'data-testid': 'start-locate-capitals', onClick: () => onLearnPracticeStart('locate-capitals') }, 'Start Locate Capitals'),
    )
  },
}))

vi.mock('./DrillSession', () => ({
  DrillSession: (props: Record<string, unknown>) => {
    drillSessionProps.current = props
    return createElement('div', { 'data-testid': 'practice-session' })
  },
}))

vi.mock('./DrillResults', () => ({
  DrillResults: (props: Record<string, unknown>) => {
    drillResultsProps.current = props
    return createElement('div', { 'data-testid': 'drill-results' })
  },
}))

vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(),
  loadWorldCountriesRecallProgress: loadRecallProgressMock,
  recordWorldCountriesAttempt: recordWorldCountriesAttemptMock,
}))
vi.mock('./drillProficiencyScope', async importOriginal => ({ ...await importOriginal<typeof import('./drillProficiencyScope')>(), resolveDrillProficiencyScope: resolveProficiencyScopeMock }))

vi.mock('@/features/world-countries/learning/flows/CapitalLearningFlow', () => ({
  CapitalLearningFlow: (props: Record<string, unknown>) => {
    capitalFlowProps.current = props
    return createElement('div', { 'data-testid': 'capital-learning' })
  },
}))

let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  root = null
  capitalFlowProps.current = null
  drillSessionProps.current = null
  drillResultsProps.current = null
  drillSetupProps.current = null
  document.body.replaceChildren()
  loadRecallProgressMock.mockClear()
  recordWorldCountriesAttemptMock.mockClear()
  resolveProficiencyScopeMock.mockReset()
  resolveProficiencyScopeMock.mockImplementation(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] }))
  localStorage.clear()
})

describe('WorldCountriesDrill learning integration', () => {
  it('keeps assisted answers in session history without recording durable Drill evidence', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-drill"]')!.click())
    const onAnswer = drillSessionProps.current?.onAnswer as (record: Record<string, unknown>) => void
    act(() => onAnswer({ countryId: 'NO', skill: 'location-to-country', answer: 'Norway', correct: true, at: 1, ms: 100, assisted: true }))
    expect(recordWorldCountriesAttemptMock).not.toHaveBeenCalled()

    act(() => onAnswer({ countryId: 'NO', skill: 'location-to-country', answer: 'Norway', correct: true, at: 2, ms: 100 }))
    expect(recordWorldCountriesAttemptMock).toHaveBeenCalledTimes(1)
  })

  it('opens the first setup view in Drill with the Countries + Capitals perspective', () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'multiple-choice' }),
      ))
    })

    expect(drillSetupProps.current?.purpose).toBe('drill')
    expect(drillSetupProps.current?.mode).toBe('countries-capitals')
  })

  it('starts Country for Shape with shape evidence and the full active map population', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries-from-shape', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'multiple-choice' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-drill"]')!.click())

    expect(getDrillSessionSkills(drillSessionProps.current?.state as DrillSessionState)).toEqual(['shape-to-country'])
    expect((drillSessionProps.current?.activeCountries as readonly Country[]).length).toBeGreaterThan((drillSessionProps.current?.entries as readonly Country[]).length)

    act(() => (drillSessionProps.current?.onAnswer as (record: DrillAnswerRecord) => void)({
      countryId: 'NO', skill: 'shape-to-country', answer: 'Norway', correct: true, at: 1, ms: 100,
    }))
    expect(recordWorldCountriesAttemptMock).toHaveBeenCalledWith('NO', 'shape-to-country', expect.objectContaining({ ok: true }))
  })

  it('starts Locate Capitals as non-recording capital-to-country map practice', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'multiple-choice' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-locate-capitals"]')!.click())

    expect(mount.querySelector('[data-testid="practice-session"]')).not.toBeNull()
    expect(drillSessionProps.current?.activity).toBe('practice')
    expect(drillSessionProps.current?.interaction).toBe('location-click')
    expect((drillSessionProps.current?.state as { skills?: readonly string[] }).skills).toEqual(['capital-to-country'])
  })

  it('passes durable Country readiness into Capital Learning', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))
    markSubregionCountriesLearned('northern-europe', 123)

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="start-capital-learning"]')!.click())

    expect(mount.querySelector('[data-testid="capital-learning"]')).not.toBeNull()
    expect(capitalFlowProps.current?.countriesLearned).toBe(true)
  })

  it('starts proficiency Learning as a temporary Country scope', async () => {
    resolveProficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['AL'], countries: [{ id: 'AL' }] } as never)
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: [], mode: 'countries', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="select-proficiency"]')!.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="start-capital-learning"]')!.click()
      await Promise.resolve()
    })

    expect(capitalFlowProps.current?.scopeLabel).toBe('Proficiency scope')
    expect(capitalFlowProps.current?.recordCompletion).toBe(false)
    expect((capitalFlowProps.current?.entries as readonly { id: string }[]).map(entry => entry.id)).toEqual(['AL'])
  })

  it('starts a proficiency Drill scope without replacing persisted geographic selection', async () => {
    resolveProficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['AL'], countries: [{ id: 'AL' }] } as never)
    const storedPreferences = {
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify(storedPreferences))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="select-proficiency"]')!.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="start-drill"]')!.click()
      await Promise.resolve()
    })

    expect((drillSessionProps.current?.state as DrillSessionState).countryIds).toEqual(['AL'])
    expect(drillSessionProps.current?.activity).toBe('drill')
    expect(JSON.parse(localStorage.getItem('world-countries-drill-preferences')!)).toEqual(storedPreferences)
  })

  it('starts proficiency Practice with the practice skill and transient Country scope', async () => {
    resolveProficiencyScopeMock.mockReturnValue({ counts: { weak: 1, developing: 0 }, countryIds: ['AL'], countries: [{ id: 'AL' }] } as never)
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries', order: 'ordered',
    }))

    const mount = document.createElement('div')
    document.body.append(mount)
    act(() => {
      root = createRoot(mount)
      root.render(createElement(SettingsProvider, null,
        createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      ))
    })

    act(() => mount.querySelector<HTMLButtonElement>('[data-testid="select-proficiency"]')!.click())
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-testid="start-locate-capitals"]')!.click()
      await Promise.resolve()
    })

    expect((drillSessionProps.current?.state as DrillSessionState).countryIds).toEqual(['AL'])
    expect(drillSessionProps.current?.activity).toBe('practice')
    expect(drillSessionProps.current?.interaction).toBe('location-click')
    expect((drillSessionProps.current?.state as DrillSessionState).skills).toEqual(['capital-to-country'])
  })
})

const retryCountries = [
  { id: 'NO', country: 'Norway', capital: 'Oslo', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'SE', country: 'Sweden', capital: 'Stockholm', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
  { id: 'FI', country: 'Finland', capital: 'Helsinki', continent: 'Europe', subregionId: 'northern-europe', subregion: 'Northern Europe' },
] satisfies readonly Country[]

function renderRetryDrill() {
  const mount = document.createElement('div')
  document.body.append(mount)
  act(() => {
    root = createRoot(mount)
    root.render(createElement(SettingsProvider, null,
      createElement(WorldCountriesPopulationProvider, {
        countries: retryCountries,
        children: createElement(WorldCountriesDrill, { answerMode: 'typing' }),
      }),
    ))
  })
  return mount
}

function completeDrillRun(shouldFail: (step: NonNullable<ReturnType<typeof getCurrentDrillStep>>) => boolean) {
  const initialState = drillSessionProps.current?.state as DrillSessionState
  const totalSteps = initialState.countryOrder.length * getDrillSessionSkills(initialState).length
  for (let index = 0; index < totalSteps; index += 1) {
    const props = drillSessionProps.current as {
      state: DrillSessionState
      onAnswer: (record: DrillAnswerRecord) => void
      onContinue: (correct: boolean) => void
    }
    const step = getCurrentDrillStep(props.state)
    if (!step) throw new Error('Expected an active Drill step')
    const correct = !shouldFail(step)
    act(() => {
      props.onAnswer({ countryId: step.countryId, skill: step.skill, answer: correct ? 'correct' : 'incorrect', correct, at: index + 1, ms: 100 })
      props.onContinue(correct)
    })
  }
}

describe('WorldCountriesDrill failed-Country retry', () => {
  it('uses a transient Country subset, retries all mode skills, narrows repeatedly, and keeps Run again configured', () => {
    const storedPreferences = {
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries-capitals', order: 'ordered',
    }
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify(storedPreferences))
    renderRetryDrill()

    act(() => document.querySelector<HTMLButtonElement>('[data-testid="start-drill"]')!.click())
    const initialState = drillSessionProps.current?.state as DrillSessionState
    const configuredCountryIds = [...initialState.countryIds]
    expect(configuredCountryIds).toEqual(['NO', 'SE', 'FI'])

    completeDrillRun(step => step.countryId === 'NO' && step.skill === 'country-to-capital' || step.countryId === 'SE' && step.skill === 'location-to-country')
    expect(drillResultsProps.current?.retryFailedCountryCount).toBe(2)
    expect((drillResultsProps.current?.answers as readonly DrillAnswerRecord[])).toHaveLength(6)

    act(() => (drillResultsProps.current?.onRetryFailedCountries as () => void)())
    const firstRetryState = drillSessionProps.current?.state as DrillSessionState
    expect(firstRetryState.countryIds).toEqual(['NO', 'SE'])
    expect(getDrillSessionSkills(firstRetryState)).toEqual(['location-to-country', 'country-to-capital'])
    expect((drillSessionProps.current?.selection as { subregionIds: readonly string[] }).subregionIds).toEqual(['northern-europe'])
    expect(JSON.parse(localStorage.getItem('world-countries-drill-preferences')!)).toEqual(storedPreferences)

    completeDrillRun(step => step.countryId === 'NO' && step.skill === 'country-to-capital')
    expect(drillResultsProps.current?.retryFailedCountryCount).toBe(1)
    expect((drillResultsProps.current?.answers as readonly DrillAnswerRecord[])).toHaveLength(4)

    act(() => (drillResultsProps.current?.onRetryFailedCountries as () => void)())
    const secondRetryState = drillSessionProps.current?.state as DrillSessionState
    expect(secondRetryState.countryIds).toEqual(['NO'])
    expect(getDrillSessionSkills(secondRetryState)).toEqual(['location-to-country', 'country-to-capital'])

    completeDrillRun(() => false)
    expect(drillResultsProps.current?.retryFailedCountryCount).toBe(0)

    act(() => (drillResultsProps.current?.onAgain as () => void)())
    expect((drillSessionProps.current?.state as DrillSessionState).countryIds).toEqual(configuredCountryIds)
  })

  it('retries failed Countries with the shape skill through the generic workflow', () => {
    localStorage.setItem('world-countries-drill-preferences', JSON.stringify({
      continent: 'Europe', subregionIds: ['northern-europe'], mode: 'countries-from-shape', order: 'ordered',
    }))
    renderRetryDrill()

    act(() => document.querySelector<HTMLButtonElement>('[data-testid="start-drill"]')!.click())
    completeDrillRun(step => step.countryId === 'NO')

    expect(drillResultsProps.current?.retryFailedCountryCount).toBe(1)
    act(() => (drillResultsProps.current?.onRetryFailedCountries as () => void)())

    const retryState = drillSessionProps.current?.state as DrillSessionState
    expect(retryState.mode).toBe('countries-from-shape')
    expect(getDrillSessionSkills(retryState)).toEqual(['shape-to-country'])
    expect(retryState.countryIds).toEqual(['NO'])
  })
})
