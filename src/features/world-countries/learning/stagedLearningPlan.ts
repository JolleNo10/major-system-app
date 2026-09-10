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

export interface LearningSetPresentation<TId = CountryId> {
  previousSetIds: readonly TId[]
  currentSetIds: readonly TId[]
  upcomingSetIds: readonly TId[]
}

export interface LearningStagePresentation<TId = CountryId> {
  kind: LearningPlanStage<TId>['kind']
  scopeIds: readonly TId[]
  setNumber: number | null
  setCount: number
  previousSetIds: readonly TId[]
  currentSetIds: readonly TId[]
  upcomingSetIds: readonly TId[]
}

export type LearningPresentationTrack = 'countries' | 'capitals'

/** Format the learner-facing count without exposing staged-plan terminology. */
export function formatLearningScopeCount(count: number, track: LearningPresentationTrack): string {
  if (track === 'capitals') return `${count} ${count === 1 ? 'country–capital pair' : 'country–capital pairs'}`
  return `${count} ${count === 1 ? 'country' : 'countries'}`
}

/** Set identity is useful only when the plan has multiple Sets. */
export function getLearningSetContextLabel(
  stagePresentation: LearningStagePresentation | null,
  count: number,
  track: LearningPresentationTrack,
): string {
  const countLabel = formatLearningScopeCount(count, track)
  return stagePresentation?.kind === 'set'
    && stagePresentation.setCount > 1
    && stagePresentation.setNumber !== null
    ? `Set ${stagePresentation.setNumber} · ${countLabel}`
    : countLabel
}

export function getLearningSetCompletionLabel(stagePresentation: LearningStagePresentation | null): string {
  return stagePresentation?.kind === 'set'
    && stagePresentation.setCount > 1
    && stagePresentation.setNumber !== null
    ? `Set ${stagePresentation.setNumber} complete`
    : 'Practice complete'
}

/** Derive Set status for the active staged Set without adding curriculum state. */
export function deriveLearningSetPresentation<TId>(
  plan: readonly LearningPlanStage<TId>[],
  stageIndex: number,
): LearningSetPresentation<TId> | null {
  if (plan[stageIndex]?.kind !== 'set') return null
  const setIds = (stages: readonly LearningPlanStage<TId>[]) => stages.flatMap(stage => stage.kind === 'set' ? stage.set.ids : [])
  return {
    previousSetIds: setIds(plan.slice(0, stageIndex)),
    currentSetIds: plan[stageIndex].set.ids,
    upcomingSetIds: setIds(plan.slice(stageIndex + 1)),
  }
}

/** Derive the orientation scope for any in-session staged Learning phase. */
export function deriveLearningStagePresentation<TId>(
  plan: readonly LearningPlanStage<TId>[],
  stageIndex: number,
): LearningStagePresentation<TId> | null {
  const stage = plan[stageIndex]
  if (!stage) return null

  const setCount = plan.filter(candidate => candidate.kind === 'set').length
  if (stage.kind === 'set') {
    const setPresentation = deriveLearningSetPresentation(plan, stageIndex)
    if (!setPresentation) return null
    return {
      kind: 'set',
      scopeIds: stage.set.ids,
      setNumber: stage.set.index + 1,
      setCount,
      ...setPresentation,
    }
  }

  return {
    kind: stage.kind,
    scopeIds: stage.ids,
    setNumber: null,
    setCount,
    previousSetIds: [],
    currentSetIds: [],
    upcomingSetIds: [],
  }
}

export function getNextLearningStageLabel<TId>(
  plan: readonly LearningPlanStage<TId>[],
  stageIndex: number,
): string {
  const next = plan[stageIndex + 1]
  if (!next) return 'Start final recall'
  if (next.kind === 'set') return `Continue to Set ${next.set.index + 1}`
  if (next.kind === 'combined') return `Mix all ${next.ids.length} together`
  return 'Start final recall'
}

export function getNextLearningStageDescription<TId>(
  plan: readonly LearningPlanStage<TId>[],
  stageIndex: number,
  track: 'countries' | 'capitals',
): string {
  const next = plan[stageIndex + 1]
  if (!next || next.kind === 'final') return 'Next: one final recall of the full Learning scope.'
  if (next.kind === 'set') {
    return track === 'countries'
      ? `Next: meet the countries in Set ${next.set.index + 1}.`
      : `Next: meet the capitals in Set ${next.set.index + 1}.`
  }
  return track === 'countries'
    ? `Next: mix all ${next.ids.length} introduced countries together.`
    : `Next: mix all ${next.ids.length} introduced country–capital pairs together.`
}

export function rebuildLearningPlanAfterCountryOrderSave<TId>(
  countryIds: readonly TId[],
  maximum: LearningSetMaximum,
  stageIndex: number,
): {
  countryIds: readonly TId[]
  plan: LearningPlanStage<TId>[]
  stageIndex: number
  walkthroughIndex: 0
} {
  const plan = buildLearningPlan(countryIds, maximum)
  return {
    countryIds,
    plan,
    stageIndex: Math.min(stageIndex, plan.length - 1),
    walkthroughIndex: 0,
  }
}

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
