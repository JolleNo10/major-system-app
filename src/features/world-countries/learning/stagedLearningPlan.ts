import type { CountryId } from '@/features/world-countries/data/countries'

export type LearningSetMaximum = 3 | 4 | 5 | 'all'

export interface LearningSet<TId = CountryId> {
  index: number
  ids: readonly TId[]
}

export type LearningPlanStage<TId = CountryId> =
  | { kind: 'set'; set: LearningSet<TId> }
  | { kind: 'combined'; ids: readonly TId[] }
  | { kind: 'final'; ids: readonly TId[] }

export function partitionLearningSets<TId>(
  orderedIds: readonly TId[],
  maximum: LearningSetMaximum,
): LearningSet<TId>[] {
  const ids = [...orderedIds]
  if (ids.length === 0) return []
  if (maximum === 'all' || ids.length <= maximum) return [{ index: 0, ids }]

  const minimum = Math.ceil(maximum / 2)
  const setCount = Math.ceil(ids.length / maximum)
  const sets: LearningSet<TId>[] = []
  let offset = 0

  for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
    const remainingItems = ids.length - offset
    const remainingSets = setCount - setIndex
    const setsAfter = remainingSets - 1
    const largestAllowed = Math.min(maximum, remainingItems - setsAfter * minimum)
    const smallestAllowed = Math.max(minimum, remainingItems - setsAfter * maximum)
    const size = Math.max(smallestAllowed, largestAllowed)
    sets.push({ index: setIndex, ids: ids.slice(offset, offset + size) })
    offset += size
  }

  return sets
}

export function buildLearningPlan<TId>(
  orderedIds: readonly TId[],
  maximum: LearningSetMaximum,
): LearningPlanStage<TId>[] {
  const sets = partitionLearningSets(orderedIds, maximum)
  if (sets.length === 0) return []

  const stages: LearningPlanStage<TId>[] = []
  const introduced: TId[] = []
  sets.forEach((set, setIndex) => {
    stages.push({ kind: 'set', set })
    introduced.push(...set.ids)
    const shouldCombine = sets.length > 1 && (setIndex >= 1)
    if (shouldCombine) {
      stages.push({ kind: 'combined', ids: [...introduced] })
    }
  })
  stages.push({ kind: 'final', ids: [...introduced] })
  return stages
}
