import type { Attempt } from '@/core/learning'

export const WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const
const DAY_MS = 24 * 60 * 60 * 1000

export type WorldCountriesReviewDueReason =
  | 'latest-failure'
  | 'missing-recall-success'
  | 'scheduled'
  | 'not-introduced'
  | 'not-due'

export type WorldCountriesReviewDifficulty = 'normal' | 'lapse' | 'repeated'
export type WorldCountriesReviewSpacingLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface ReviewScheduleOptions {
  /** Explicit wall-clock timestamp for deterministic tests. */
  now?: number
  /** Explicit learner-local date for deterministic tests. */
  localDate?: string
  /** Applicable Learning milestone used only when history is empty. */
  milestoneAt?: number | null
}

export interface WorldCountriesReviewSchedule {
  introduced: boolean
  due: boolean
  reason: WorldCountriesReviewDueReason
  priorityTier: 1 | 2 | 3 | null
  latestAttemptAt: number | null
  latestFailureAt: number | null
  qualifyingRecallDates: readonly string[]
  difficulty: WorldCountriesReviewDifficulty
  spacingLevel: WorldCountriesReviewSpacingLevel | null
  intervalDays: typeof WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS[number] | null
  nextDueAt: number | null
  nextDueDate: string | null
  overdueDays: number
}

interface IndexedAttempt extends Attempt {
  index: number
}

interface DatedAttemptGroup {
  localDate: string
  hasRecallSuccess: boolean
  hasFailure: boolean
}

interface DerivedSpacing {
  difficulty: WorldCountriesReviewDifficulty
  spacingLevel: WorldCountriesReviewSpacingLevel | null
  qualifyingRecallDates: readonly string[]
}

