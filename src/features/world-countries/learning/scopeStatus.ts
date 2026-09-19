import type { CountryId } from '@/features/world-countries/data/countries'
import type { WorldCountriesLearningReadiness } from './learningReadiness'
import { deriveWorldCountriesPrimaryStatus, WORLD_COUNTRIES_PROGRESS_LABELS } from './progressPresentation'
import type { WorldCountriesCountryProgress } from './recallProgress'

/**
 * The seven statuses a Country or scope can hold, lowest first.
 *
 * The first three are Learning milestones and the last four are recall
 * health. `learned` is the join: both Learning layers are complete and no
 * recall attempt has moved the Country yet. A success from there goes to
 * `developing` and a failure goes to `weak`, so `weak` is only ever reached
 * by failing.
 */
export const WORLD_COUNTRIES_STATUSES = [
  'NOT_LEARNED',
  'COUNTRIES_LEARNED',
  'learned',
  'weak',
  'developing',
  'strong',
  'complete',
] as const

export type WorldCountriesStatus = typeof WORLD_COUNTRIES_STATUSES[number]

const LEARNING_STATUSES = ['NOT_LEARNED', 'COUNTRIES_LEARNED', 'learned'] as const satisfies readonly WorldCountriesStatus[]

const STATUS_LABELS: Readonly<Record<WorldCountriesStatus, string>> = {
  NOT_LEARNED: 'Not learned',
  COUNTRIES_LEARNED: 'Countries learned',
  learned: WORLD_COUNTRIES_PROGRESS_LABELS.learned,
  weak: WORLD_COUNTRIES_PROGRESS_LABELS.weak,
  developing: WORLD_COUNTRIES_PROGRESS_LABELS.developing,
  strong: WORLD_COUNTRIES_PROGRESS_LABELS.strong,
  complete: WORLD_COUNTRIES_PROGRESS_LABELS.complete,
}

/** Trailing noun for the "<n> / <total> Countries …" count beneath a headline. */
const STATUS_COUNT_NOUNS: Readonly<Record<WorldCountriesStatus, string>> = {
  NOT_LEARNED: 'learned',
  COUNTRIES_LEARNED: 'learned',
  learned: 'learned',
  weak: 'weak',
  developing: 'developing',
  strong: 'strong',
  complete: 'fully mastered',
}

export interface WorldCountriesScopeStatus {
  status: WorldCountriesStatus
  label: string
  /** Null on the Learning statuses, which are milestones rather than a health share. */
  percent: number | null
  countAtStatus: number
  totalCountries: number
  /** Ready-to-render "<n> / <total> Countries …" line for this status. */
  countLabel: string
}

/** Render a scope headline, omitting the share on the percentage-less Learning statuses. */
export function formatWorldCountriesScopeStatus(status: WorldCountriesScopeStatus): string {
  return status.percent === null ? status.label : `${status.label} ${status.percent}%`
}

export function isWorldCountriesLearningStatus(status: WorldCountriesStatus): boolean {
  return (LEARNING_STATUSES as readonly WorldCountriesStatus[]).includes(status)
}

/** Place one Country on the status list; recall health is gated behind Learning. */
export function getWorldCountriesCountryStatus(
  readiness: WorldCountriesLearningReadiness,
  progress: WorldCountriesCountryProgress,
): WorldCountriesStatus {
  const status = deriveWorldCountriesPrimaryStatus(readiness, progress)
  if (status.kind === 'learning') {
    // A Country that has completed both layers always routes to the recall
    // branch, so only the two incomplete Learning milestones reach this one.
    return status.readiness === 'COUNTRIES_AND_CAPITALS_LEARNED' ? 'learned' : status.readiness
  }
  // The core perspective reports 'complete' rather than the atomic 'mastered'.
  return status.state === 'mastered' ? 'complete' : status.state
}

export function countWorldCountriesStatuses(
  countryIds: readonly CountryId[],
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
  progressByCountry: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
): Record<WorldCountriesStatus, number> {
  const counts = Object.fromEntries(
    WORLD_COUNTRIES_STATUSES.map(status => [status, 0]),
  ) as Record<WorldCountriesStatus, number>

  for (const countryId of countryIds) {
    const progress = progressByCountry.get(countryId)
    const readiness = readinessByCountry.get(countryId) ?? 'NOT_LEARNED'
    if (!progress) {
      counts[readiness === 'COUNTRIES_AND_CAPITALS_LEARNED' ? 'learned' : readiness]++
      continue
    }
    counts[getWorldCountriesCountryStatus(readiness, progress)]++
  }
  return counts
}

/**
 * Report the highest status a scope has actually reached, not its mastery
 * share.
 *
 * The headline used to be hardcoded to the top status, so every scope read
 * "Mastery 0%" until Countries were fully mastered and simply restated the
 * "0 / n Countries fully mastered" line beneath it.
 *
 * A full status is a finished status, so a scope sitting at 100% of anything
 * below the top reports the next one at 0% instead: that is the work that
 * remains. The Learning statuses are milestones rather than a health share,
 * so they carry no percentage and never promote - a fully learned scope reads
 * "Learned" rather than "Weak 0%".
 */
export function deriveWorldCountriesScopeStatusFromCounts(
  counts: Readonly<Record<WorldCountriesStatus, number>>,
  totalCountries: number,
): WorldCountriesScopeStatus {
  const reached = [...WORLD_COUNTRIES_STATUSES]
    .reverse()
    .find(status => counts[status] > 0) ?? 'NOT_LEARNED'

  const index = WORLD_COUNTRIES_STATUSES.indexOf(reached)
  const isTop = index === WORLD_COUNTRIES_STATUSES.length - 1
  const full = totalCountries > 0 && counts[reached] === totalCountries
  const status = !isWorldCountriesLearningStatus(reached) && full && !isTop
    ? WORLD_COUNTRIES_STATUSES[index + 1]
    : reached

  const countAtStatus = isWorldCountriesLearningStatus(status)
    // The Learning statuses all report the same milestone: how much of the
    // scope is learned at all. "<all> / <all> Countries not learned" carries
    // nothing.
    ? totalCountries - counts.NOT_LEARNED
    : counts[status]

  return {
    status,
    label: STATUS_LABELS[status],
    percent: isWorldCountriesLearningStatus(status) ? null : toPercent(countAtStatus, totalCountries),
    countAtStatus,
    totalCountries,
    countLabel: `${countAtStatus} / ${totalCountries} Countries ${STATUS_COUNT_NOUNS[status]}`,
  }
}

export function deriveWorldCountriesScopeStatus(
  countryIds: readonly CountryId[],
  readinessByCountry: ReadonlyMap<CountryId, WorldCountriesLearningReadiness>,
  progressByCountry: ReadonlyMap<CountryId, WorldCountriesCountryProgress>,
): WorldCountriesScopeStatus {
  const uniqueCountryIds = [...new Set(countryIds)]
  return deriveWorldCountriesScopeStatusFromCounts(
    countWorldCountriesStatuses(uniqueCountryIds, readinessByCountry, progressByCountry),
    uniqueCountryIds.length,
  )
}

function toPercent(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0
  // A status that has been reached must never read as 0%, or it is
  // indistinguishable from the empty next status the promotion rule reports.
  return Math.max(1, Math.round((count / total) * 100))
}
