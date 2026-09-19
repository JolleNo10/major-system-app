import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesLearningReadiness } from './learningReadiness'
import { deriveWorldCountriesPrimaryStatus, WORLD_COUNTRIES_PROGRESS_LABELS } from './progressPresentation'
import type { WorldCountriesCountryProgress } from './recallProgress'

/**
 * The single ladder a scope headline walks, lowest rung first.
 *
 * This is the two-row legend the map already shows: the Learning milestones
 * followed by the recall-health states a Country only enters once its
 * Countries and Capitals are both learned.
 */
export const WORLD_COUNTRIES_SCOPE_STATUS_TIERS = [
  'NOT_LEARNED',
  'COUNTRIES_LEARNED',
  'unpractised',
  'weak',
  'developing',
  'strong',
  'complete',
] as const

export type WorldCountriesScopeStatusTier = typeof WORLD_COUNTRIES_SCOPE_STATUS_TIERS[number]

const LEARNING_TIERS = ['NOT_LEARNED', 'COUNTRIES_LEARNED'] as const satisfies readonly WorldCountriesScopeStatusTier[]

const TIER_LABELS: Readonly<Record<WorldCountriesScopeStatusTier, string>> = {
  NOT_LEARNED: 'Not learned',
  COUNTRIES_LEARNED: 'Learned',
  unpractised: WORLD_COUNTRIES_PROGRESS_LABELS.unpractised,
  weak: WORLD_COUNTRIES_PROGRESS_LABELS.weak,
  developing: WORLD_COUNTRIES_PROGRESS_LABELS.developing,
  strong: WORLD_COUNTRIES_PROGRESS_LABELS.strong,
  complete: WORLD_COUNTRIES_PROGRESS_LABELS.complete,
}

/** Trailing noun for the "<n> / <total> Countries …" count beneath a headline. */
const TIER_COUNT_NOUNS: Readonly<Record<WorldCountriesScopeStatusTier, string>> = {
  NOT_LEARNED: 'learned',
  COUNTRIES_LEARNED: 'learned',
  unpractised: 'in early recall',
  weak: 'weak',
  developing: 'developing',
  strong: 'strong',
  complete: 'fully mastered',
}

export interface WorldCountriesScopeStatus {
  tier: WorldCountriesScopeStatusTier
  label: string
  /** Null on the Learning rungs, which are milestones rather than a health share. */
  percent: number | null
  countAtTier: number
  totalCountries: number
  /** Ready-to-render "<n> / <total> Countries …" line for this tier. */
  countLabel: string
}

/** Render a scope headline, omitting the share on the percentage-less Learning rungs. */
export function formatWorldCountriesScopeStatus(status: WorldCountriesScopeStatus): string {
  return status.percent === null ? status.label : `${status.label} ${status.percent}%`
}

export function isWorldCountriesLearningTier(tier: WorldCountriesScopeStatusTier): boolean {
  return (LEARNING_TIERS as readonly WorldCountriesScopeStatusTier[]).includes(tier)
}

/** Place one Country on the ladder; recall health is gated behind Learning. */
export function getWorldCountriesCountryStatusTier(
  readiness: WorldCountriesLearningReadiness,
  progress: WorldCountriesCountryProgress,
): WorldCountriesScopeStatusTier {
  const status = deriveWorldCountriesPrimaryStatus(readiness, progress)
  if (status.kind === 'learning') {
    // A Country that has learned both tracks always routes to the recall
    // rungs above, so only the two Learning rungs can reach this branch.
    return status.readiness === 'COUNTRIES_AND_CAPITALS_LEARNED' ? 'unpractised' : status.readiness
  }
  // The core perspective reports 'complete' rather than the atomic 'mastered'.
  return status.state === 'mastered' ? 'complete' : status.state
}

export function countWorldCountriesScopeStatusTiers(
  countryIds: readonly CountryId[],
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
  progressByCountry: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
): Record<WorldCountriesScopeStatusTier, number> {
  const counts = Object.fromEntries(
    WORLD_COUNTRIES_SCOPE_STATUS_TIERS.map(tier => [tier, 0]),
  ) as Record<WorldCountriesScopeStatusTier, number>

  for (const countryId of countryIds) {
    const progress = progressByCountry.get(countryId)
    const readiness = readinessByCountry.get(countryId) ?? 'NOT_LEARNED'
    if (!progress) {
      counts[readiness === 'COUNTRIES_AND_CAPITALS_LEARNED' ? 'unpractised' : readiness]++
      continue
    }
    counts[getWorldCountriesCountryStatusTier(readiness, progress)]++
  }
  return counts
}

/**
 * Report the highest rung a scope has actually reached, not its mastery share.
 *
 * The headline used to be hardcoded to the top rung, so every scope read
 * "Mastery 0%" until Countries were fully mastered and simply restated the
 * "0 / n Countries fully mastered" line beneath it.
 *
 * A rung that is already full is a finished rung, so a scope sitting at 100%
 * of anything below the top reports the next rung at 0% instead: that is the
 * work that remains. The Learning rungs are milestones rather than a health
 * share, so they carry no percentage and never promote - a fully learned
 * scope reads "Learned" rather than "Early recall 0%".
 */
export function deriveWorldCountriesScopeStatusFromCounts(
  counts: Readonly<Record<WorldCountriesScopeStatusTier, number>>,
  totalCountries: number,
): WorldCountriesScopeStatus {
  const reached = [...WORLD_COUNTRIES_SCOPE_STATUS_TIERS]
    .reverse()
    .find(tier => counts[tier] > 0) ?? 'NOT_LEARNED'

  const index = WORLD_COUNTRIES_SCOPE_STATUS_TIERS.indexOf(reached)
  const isTop = index === WORLD_COUNTRIES_SCOPE_STATUS_TIERS.length - 1
  const full = totalCountries > 0 && counts[reached] === totalCountries
  const tier = !isWorldCountriesLearningTier(reached) && full && !isTop
    ? WORLD_COUNTRIES_SCOPE_STATUS_TIERS[index + 1]
    : reached

  const countAtTier = isWorldCountriesLearningTier(tier)
    // Both Learning rungs report the same milestone: how much of the scope is
    // learned at all. "<all> / <all> Countries not learned" carries nothing.
    ? totalCountries - counts.NOT_LEARNED
    : counts[tier]

  return {
    tier,
    label: TIER_LABELS[tier],
    percent: isWorldCountriesLearningTier(tier) ? null : toPercent(countAtTier, totalCountries),
    countAtTier,
    totalCountries,
    countLabel: `${countAtTier} / ${totalCountries} Countries ${TIER_COUNT_NOUNS[tier]}`,
  }
}

export function deriveWorldCountriesScopeStatus(
  countryIds: readonly CountryId[],
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
  progressByCountry: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
): WorldCountriesScopeStatus {
  const uniqueCountryIds = [...new Set(countryIds)]
  return deriveWorldCountriesScopeStatusFromCounts(
    countWorldCountriesScopeStatusTiers(uniqueCountryIds, readinessByCountry, progressByCountry),
    uniqueCountryIds.length,
  )
}

function toPercent(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0
  // A rung that has been reached must never read as 0%, or it is
  // indistinguishable from the empty next rung the promotion rule reports.
  return Math.max(1, Math.round((count / total) * 100))
}
