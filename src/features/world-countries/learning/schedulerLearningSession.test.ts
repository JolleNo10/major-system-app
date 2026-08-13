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
})
