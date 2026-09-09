import { describe, expect, it } from 'vitest'
import { buildLearningPlan, deriveLearningSetPresentation, deriveLearningStagePresentation, partitionLearningSets } from './stagedLearningPlan'

describe('partitionLearningSets', () => {
  it.each([
    [3, 4, [2, 2]],
    [3, 7, [3, 2, 2]],
    [3, 9, [3, 3, 3]],
    [3, 10, [3, 3, 2, 2]],
    [4, 6, [4, 2]],
    [4, 7, [4, 3]],
    [5, 6, [3, 3]],
    [5, 7, [4, 3]],
    [5, 8, [5, 3]],
    [5, 11, [5, 3, 3]],
  ])('partitions %s items maximum with %s items as %s', (maximum, count, expected) => {
    const sets = partitionLearningSets(Array.from({ length: count }, (_, index) => index), maximum as 3 | 4 | 5)
    expect(sets.map(set => set.ids.length)).toEqual(expected)
    expect(sets.flatMap(set => set.ids)).toEqual(Array.from({ length: count }, (_, index) => index))
  })

  it('uses one set for all and for scopes within the maximum', () => {
    expect(partitionLearningSets(['a', 'b'], 3)).toEqual([{ index: 0, ids: ['a', 'b'] }])
    expect(partitionLearningSets(['a', 'b', 'c', 'd'], 'all')).toEqual([{ index: 0, ids: ['a', 'b', 'c', 'd'] }])
  })
})

describe('buildLearningPlan', () => {
  it('adds cumulative practice after the second and final sets', () => {
    const stages = buildLearningPlan(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3)
    expect(stages.map(stage => stage.kind === 'set' ? `set:${stage.set.ids.length}` : stage.kind)).toEqual([
      'set:3', 'set:2', 'combined', 'set:2', 'combined', 'final',
    ])
    expect(stages[2]).toMatchObject({ kind: 'combined', ids: ['a', 'b', 'c', 'd', 'e'] })
    expect(stages[4]).toMatchObject({ kind: 'combined', ids: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })
  })

  it('does not duplicate combined practice for a single set', () => {
    expect(buildLearningPlan(['a', 'b'], 3).map(stage => stage.kind)).toEqual(['set', 'final'])
  })

  it('derives previous, current, and upcoming Sets from the staged plan', () => {
    const plan = buildLearningPlan(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], 3)

    expect(deriveLearningSetPresentation(plan, 1)).toEqual({
      previousSetIds: ['a', 'b', 'c'],
      currentSetIds: ['d', 'e', 'f'],
      upcomingSetIds: ['g', 'h', 'i'],
    })
    expect(deriveLearningSetPresentation(plan, 2)).toBeNull()
  })

  it('derives Set context without inferring identity from scope counts', () => {
    const plan = buildLearningPlan(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3)

    expect(deriveLearningStagePresentation(plan, 1)).toEqual({
      kind: 'set',
      scopeIds: ['d', 'e'],
      setNumber: 2,
      setCount: 3,
      previousSetIds: ['a', 'b', 'c'],
      currentSetIds: ['d', 'e'],
      upcomingSetIds: ['f', 'g'],
    })
  })

  it('keeps one-Set context distinct from the later full-scope Final stage', () => {
    const plan = buildLearningPlan(['a', 'b'], 3)

    expect(deriveLearningStagePresentation(plan, 0)).toMatchObject({
      kind: 'set',
      scopeIds: ['a', 'b'],
      setNumber: 1,
      setCount: 1,
      currentSetIds: ['a', 'b'],
      previousSetIds: [],
      upcomingSetIds: [],
    })
    expect(deriveLearningStagePresentation(plan, 1)).toMatchObject({
      kind: 'final',
      scopeIds: ['a', 'b'],
      previousSetIds: [],
      currentSetIds: [],
      upcomingSetIds: [],
    })
  })

  it('derives cumulative Combined and full Final scopes without Set distinctions', () => {
    const plan = buildLearningPlan(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3)

    expect(deriveLearningStagePresentation(plan, 2)).toEqual({
      kind: 'combined',
      scopeIds: ['a', 'b', 'c', 'd', 'e'],
      setNumber: null,
      setCount: 3,
      previousSetIds: [],
      currentSetIds: [],
      upcomingSetIds: [],
    })
    expect(deriveLearningStagePresentation(plan, 5)).toEqual({
      kind: 'final',
      scopeIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      setNumber: null,
      setCount: 3,
      previousSetIds: [],
      currentSetIds: [],
      upcomingSetIds: [],
    })
  })
})
