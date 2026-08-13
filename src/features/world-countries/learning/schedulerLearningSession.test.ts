import { describe, expect, it } from 'vitest'
import {
  createSchedulerLearningSession,
  resumeSchedulerLearningSession,
  schedulerLearningProgress,
  submitSchedulerLearningAnswer,
} from './schedulerLearningSession'

const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }

describe('schedulerLearningSession', () => {
  it('uses a fresh scope and advances only on spaced correct answers', () => {
    let session = createSchedulerLearningSession(['A'], settings)
    expect(session.ready).toBe(false)

    session = submitSchedulerLearningAnswer(session, { correct: false, latencyMs: 10 }, settings).session
    expect(schedulerLearningProgress(session, settings).levelOf('A')).toBe(0)

    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 999_999 }, settings).session
    expect(schedulerLearningProgress(session, settings).levelOf('A')).toBe(1)
    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 10 }, settings).session
    expect(schedulerLearningProgress(session, settings).levelOf('A')).toBe(1)
    while (!session.ready) {
      session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 10 }, settings).session
    }
    expect(session.ready).toBe(true)
  })

  it('does not let a hinted answer advance the scheduler', () => {
    let session = createSchedulerLearningSession(['A'], settings)
    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 10, hinted: true }, settings).session
    expect(schedulerLearningProgress(session, settings).levelOf('A')).toBe(0)
  })

  it('resumes the same scheduler snapshot when a Ready scope keeps practising', () => {
    let session = createSchedulerLearningSession(['A'], settings)
    while (!session.ready) session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 10 }, settings).session
    const resumed = resumeSchedulerLearningSession(session, settings)
    expect(resumed.round.seq).toBe(session.round.seq)
    expect(resumed.currentKey).toBe('A')
    expect(resumed.ready).toBe(false)
  })

  it('does not immediately repeat a country in a small learning scope', () => {
    let session = createSchedulerLearningSession(['A', 'B', 'C'], settings, () => 0)
    const first = session.currentKey
    const result = submitSchedulerLearningAnswer(
      session,
      { correct: false, latencyMs: 10 },
      settings,
      () => 0.1,
    )

    expect(result.session.currentKey).not.toBe(first)
  })

  it('does not select a zero-weight country at the random lower boundary', () => {
    let session = createSchedulerLearningSession(['A', 'B', 'C'], settings, () => 0)
    const first = session.currentKey
    session = submitSchedulerLearningAnswer(session, { correct: false, latencyMs: 10 }, settings, () => 0).session

    expect(session.currentKey).not.toBe(first)
  })
})
