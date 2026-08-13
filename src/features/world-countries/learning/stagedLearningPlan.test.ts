import { describe, expect, it } from 'vitest'
import { buildLearningPlan, partitionLearningSets } from './stagedLearningPlan'

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
})
