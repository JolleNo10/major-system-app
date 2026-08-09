import type { CountryId } from '@/features/world-countries/data/countries'
import { createShuffleBag, drawShuffleBag, type ShuffleBagState } from './shuffleBag'

export interface LocationRecallConfig {
  countryIds: readonly CountryId[]
  minimumCleanTarget: number
}

export interface LocationRecallState {
  countryIds: readonly CountryId[]
  currentCountryId: CountryId
  cleanStreak: number
  target: number
  bag: ShuffleBagState<CountryId>
  completed: boolean
}

export interface LocationRecallResult {
  state: LocationRecallState
  correct: boolean
  expectedCountryId: CountryId
  completedNow: boolean
}

function normalizedTarget(countryCount: number, minimum: number): number {
  return Math.max(countryCount, Number.isFinite(minimum) ? Math.max(0, Math.floor(minimum)) : 0)
}

export function createLocationRecallSession(
  config: LocationRecallConfig,
  random: () => number = Math.random,
): LocationRecallState {
  const countryIds = [...new Set(config.countryIds)]
  const target = normalizedTarget(countryIds.length, config.minimumCleanTarget)
  const bag = createShuffleBag(countryIds, random)
  const draw = drawShuffleBag(bag, countryIds, random)
  if (!draw) {
    return {
      countryIds,
      currentCountryId: '',
      cleanStreak: 0,
      target,
      bag,
      completed: true,
    }
  }
  return {
    countryIds,
    currentCountryId: draw.value,
    cleanStreak: 0,
    target,
    bag: draw.state,
    completed: target === 0,
  }
}

export function submitLocationSelection(
  state: LocationRecallState,
  selectedCountryId: CountryId,
  random: () => number = Math.random,
): LocationRecallResult {
  const expectedCountryId = state.currentCountryId
  if (state.completed) {
    return { state, correct: selectedCountryId === expectedCountryId, expectedCountryId, completedNow: false }
  }

  const correct = selectedCountryId === expectedCountryId
  const cleanStreak = correct ? state.cleanStreak + 1 : 0
  const completed = correct && cleanStreak === state.target
  if (completed) {
    const nextState = { ...state, cleanStreak, completed: true }
    return { state: nextState, correct, expectedCountryId, completedNow: true }
  }

  const next = drawShuffleBag(state.bag, state.countryIds, random)
  const nextState = next
    ? { ...state, cleanStreak, currentCountryId: next.value, bag: next.state }
    : { ...state, cleanStreak }
  return { state: nextState, correct, expectedCountryId, completedNow: false }
}
