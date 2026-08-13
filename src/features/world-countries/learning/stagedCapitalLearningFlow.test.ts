import { describe, expect, it } from 'vitest'
import {
  createStagedCapitalLearningFlow,
  skipStagedCapital,
  startStagedCapitalFinalRecall,
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
    expect(flow.ordered?.order).toEqual(['A'])
    flow = submitStagedCapitalFinalAnswer(flow, true).state
    expect(flow.phase).toBe('complete')
  })

  it('inserts cumulative practice after the second Set', () => {
    const flow = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    expect(flow.plan.map(stage => stage.kind)).toEqual(['set', 'set', 'combined', 'final'])
  })
})
