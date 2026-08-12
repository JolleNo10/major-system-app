import type { SubregionId } from '@/features/world-countries/data/subregions'
import type { Country } from '@/features/world-countries/data/countries'
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

/** Learning-layer completion boundary used by the Capital Learning flow. */
export function createSubregionCapitalCompletionReporter(
  subregionId: SubregionId,
  entries?: readonly Country[],
): CapitalCompletionReporter {
  return createCapitalCompletionReporter(() => {
    markSubregionCapitalsLearned(subregionId, Date.now(), entries)
  })
}