export function isValidWorldCountriesLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export function worldCountriesLocalDateForTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addWorldCountriesCalendarDays(localDate: string, days: number): string {
  if (!isValidWorldCountriesLocalDate(localDate)) throw new Error('Invalid World Countries local date')
  const [year, month, day] = localDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function daysBetween(later: string, earlier: string): number {
  const [laterYear, laterMonth, laterDay] = later.split('-').map(Number)
  const [earlierYear, earlierMonth, earlierDay] = earlier.split('-').map(Number)
  return Math.max(0, Math.floor((
    Date.UTC(laterYear, laterMonth - 1, laterDay)
    - Date.UTC(earlierYear, earlierMonth - 1, earlierDay)
  ) / DAY_MS))
}

function timestampForLocalDate(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function sortedAttempts(input: readonly Attempt[]): IndexedAttempt[] {
  return input
    .map((attempt, index) => ({ ...attempt, index }))
    .sort((left, right) => left.at - right.at || left.index - right.index)
}

function emptySchedule(reason: WorldCountriesReviewDueReason): WorldCountriesReviewSchedule {
  return {
    introduced: reason !== 'not-introduced',
    due: false,
    reason,
    priorityTier: null,
    latestAttemptAt: null,
    latestFailureAt: null,
    qualifyingRecallDates: [],
    difficulty: 'normal',
    spacingLevel: null,
    intervalDays: null,
    nextDueAt: null,
    nextDueDate: null,
    overdueDays: 0,
  }
}

function spacingLevelFor(value: number): WorldCountriesReviewSpacingLevel {
  return Math.max(0, Math.min(
    WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS.length - 1,
    value,
  )) as WorldCountriesReviewSpacingLevel
}

function datedAttemptGroups(attempts: readonly IndexedAttempt[]): DatedAttemptGroup[] {
  const groups = new Map<string, DatedAttemptGroup>()
  for (const attempt of attempts) {
    if (!isValidWorldCountriesLocalDate(attempt.localDate)) continue
    const localDate = attempt.localDate
    const group = groups.get(localDate) ?? {
      localDate,
      hasRecallSuccess: false,
      hasFailure: false,
    }
    if (attempt.ok === false) group.hasFailure = true
    if (attempt.ok === true && attempt.evidenceKind === 'recall') group.hasRecallSuccess = true
    groups.set(localDate, group)
  }
  return [...groups.values()].sort((left, right) => left.localDate.localeCompare(right.localDate))
}

/** Derive spacing and current difficulty from one event per valid learner-local day. */
function deriveSpacing(attempts: readonly IndexedAttempt[]): DerivedSpacing {
  const groups = datedAttemptGroups(attempts)
  const qualifyingRecallDates = groups
    .filter(group => group.hasRecallSuccess)
    .map(group => group.localDate)

  let spacingLevel: WorldCountriesReviewSpacingLevel | null = null
  let difficulty: WorldCountriesReviewDifficulty = 'normal'
  let cleanDaysAfterLapse = 0

  for (const group of groups) {
    if (spacingLevel === null) {
      if (!group.hasRecallSuccess) continue
      spacingLevel = 0
      if (group.hasFailure) {
        difficulty = 'lapse'
        cleanDaysAfterLapse = 0
      }
      continue
    }

    if (group.hasFailure) {
      const repeated: boolean = difficulty !== 'normal' && cleanDaysAfterLapse < 2
      spacingLevel = spacingLevelFor(spacingLevel - (repeated ? 2 : 1))
      difficulty = repeated ? 'repeated' : 'lapse'
      cleanDaysAfterLapse = 0
      continue
    }

    if (!group.hasRecallSuccess) continue
    spacingLevel = spacingLevelFor(spacingLevel + 1)
    if (difficulty !== 'normal') {
      cleanDaysAfterLapse += 1
      if (cleanDaysAfterLapse >= 2) {
        difficulty = 'normal'
        cleanDaysAfterLapse = 0
      }
    }
  }

  return { difficulty, spacingLevel, qualifyingRecallDates }
}

/** Derive one feature-local temporal review schedule from retained evidence. */
export function deriveWorldCountriesReviewSchedule(
  inputAttempts: readonly Attempt[],
  options: ReviewScheduleOptions = {},
): WorldCountriesReviewSchedule {
  const attempts = sortedAttempts(inputAttempts)
  const now = options.now ?? Date.now()
  const currentLocalDate = isValidWorldCountriesLocalDate(options.localDate)
    ? options.localDate
    : worldCountriesLocalDateForTimestamp(now)
  const milestoneAt = typeof options.milestoneAt === 'number' && Number.isFinite(options.milestoneAt)
    ? options.milestoneAt
    : null
  const introduced = attempts.some(attempt => attempt.ok === true) || milestoneAt !== null

  if (!introduced) return emptySchedule('not-introduced')

  if (attempts.length === 0 && milestoneAt !== null) {
    const nextDueAt = milestoneAt + DAY_MS
    return {
      introduced: true,
      due: now >= nextDueAt,
      reason: now >= nextDueAt ? 'scheduled' : 'not-due',
      priorityTier: now >= nextDueAt ? 3 : null,
      latestAttemptAt: null,
      latestFailureAt: null,
      qualifyingRecallDates: [],
      difficulty: 'normal',
      spacingLevel: null,
      intervalDays: null,
      nextDueAt,
      nextDueDate: worldCountriesLocalDateForTimestamp(nextDueAt),
      overdueDays: daysBetween(currentLocalDate, worldCountriesLocalDateForTimestamp(nextDueAt)),
    }
  }

  const latestAttempt = attempts[attempts.length - 1]
  const latestFailure = [...attempts].reverse().find(attempt => attempt.ok === false) ?? null
  const spacing = deriveSpacing(attempts)
  const intervalDays = spacing.spacingLevel === null
    ? null
    : WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS[spacing.spacingLevel]

  if (latestAttempt && latestAttempt.ok === false) {
    return {
      introduced: true,
      due: true,
      reason: 'latest-failure',
      priorityTier: 1,
      latestAttemptAt: latestAttempt.at,
      latestFailureAt: latestFailure?.at ?? latestAttempt.at,
      qualifyingRecallDates: spacing.qualifyingRecallDates,
      difficulty: spacing.difficulty,
      spacingLevel: spacing.spacingLevel,
      intervalDays,
      nextDueAt: now,
      nextDueDate: currentLocalDate,
      overdueDays: 0,
    }
  }

  const qualifyingRecallDates = spacing.qualifyingRecallDates
  if (qualifyingRecallDates.length === 0) {
    return {
      introduced: true,
      due: true,
      reason: 'missing-recall-success',
      priorityTier: 2,
      latestAttemptAt: latestAttempt?.at ?? null,
      latestFailureAt: latestFailure?.at ?? null,
      qualifyingRecallDates,
      difficulty: spacing.difficulty,
      spacingLevel: spacing.spacingLevel,
      intervalDays: null,
      nextDueAt: now,
      nextDueDate: currentLocalDate,
      overdueDays: 0,
    }
  }

  const lastRecallDate = qualifyingRecallDates[qualifyingRecallDates.length - 1]!
  const spacingLevel = spacing.spacingLevel ?? 0
  const establishedIntervalDays = WORLD_COUNTRIES_REVIEW_INTERVAL_DAYS[spacingLevel]
  const nextDueDate = addWorldCountriesCalendarDays(lastRecallDate, establishedIntervalDays)
  const due = nextDueDate <= currentLocalDate
  return {
    introduced: true,
    due,
    reason: due ? 'scheduled' : 'not-due',
    priorityTier: due ? 3 : null,
    latestAttemptAt: latestAttempt?.at ?? null,
    latestFailureAt: latestFailure?.at ?? null,
    qualifyingRecallDates,
    difficulty: spacing.difficulty,
    spacingLevel,
    intervalDays: establishedIntervalDays,
    nextDueAt: timestampForLocalDate(nextDueDate),
    nextDueDate,
    overdueDays: due ? daysBetween(currentLocalDate, nextDueDate) : 0,
  }
}
