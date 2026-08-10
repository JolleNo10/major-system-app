import type { SubregionId } from '@/features/world-countries/data/subregions'
import { markSubregionCapitalsLearned } from './subregionLearningStore'

export interface CapitalCompletionReporter {
  report(completedNow: boolean): boolean
  reset(): void
}

/** Keep one successful Capital session from writing completion more than once. */
export function createCapitalCompletionReporter(onCompleted: () => void): CapitalCompletionReporter {
  let reported = false
  return {
    report(completedNow) {
      if (!completedNow || reported) return false
      reported = true
      onCompleted()
      return true
    },
    reset() {
      reported = false
    },
  }
}

/** Learning-layer completion boundary used by Memo orchestration. */
export function createSubregionCapitalCompletionReporter(
  subregionId: SubregionId,
): CapitalCompletionReporter {
  return createCapitalCompletionReporter(() => {
    markSubregionCapitalsLearned(subregionId)
  })
}
