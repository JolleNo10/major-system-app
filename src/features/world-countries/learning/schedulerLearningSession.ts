import {
  initRoundState,
  makeRoundConfig,
  recordAnswer,
  roundProgress,
  selectNext,
  type RoundSettings,
  type RoundState,
} from '@/core/scoring/roundScheduler'

export type WorldCountriesSchedulerSettings = RoundSettings

export interface SchedulerLearningSession {
  keys: readonly string[]
  currentKey: string | null
  round: RoundState
  ready: boolean
}

export interface SchedulerLearningAnswer {
  correct: boolean
  latencyMs: number
  hinted?: boolean
}

export interface SchedulerLearningResult {
  session: SchedulerLearningSession
  key: string | null
  readyNow: boolean
}

export function createSchedulerLearningSession(
  keys: readonly string[],
  settings: WorldCountriesSchedulerSettings,
  random: () => number = Math.random,
): SchedulerLearningSession {
  const uniqueKeys = [...new Set(keys)]
  const round = initRoundState()
  const config = makeRoundConfig(uniqueKeys.length, settings, { fastMs: Number.POSITIVE_INFINITY })
  return {
    keys: uniqueKeys,
    currentKey: uniqueKeys.length > 0 ? selectNext(round, uniqueKeys, config, random) : null,
    round,
    ready: false,
  }
}

export function submitSchedulerLearningAnswer(
  session: SchedulerLearningSession,
  answer: SchedulerLearningAnswer,
  settings: WorldCountriesSchedulerSettings,
  random: () => number = Math.random,
): SchedulerLearningResult {
  if (session.keys.length === 0 || session.currentKey === null) {
    return { session, key: session.currentKey, readyNow: false }
  }
  const config = makeRoundConfig(session.keys.length, settings, { fastMs: Number.POSITIVE_INFINITY })
  const round = recordAnswer(session.round, session.currentKey, {
    correct: answer.correct,
    recallMs: Math.max(0, answer.latencyMs),
    hinted: answer.hinted ?? false,
  }, config)
  const ready = roundProgress(round, [...session.keys], config).all
  const currentKey = ready ? null : selectNext(round, [...session.keys], config, random)
  return {
    session: { ...session, round, currentKey, ready },
    key: session.currentKey,
    readyNow: !session.ready && ready,
  }
}

export function resumeSchedulerLearningSession(
  session: SchedulerLearningSession,
  settings: WorldCountriesSchedulerSettings,
  random: () => number = Math.random,
): SchedulerLearningSession {
  if (session.keys.length === 0) return session
  const config = makeRoundConfig(session.keys.length, settings, { fastMs: Number.POSITIVE_INFINITY })
  return {
    ...session,
    currentKey: selectNext(session.round, [...session.keys], config, random),
    ready: false,
  }
}

export function schedulerLearningProgress(
  session: SchedulerLearningSession,
  settings: WorldCountriesSchedulerSettings,
) {
  return roundProgress(
    session.round,
    [...session.keys],
    makeRoundConfig(session.keys.length, settings, { fastMs: Number.POSITIVE_INFINITY }),
  )
}
