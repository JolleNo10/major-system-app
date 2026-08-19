import { describe, expect, it } from 'vitest'
import {
  createSchedulerLearningSession,
  submitSchedulerLearningAnswer,
} from './schedulerLearningSession'
import { deriveLearningPracticeProgress } from './learningPracticeProgress'

const settings = { masteryLatencyFactor: 1.4, sessionUnmasteredShare: 0.5 }

describe('learning practice progress', () => {
  it('exposes continuous progress and the count at target', () => {
    let session = createSchedulerLearningSession(['A'], settings, () => 0)
    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 999_999 }, settings, () => 0).session

    expect(deriveLearningPracticeProgress(session, settings)).toEqual({
      pct: 0.5,
      atTarget: 0,
      total: 1,
    })
  })

  it('reflects scheduler regression after an incorrect answer', () => {
    let session = createSchedulerLearningSession(['A'], settings, () => 0)
    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 999_999 }, settings, () => 0).session
    expect(deriveLearningPracticeProgress(session, settings)?.pct).toBe(0.5)

    session = submitSchedulerLearningAnswer(session, { correct: false, latencyMs: 10 }, settings, () => 0).session

    expect(deriveLearningPracticeProgress(session, settings)).toEqual({
      pct: 0,
      atTarget: 0,
      total: 1,
    })
  })

  it('does not increase when a correct recall is too soon to advance spacing', () => {
    let session = createSchedulerLearningSession(['A'], settings, () => 0)
    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 999_999 }, settings, () => 0).session
    const before = deriveLearningPracticeProgress(session, settings)

    session = submitSchedulerLearningAnswer(session, { correct: true, latencyMs: 10 }, settings, () => 0).session

    expect(deriveLearningPracticeProgress(session, settings)).toEqual(before)
  })

  it('does not create a progress model for an empty scope', () => {
    const session = createSchedulerLearningSession([], settings)

    expect(deriveLearningPracticeProgress(session, settings)).toBeNull()
  })
})
