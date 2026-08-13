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

const NON_LIMITING_FAST_MS = Number.POSITIVE_INFINITY

function createSchedulerConfig(keys: readonly string[], settings: WorldCountriesSchedulerSettings) {
  const config = makeRoundConfig(keys.length, settings, { fastMs: NON_LIMITING_FAST_MS })
  // Keep the shared scheduler's algorithm and defaults unchanged while avoiding
  // an immediate repeat in the small scopes used by staged Learning. For these
  // scopes makeRoundConfig derives minimumGap=1, but selectNext measures the
  // immediate next prompt as distance=1; minimumGap=2 is therefore the smallest
  // local override that guarantees one different prompt in between.
  return keys.length > 1 && config.minimumGap < 2
    ? { ...config, minimumGap: 2 }
    : config
}

function createSchedulerRandom(random: () => number): () => number {
  // The shared sampler expects a value in [0, 1). Avoid its zero-boundary
  // behaviour locally without changing the shared implementation for other
  // consumers.
  return () => {
    const value = random()
    return value === 0 ? Number.EPSILON : value
  }
}

export function createSchedulerLearningSession(
  keys: readonly string[],
  settings: WorldCountriesSchedulerSettings,
  random: () => number = Math.random,
): SchedulerLearningSession {
  const uniqueKeys = [...new Set(keys)]
  const round = initRoundState()
  const config = createSchedulerConfig(uniqueKeys, settings)
  return {
    keys: uniqueKeys,
    currentKey: uniqueKeys.length > 0 ? selectNext(round, uniqueKeys, config, createSchedulerRandom(random)) : null,
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
  const config = createSchedulerConfig(session.keys, settings)
  const round = recordAnswer(session.round, session.currentKey, {
    correct: answer.correct,
    recallMs: Math.max(0, answer.latencyMs),
    hinted: answer.hinted ?? false,
  }, config)
  const ready = roundProgress(round, [...session.keys], config).all
  const currentKey = ready ? null : selectNext(round, [...session.keys], config, createSchedulerRandom(random))
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
  const config = createSchedulerConfig(session.keys, settings)
  return {
    ...session,
    currentKey: selectNext(session.round, [...session.keys], config, createSchedulerRandom(random)),
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
    createSchedulerConfig(session.keys, settings),
  )
}
