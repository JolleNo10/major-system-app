import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

export type WorldCountriesTodayReviewReason =
  | 'repeated-difficulty'
  | 'recent-mistake'
  | 'mistake-follow-up'
  | 'needs-first-recall'
  | 'first-review-after-learning'
  | 'spaced-review'

export interface WorldCountriesTodayReviewReasonSummary {
  mistakes: number
  firstRecall: number
  firstReviewAfterLearning: number
  spaced: number
  repeated: number
}

/** Classify a due candidate into learner-facing Today semantics. */
export function classifyWorldCountriesTodayReviewReason(
  candidate: WorldCountriesTodayReviewCandidate,
): WorldCountriesTodayReviewReason {
  const { schedule } = candidate
  if (schedule.difficulty === 'repeated') return 'repeated-difficulty'
  if (schedule.reason === 'latest-failure') return 'recent-mistake'
  if (schedule.difficulty === 'lapse') return 'mistake-follow-up'
  if (schedule.reason === 'missing-recall-success') return 'needs-first-recall'
  if (schedule.reason === 'scheduled' && schedule.latestAttemptAt === null) return 'first-review-after-learning'
  return 'spaced-review'
}

export function worldCountriesTodayReviewReasonLabel(
  reason: WorldCountriesTodayReviewReason,
  overdueDays = 0,
): string {
  switch (reason) {
    case 'repeated-difficulty':
      return 'Repeated difficulty · shorter follow-up'
    case 'recent-mistake':
      return 'Recent mistake'
    case 'mistake-follow-up':
      return 'Mistake follow-up'
    case 'needs-first-recall':
      return 'Needs first recall'
    case 'first-review-after-learning':
      return 'First review after Learning'
    case 'spaced-review':
      return overdueDays > 0
        ? `Spaced review · ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`
        : 'Spaced review'
  }
}

export function summarizeWorldCountriesTodayReviewReasons(
  candidates: readonly WorldCountriesTodayReviewCandidate[],
): WorldCountriesTodayReviewReasonSummary {
  const summary: WorldCountriesTodayReviewReasonSummary = {
    mistakes: 0,
    firstRecall: 0,
    firstReviewAfterLearning: 0,
    spaced: 0,
    repeated: 0,
  }

  for (const candidate of candidates) {
    const reason = classifyWorldCountriesTodayReviewReason(candidate)
    if (reason === 'repeated-difficulty') {
      summary.repeated += 1
      summary.mistakes += 1
    } else if (reason === 'recent-mistake' || reason === 'mistake-follow-up') {
      summary.mistakes += 1
    } else if (reason === 'needs-first-recall') {
      summary.firstRecall += 1
    } else if (reason === 'first-review-after-learning') {
      summary.firstReviewAfterLearning += 1
    } else {
      summary.spaced += 1
    }
  }

  return summary
}
