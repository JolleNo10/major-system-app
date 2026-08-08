import type { ItemProgress } from './itemProgress'

export interface MasteryPolicy {
  isMastered(progress: ItemProgress): boolean
}

export interface MasteryPolicyOptions {
  minimumConsecutiveCorrect?: number
}

/**
 * The initial shared policy is intentionally small: an item is mastered after
 * two consecutive successful recalls. More nuanced policies can be introduced
 * here without teaching feature domains how mastery is calculated.
 */
export function createMasteryPolicy(options: MasteryPolicyOptions = {}): MasteryPolicy {
  const minimumConsecutiveCorrect = Math.max(
    1,
    options.minimumConsecutiveCorrect ?? 2,
  )

  return {
    isMastered: progress => (
      progress.attempts > 0
      && progress.consecutiveCorrect >= minimumConsecutiveCorrect
    ),
  }
}

export const defaultMasteryPolicy: MasteryPolicy = createMasteryPolicy()
