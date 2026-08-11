export type GuidedLearningActionId =
  | 'learn-countries'
  | 'learn-capitals'
  | 'drill-countries-capitals'
  | 'review-countries'
  | 'review-capitals'

export interface GuidedLearningActions {
  primary: Exclude<GuidedLearningActionId, 'review-countries' | 'review-capitals'> | null
  secondary: readonly Extract<GuidedLearningActionId, 'review-countries' | 'review-capitals'>[]
}

export function getGuidedLearningActions({
  subregionCount,
  countryCount,
  countriesLearned,
  capitalsLearned,
}: {
  subregionCount: number
  countryCount: number
  countriesLearned: boolean
  capitalsLearned: boolean
}): GuidedLearningActions {
  if (subregionCount !== 1 || countryCount === 0) {
    return { primary: null, secondary: [] }
  }

  if (!countriesLearned) {
    return { primary: 'learn-countries', secondary: [] }
  }

  if (!capitalsLearned) {
    return { primary: 'learn-capitals', secondary: ['review-countries'] }
  }

  return {
    primary: 'drill-countries-capitals',
    secondary: ['review-countries', 'review-capitals'],
  }
}
