import { describe, expect, it } from 'vitest'
import {
  applyCapitalLearningTransition,
  createCapitalLearningFlow,
  moveCapitalWalkthrough,
  startCapitalRecall,
  submitCapitalRecall,
} from './capitalLearningFlow'

describe('capital-learning workflow', () => {
  it('walks every Country in the supplied effective order before recall', () => {
    let flow = createCapitalLearningFlow({ countryIds: ['NO', 'SE', 'DK'] })
    expect(flow.phase).toBe('walkthrough')
    flow = moveCapitalWalkthrough(flow, 1)
    flow = moveCapitalWalkthrough(flow, 1)
    expect(flow.walkthroughIndex).toBe(2)

    flow = startCapitalRecall(flow, () => 0)
    expect(flow.phase).toBe('recall')
    expect(flow.recall?.countryIds).toEqual(['NO', 'SE', 'DK'])
  })

  it('uses one balanced shuffled set per round and completes a clean round', () => {
    let flow = startCapitalRecall(
      createCapitalLearningFlow({ countryIds: ['NO', 'SE', 'DK'] }),
      () => 0,
    )
    const prompted: string[] = []
    while (flow.phase === 'recall') {
      prompted.push(flow.recall!.currentCountryId)
      flow = submitCapitalRecall(flow, true, () => 0).state
    }
    expect(new Set(prompted)).toEqual(new Set(['NO', 'SE', 'DK']))
    expect(prompted).toHaveLength(3)
    expect(flow.phase).toBe('complete')
  })

  it('disqualifies an errored round and requires a fresh clean round', () => {
    let flow = startCapitalRecall(
      createCapitalLearningFlow({ countryIds: ['NO', 'SE'] }),
      () => 0,
    )
    const first = submitCapitalRecall(flow, false, () => 0)
    expect(first.result.startedNewRound).toBe(false)
    flow = first.state

    const repairedRoundAnswers: boolean[] = []
    while (flow.phase === 'recall' && flow.recall!.roundNumber === 1) {
      repairedRoundAnswers.push(true)
      flow = submitCapitalRecall(flow, true, () => 0).state
    }
    expect(repairedRoundAnswers).toHaveLength(1)
    expect(flow.phase).toBe('recall')
    expect(flow.recall?.roundNumber).toBe(2)

    while (flow.phase === 'recall') {
      flow = submitCapitalRecall(flow, true, () => 0).state
    }
    expect(flow.phase).toBe('complete')
  })

  it('reports only actual phase changes to Memo orchestration', () => {
    const flow = createCapitalLearningFlow({ countryIds: ['NO'] })
    const phases: string[] = []
    applyCapitalLearningTransition(flow, flow, phase => phases.push(phase))
    applyCapitalLearningTransition(flow, { ...flow, phase: 'recall' }, phase => phases.push(phase))
    applyCapitalLearningTransition({ ...flow, phase: 'recall' }, { ...flow, phase: 'complete' }, phase => phases.push(phase))
    expect(phases).toEqual(['recall', 'complete'])
  })
})
