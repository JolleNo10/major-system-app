import { describe, expect, it } from 'vitest'
import {
  createStagedCapitalLearningFlow,
  skipStagedCapital,
  startStagedCapitalFinalRecall,
  submitStagedCapitalPractice,
  submitStagedCapitalFinalAnswer,
} from './stagedCapitalLearningFlow'

const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }

describe('staged capital learning flow', () => {
  it('uses typed Capital Practice before ordered Country-to-Capital Final recall', () => {
    let flow = createStagedCapitalLearningFlow({ countryIds: ['A'], maximum: 3, schedulerSettings: settings })
    flow = skipStagedCapital(flow)
    expect(flow.phase).toBe('practice')
    flow = skipStagedCapital(flow)
    expect(flow.phase).toBe('final-gate')
    expect(flow.finalScopeReady).toBe(false)
    flow = startStagedCapitalFinalRecall(flow)
    expect(flow.phase).toBe('final-recall')
    expect(flow.ordered?.order).toEqual(['A'])
    flow = submitStagedCapitalFinalAnswer(flow, true).state
    expect(flow.phase).toBe('complete')
  })

  it('uses the same direct Final recall path when Next skips a ready one-Set checkpoint', () => {
    let flow = createStagedCapitalLearningFlow({ countryIds: ['A'], maximum: 3, schedulerSettings: settings })
    flow = skipStagedCapital(flow)
    while (flow.phase === 'practice') flow = submitStagedCapitalPractice(flow, true, 100, () => 0).state

    expect(flow.phase).toBe('set-ready')
    flow = skipStagedCapital(flow)
    expect(flow.phase).toBe('final-recall')
    expect(flow.finalScopeReady).toBe(true)
  })

  it('uses direct Final recall from a ready Combined checkpoint', () => {
    let flow = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    flow = { ...flow, stageIndex: 2, phase: 'combined-ready', finalScopeReady: true }
    flow = skipStagedCapital(flow)
    expect(flow.phase).toBe('final-recall')
    expect(flow.finalScopeReady).toBe(true)
  })

  it('inserts cumulative practice after the second Set', () => {
    const flow = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    expect(flow.plan.map(stage => stage.kind)).toEqual(['set', 'set', 'combined', 'final'])
  })
})
