import { describe, expect, it } from 'vitest'
import {
  advanceStagedCountryPlan,
  createStagedCountryLearningFlow,
  backStagedCountry,
  skipStagedCountry,
  startStagedCountryFinalRecall,
  startStagedCountryPractice,
  submitStagedCountryFinalAnswer,
  submitStagedCountryLocation,
  submitStagedCountryPractice,
} from './stagedCountryLearningFlow'

const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }

function answerUntilReady(
  state: ReturnType<typeof createStagedCountryLearningFlow>,
  submit: (state: ReturnType<typeof createStagedCountryLearningFlow>) => ReturnType<typeof submitStagedCountryLocation>,
) {
  let current = state
  while (!current.location?.ready && current.phase === 'location-practice') current = submit(current).state
  return current
}

describe('staged country learning flow', () => {
  it('keeps Location and Country Practice as fresh scheduler scopes', () => {
    let flow = createStagedCountryLearningFlow({ countryIds: ['A'], maximum: 3, schedulerSettings: settings })
    flow = skipStagedCountry(flow)
    flow = answerUntilReady(flow, current => submitStagedCountryLocation(current, true, 100, () => 0))
    expect(flow.phase).toBe('location-ready')
    flow = startStagedCountryPractice(flow)
    expect(flow.phase).toBe('practice')
    expect(flow.practice?.round.seq).toBe(0)
    expect(flow.practice?.currentKey).toBe('A')
  })

  it('requires the final Combined scope before the Final recall gate', () => {
    let flow = createStagedCountryLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    expect(flow.plan.map(stage => stage.kind)).toEqual(['set', 'set', 'combined', 'final'])
    flow = skipStagedCountry(flow)
    expect(flow.phase).toBe('location-practice')
    flow = skipStagedCountry(flow)
    expect(flow.phase).toBe('practice')
    flow = skipStagedCountry(flow)
    expect(flow.phase).toBe('walkthrough')
    flow = skipStagedCountry(flow)
    flow = skipStagedCountry(flow)
    flow = skipStagedCountry(flow)
    expect(flow.phase).toBe('combined-practice')
    flow = skipStagedCountry(flow)
    expect(flow.phase).toBe('final-gate')
    expect(flow.finalScopeReady).toBe(false)
    flow = startStagedCountryFinalRecall(flow)
    expect(flow.phase).toBe('final-recall')
    for (const _ of flow.countryIds) flow = submitStagedCountryFinalAnswer(flow, true).state
    expect(flow.phase).toBe('complete')
  })

  it('makes a ready final Set go directly to the final gate when there is one Set', () => {
    let flow = createStagedCountryLearningFlow({ countryIds: ['A'], maximum: 3, schedulerSettings: settings })
    flow = skipStagedCountry(flow)
    flow = answerUntilReady(flow, current => submitStagedCountryLocation(current, true, 100, () => 0))
    flow = startStagedCountryPractice(flow)
    while (flow.phase === 'practice') flow = submitStagedCountryPractice(flow, true, 100, () => 0).state
    expect(flow.phase).toBe('set-ready')
    flow = advanceStagedCountryPlan(flow)
    expect(flow.phase).toBe('final-gate')
    expect(flow.finalScopeReady).toBe(true)
  })

  it('restarts Final recall after going Back from it', () => {
    let flow = createStagedCountryLearningFlow({ countryIds: ['A', 'B'], maximum: 3, schedulerSettings: settings })
    flow = skipStagedCountry(flow)
    flow = skipStagedCountry(flow)
    flow = advanceStagedCountryPlan(flow)
    flow = startStagedCountryFinalRecall(flow)
    flow = submitStagedCountryFinalAnswer(flow, false).state
    expect(flow.ordered?.mode).toBe('repair')
    flow = backStagedCountry(flow)
    expect(flow.phase).toBe('final-gate')
    flow = startStagedCountryFinalRecall(flow)
    expect(flow.ordered?.currentIndex).toBe(0)
    expect(flow.ordered?.mode).toBe('clean')
  })
})
