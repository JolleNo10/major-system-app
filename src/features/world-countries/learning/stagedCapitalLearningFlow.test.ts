import { describe, expect, it } from 'vitest'
import {
  createStagedCapitalLearningFlow,
  backStagedCapital,
  jumpStagedCapitalToFinalRecall,
  skipStagedCapital,
  skipStagedCapitalFinalRecall,
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

  it('jumps from the initial walkthrough to the full Final recall gate with explicit origin state', () => {
    const initial = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    const jumped = jumpStagedCapitalToFinalRecall(initial)

    expect(jumped.phase).toBe('final-gate')
    expect(jumped.stageIndex).toBe(jumped.plan.length - 1)
    expect(jumped.plan[jumped.stageIndex]?.kind).toBe('final')
    expect(jumped.ordered).toBeNull()
    expect(jumped.finalScopeReady).toBe(false)
    expect(jumped.finalRecallOrigin).toBe('initial-walkthrough')
    expect(jumped.practice).toBeNull()

    const started = startStagedCapitalFinalRecall(jumped)
    expect(started.phase).toBe('final-recall')
    expect(started.ordered?.order).toEqual(['A', 'B', 'C', 'D'])
    expect(started.ordered?.rewindOnError).toBe(initial.rewindOnError)
    expect(started.finalRecallOrigin).toBeNull()
  })

  it('does not jump from a non-initial walkthrough state', () => {
    const initial = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    const moved = { ...initial, walkthroughIndex: 1 }
    const laterStage = { ...initial, stageIndex: 1 }
    expect(jumpStagedCapitalToFinalRecall(moved)).toBe(moved)
    expect(jumpStagedCapitalToFinalRecall(laterStage)).toBe(laterStage)
  })

  it('returns a shortcut-origin Final recall gate directly to the first walkthrough item', () => {
    const initial = createStagedCapitalLearningFlow({ countryIds: ['A', 'B', 'C', 'D'], maximum: 3, schedulerSettings: settings })
    const jumped = jumpStagedCapitalToFinalRecall(initial)
    const backed = backStagedCapital(jumped)

    expect(backed).toMatchObject({
      phase: 'walkthrough',
      stageIndex: 0,
      walkthroughIndex: 0,
      finalScopeReady: false,
      finalRecallOrigin: null,
      practice: null,
      ordered: null,
    })
  })

  it('only skips Final recall from the Final gate', () => {
    let flow = createStagedCapitalLearningFlow({ countryIds: ['A'], maximum: 3, schedulerSettings: settings })
    expect(skipStagedCapitalFinalRecall(flow)).toBe(flow)

    flow = { ...flow, phase: 'final-gate', stageIndex: flow.plan.length - 1 }
    const skipped = skipStagedCapitalFinalRecall(flow)
    expect(skipped.phase).toBe('complete')
    expect(skipped.ordered).toBeNull()

    const finalRecall = { ...flow, phase: 'final-recall' as const }
    expect(skipStagedCapitalFinalRecall(finalRecall)).toBe(finalRecall)
  })
})
