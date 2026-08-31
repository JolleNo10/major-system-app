import type { Country, CountryId } from '@/features/world-countries/data/countries'
import {
  getEffectiveLandBorderNeighbourIds,
  hasEffectiveLandBorderNeighbours,
} from '@/features/world-countries/data/landBorders'
import type { PracticeQuestionCount } from './practiceRun'
import { snapshotPracticeCountries, shufflePracticeItems } from './practiceRunUtils'

export interface NeighboursQuizQuestion {
  targetId: CountryId
  requiredNeighbourIds: readonly CountryId[]
}

export interface NeighboursQuizRun {
  type: 'neighbours'
  countries: readonly Country[]
  targetIds: readonly CountryId[]
  questionCount: PracticeQuestionCount
  fuzzyMatching: boolean
  questions: readonly NeighboursQuizQuestion[]
}

export type NeighboursTargetPhase = 'active' | 'complete' | 'review'

export interface NeighboursTargetState {
  targetId: CountryId
  requiredNeighbourIds: readonly CountryId[]
  foundNeighbourIds: readonly CountryId[]
  revealedNeighbourIds: readonly CountryId[]
  incorrectGuesses: readonly string[]
  showNumberUsed: boolean
  revealMapUsed: boolean
  phase: NeighboursTargetPhase
}

export interface NeighboursQuizSessionState {
  phase: 'active' | 'complete'
  targetIndex: number
  targets: readonly NeighboursTargetState[]
}

export type NeighboursGuessOutcome = 'found' | 'already-found' | 'incorrect' | 'inactive'

export interface NeighboursGuess {
  countryId?: CountryId | null
  submittedAnswer: string
}

export interface NeighboursGuessResult {
  state: NeighboursQuizSessionState
  outcome: NeighboursGuessOutcome
}

export interface NeighboursQuizSummary {
  totalRequired: number
  named: number
  revealed: number
  incorrectGuesses: number
  perfectTargets: number
  totalTargets: number
  imperfectTargetIds: readonly CountryId[]
}

/** Return target candidates with at least one active canonical neighbour. */
export function getEligibleNeighboursTargetCountries(
  scopeCountries: readonly Country[],
  activeCountries: readonly Country[],
): Country[] {
  const activeIds = activeCountries.map(country => country.id)
  const activeById = new Map(activeCountries.map(country => [country.id, country]))
  const seen = new Set<CountryId>()
  return scopeCountries.flatMap(country => {
    if (seen.has(country.id) || !activeById.has(country.id)) return []
    seen.add(country.id)
    return hasEffectiveLandBorderNeighbours(country.id, activeIds) ? [activeById.get(country.id)!] : []
  })
}

/** Create a randomized, snapshot-based Country → neighbours Practice run. */
export function createNeighboursQuizRun({
  scopeCountries,
  activeCountries,
  questionCount,
  targetIds,
  fuzzyMatching = false,
  random = Math.random,
}: {
  scopeCountries: readonly Country[]
  activeCountries: readonly Country[]
  questionCount: PracticeQuestionCount
  /** Supplied only by Retry missed; it bypasses the configured count. */
  targetIds?: readonly CountryId[]
  fuzzyMatching?: boolean
  random?: () => number
}): NeighboursQuizRun | null {
  const countries = snapshotPracticeCountries(activeCountries)
  const activeIds = countries.map(country => country.id)
  const eligibleIds = getEligibleNeighboursTargetCountries(scopeCountries, countries).map(country => country.id)
  const eligibleIdSet = new Set(eligibleIds)
  const requestedIds = targetIds
    ? [...new Set(targetIds)].filter(id => eligibleIdSet.has(id))
    : eligibleIds
  if (requestedIds.length === 0) return null

  const selectedIds = shufflePracticeItems(requestedIds, random).slice(
    0,
    targetIds ? requestedIds.length : questionCount === 'all' ? requestedIds.length : Math.min(questionCount, requestedIds.length),
  )
  const questions = selectedIds.map(targetId => ({
    targetId,
    requiredNeighbourIds: getEffectiveLandBorderNeighbourIds(targetId, activeIds),
  }))
  return {
    type: 'neighbours',
    countries,
    targetIds: selectedIds,
    questionCount: targetIds ? 'all' : questionCount,
    fuzzyMatching,
    questions,
  }
}

/** Retry the imperfect targets from the completed snapshot exactly once each. */
export function createNeighboursRetryRun(
  run: NeighboursQuizRun,
  targetIds: readonly CountryId[],
  random: () => number = Math.random,
): NeighboursQuizRun | null {
  const requested = new Set(targetIds)
  const questions = shufflePracticeItems(
    run.questions.filter(question => requested.has(question.targetId)),
    random,
  )
  if (questions.length === 0) return null
  const selectedIds = questions.map(question => question.targetId)
  return {
    ...run,
    countries: snapshotPracticeCountries(run.countries),
    targetIds: selectedIds,
    questionCount: 'all',
    questions,
  }
}

