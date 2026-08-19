import { recallTargetIdFor } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

export type WorldCountriesTodayReviewPromptKind = 'initial' | 'retry'

export interface WorldCountriesTodayReviewPrompt {
  candidate: WorldCountriesTodayReviewCandidate
  kind: WorldCountriesTodayReviewPromptKind
}

export interface WorldCountriesTodayReviewQueueState {
  prompts: readonly WorldCountriesTodayReviewPrompt[]
  cursor: number
  reviewed: number
  correctFirstTry: number
  recoveredOnRetry: number
  unresolvedTargetIds: readonly string[]
}

export function createWorldCountriesTodayReviewQueue(
  candidates: readonly WorldCountriesTodayReviewCandidate[],
): WorldCountriesTodayReviewQueueState {
  return {
    prompts: candidates.map(candidate => ({ candidate, kind: 'initial' })),
    cursor: 0,
    reviewed: 0,
    correctFirstTry: 0,
    recoveredOnRetry: 0,
    unresolvedTargetIds: [],
  }
}

export function getCurrentWorldCountriesTodayReviewPrompt(
  state: WorldCountriesTodayReviewQueueState,
): WorldCountriesTodayReviewPrompt | null {
  return state.prompts[state.cursor] ?? null
}

function updateUnresolved(
  ids: readonly string[],
  targetId: string,
  resolved: boolean,
): readonly string[] {
  const next = new Set(ids)
  if (resolved) next.delete(targetId)
  else next.add(targetId)
  return [...next]
}

/** Advance one prompt, inserting at most one delayed retry when possible. */
export function submitWorldCountriesTodayReviewPrompt(
  state: WorldCountriesTodayReviewQueueState,
  result: 'correct' | 'incorrect' | 'skip',
): WorldCountriesTodayReviewQueueState {
  const prompt = getCurrentWorldCountriesTodayReviewPrompt(state)
  if (!prompt) return state
  const targetId = recallTargetIdFor(prompt.candidate.target.countryId, prompt.candidate.target.skill)
  let prompts = [...state.prompts]
  let unresolvedTargetIds = state.unresolvedTargetIds
  let reviewed = state.reviewed
  let correctFirstTry = state.correctFirstTry
  let recoveredOnRetry = state.recoveredOnRetry

  if (prompt.kind === 'initial') {
    reviewed += 1
    if (result === 'correct') {
      correctFirstTry += 1
      unresolvedTargetIds = updateUnresolved(unresolvedTargetIds, targetId, true)
    } else {
      unresolvedTargetIds = updateUnresolved(unresolvedTargetIds, targetId, false)
      const remainingPromptCount = prompts.length - state.cursor - 1
      if (result === 'incorrect' && remainingPromptCount >= 2) {
        prompts.splice(state.cursor + 3, 0, { candidate: prompt.candidate, kind: 'retry' })
      }
    }
  } else if (result === 'correct') {
    recoveredOnRetry += 1
    unresolvedTargetIds = updateUnresolved(unresolvedTargetIds, targetId, true)
  } else {
    unresolvedTargetIds = updateUnresolved(unresolvedTargetIds, targetId, false)
  }

  return {
    prompts,
    cursor: state.cursor + 1,
    reviewed,
    correctFirstTry,
    recoveredOnRetry,
    unresolvedTargetIds,
  }
}

export function isWorldCountriesTodayReviewQueueComplete(
  state: WorldCountriesTodayReviewQueueState,
): boolean {
  return state.cursor >= state.prompts.length
}

export function getWorldCountriesTodayReviewStillNeedsWork(
  state: WorldCountriesTodayReviewQueueState,
): number {
  return state.unresolvedTargetIds.length
}