export function createNeighboursQuizSession(run: NeighboursQuizRun): NeighboursQuizSessionState {
  return {
    phase: 'active',
    targetIndex: 0,
    targets: run.questions.map(question => ({
      targetId: question.targetId,
      requiredNeighbourIds: [...question.requiredNeighbourIds],
      foundNeighbourIds: [],
      revealedNeighbourIds: [],
      incorrectGuesses: [],
      showNumberUsed: false,
      revealMapUsed: false,
      phase: 'active',
    })),
  }
}

export function getCurrentNeighboursTarget(
  session: NeighboursQuizSessionState,
): NeighboursTargetState | undefined {
  return session.targets[session.targetIndex]
}

export function applyNeighboursGuess(
  session: NeighboursQuizSessionState,
  guess: NeighboursGuess,
): NeighboursGuessResult {
  const current = getCurrentNeighboursTarget(session)
  if (session.phase === 'complete' || !current || current.phase !== 'active') {
    return { state: session, outcome: 'inactive' }
  }

  if (guess.countryId && current.requiredNeighbourIds.includes(guess.countryId)) {
    if (current.foundNeighbourIds.includes(guess.countryId) || current.revealedNeighbourIds.includes(guess.countryId)) {
      return { state: session, outcome: 'already-found' }
    }
    const foundNeighbourIds = [...current.foundNeighbourIds, guess.countryId]
    const complete = foundNeighbourIds.length === current.requiredNeighbourIds.length
    return {
      state: replaceCurrentTarget(session, {
        ...current,
        foundNeighbourIds,
        phase: complete ? 'complete' : 'active',
      }),
      outcome: 'found',
    }
  }

  return {
    state: replaceCurrentTarget(session, {
      ...current,
      incorrectGuesses: [...current.incorrectGuesses, guess.submittedAnswer],
    }),
    outcome: 'incorrect',
  }
}

export function showNeighboursNumber(session: NeighboursQuizSessionState): NeighboursQuizSessionState {
  const current = getCurrentNeighboursTarget(session)
  if (session.phase === 'complete' || !current || current.showNumberUsed) return session
  return replaceCurrentTarget(session, { ...current, showNumberUsed: true })
}

export function revealNeighboursMap(session: NeighboursQuizSessionState): NeighboursQuizSessionState {
  const current = getCurrentNeighboursTarget(session)
  if (session.phase === 'complete' || !current || current.revealMapUsed) return session
  return replaceCurrentTarget(session, { ...current, revealMapUsed: true })
}

/** Resolve all unanswered neighbours into an explicit review state. */
export function revealNeighboursRemaining(session: NeighboursQuizSessionState): NeighboursQuizSessionState {
  const current = getCurrentNeighboursTarget(session)
  if (session.phase === 'complete' || !current || current.phase !== 'active') return session
  const resolved = new Set([...current.foundNeighbourIds, ...current.revealedNeighbourIds])
  const unresolved = current.requiredNeighbourIds.filter(id => !resolved.has(id))
  if (unresolved.length === 0) return session
  return replaceCurrentTarget(session, {
    ...current,
    revealedNeighbourIds: [...current.revealedNeighbourIds, ...unresolved],
    phase: 'review',
  })
}

/** Continue after a completed target or explicit reveal review. */
export function advanceNeighboursTarget(session: NeighboursQuizSessionState): NeighboursQuizSessionState {
  const current = getCurrentNeighboursTarget(session)
  if (!current || (current.phase !== 'complete' && current.phase !== 'review')) return session
  const nextIndex = session.targetIndex + 1
  if (nextIndex >= session.targets.length) return { ...session, phase: 'complete' }
  return { ...session, targetIndex: nextIndex }
}

export function isNeighboursTargetPerfect(target: NeighboursTargetState): boolean {
  return target.revealedNeighbourIds.length === 0
    && target.foundNeighbourIds.length === target.requiredNeighbourIds.length
    && target.incorrectGuesses.length === 0
}

export function summarizeNeighboursRun(
  run: NeighboursQuizRun,
  session: NeighboursQuizSessionState,
): NeighboursQuizSummary {
  const byId = new Map(session.targets.map(target => [target.targetId, target]))
  const targets = run.questions.map(question => byId.get(question.targetId)).filter((target): target is NeighboursTargetState => target !== undefined)
  const imperfectTargetIds = targets.filter(target => !isNeighboursTargetPerfect(target)).map(target => target.targetId)
  return {
    totalRequired: targets.reduce((total, target) => total + target.requiredNeighbourIds.length, 0),
    named: targets.reduce((total, target) => total + target.foundNeighbourIds.length, 0),
    revealed: targets.reduce((total, target) => total + target.revealedNeighbourIds.length, 0),
    incorrectGuesses: targets.reduce((total, target) => total + target.incorrectGuesses.length, 0),
    perfectTargets: targets.filter(isNeighboursTargetPerfect).length,
    totalTargets: targets.length,
    imperfectTargetIds,
  }
}

function replaceCurrentTarget(
  session: NeighboursQuizSessionState,
  target: NeighboursTargetState,
): NeighboursQuizSessionState {
  return {
    ...session,
    targets: session.targets.map((candidate, index) => index === session.targetIndex ? target : candidate),
  }
}
