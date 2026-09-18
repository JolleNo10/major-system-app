import type { Attempt } from '@/core/learning'
import { countries as canonicalCountries, type Country, type CountryId } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS } from './finalRecallEvidence'
import { loadWorldCountriesRecallHistory } from './recallHistory'
import { recordWorldCountriesAttempt } from './recallProgress'
import { recallTargetIdFor } from './recallTargets'
import { isValidWorldCountriesLocalDate, worldCountriesLocalDateForTimestamp } from './reviewSchedule'
import { getAllSubregionLearningStates } from './subregionLearningStore'

/**
 * One-time recovery for Capital evidence that predates Final recall writing it.
 *
 * `capitalsLearnedAt` is only written by a completed whole-Subregion Final
 * recall or by the confirmed `Skip as completed` assertion, and both now write
 * one successful recall per Country. This reconstructs the same rows for
 * milestones recorded before that, so the reconstruction is bounded by a
 * durable fact rather than invented.
 */

const BACKFILL_SKILL = 'country-to-capital' as const

export type WorldCountriesCapitalBackfillAction = 'write' | 'already-recorded'

export interface WorldCountriesCapitalBackfillEntry {
  subregionId: SubregionId
  subregionLabel: string
  countryId: CountryId
  country: string
  learnedAt: number
  localDate: string
  action: WorldCountriesCapitalBackfillAction
}

export interface WorldCountriesCapitalBackfillPlan {
  entries: readonly WorldCountriesCapitalBackfillEntry[]
  /** Rows the apply step would add. */
  pending: readonly WorldCountriesCapitalBackfillEntry[]
  subregionLabels: readonly string[]
  skippedSubregionLabels: readonly string[]
}

export interface WorldCountriesCapitalBackfillOptions {
  /** Defaults to the canonical Country population. */
  activeCountries?: readonly Country[]
}

function hasQualifyingRecallOn(attempts: readonly Attempt[], localDate: string): boolean {
  return attempts.some(attempt => (
    attempt.ok && attempt.evidenceKind === 'recall' && attempt.localDate === localDate
  ))
}

/**
 * Describe what the backfill would write without touching stored evidence.
 * Idempotent by local date: a Country that already has a qualifying recall on
 * the milestone's date is reported as `already-recorded`.
 */
export async function planWorldCountriesCapitalBackfill(
  options: WorldCountriesCapitalBackfillOptions = {},
): Promise<WorldCountriesCapitalBackfillPlan> {
  const activeCountries = options.activeCountries ?? canonicalCountries
  const states = getAllSubregionLearningStates(activeCountries)
  const entries: WorldCountriesCapitalBackfillEntry[] = []
  const skippedSubregionLabels: string[] = []

  const learnedSubregions = states.flatMap(state => {
    const learnedAt = state.capitalsLearnedAt
    if (typeof learnedAt !== 'number' || !Number.isFinite(learnedAt)) return []
    const localDate = worldCountriesLocalDateForTimestamp(learnedAt)
    if (!isValidWorldCountriesLocalDate(localDate)) return []
    return [{ subregionId: state.subregionId, learnedAt, localDate }]
  })

  const history = await loadWorldCountriesRecallHistory({
    countryIds: activeCountries.map(country => country.id),
    skills: [BACKFILL_SKILL],
  })

  for (const { subregionId, learnedAt, localDate } of learnedSubregions) {
    const subregionLabel = getSubregionDefinition(subregionId).label
    const subregionCountries = activeCountries.filter(country => country.subregionId === subregionId)
    if (subregionCountries.length === 0) {
      skippedSubregionLabels.push(subregionLabel)
      continue
    }
    for (const country of subregionCountries) {
      const attempts = history.get(recallTargetIdFor(country.id, BACKFILL_SKILL)) ?? []
      entries.push({
        subregionId,
        subregionLabel,
        countryId: country.id,
        country: country.country,
        learnedAt,
        localDate,
        action: hasQualifyingRecallOn(attempts, localDate) ? 'already-recorded' : 'write',
      })
    }
  }

  const pending = entries.filter(entry => entry.action === 'write')
  return {
    entries,
    pending,
    subregionLabels: [...new Set(entries.map(entry => entry.subregionLabel))],
    skippedSubregionLabels,
  }
}

export interface WorldCountriesCapitalBackfillResult {
  written: number
  alreadyRecorded: number
  subregionLabels: readonly string[]
}

/** Write the reconstruction described by `planWorldCountriesCapitalBackfill`. */
export async function applyWorldCountriesCapitalBackfill(
  options: WorldCountriesCapitalBackfillOptions = {},
): Promise<WorldCountriesCapitalBackfillResult> {
  const plan = await planWorldCountriesCapitalBackfill(options)

  for (const entry of plan.pending) {
    await recordWorldCountriesAttempt(entry.countryId, BACKFILL_SKILL, {
      at: entry.learnedAt,
      ok: true,
      ms: WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS,
      evidenceKind: 'recall',
      localDate: entry.localDate,
      attemptType: 'learning',
    })
  }

  return {
    written: plan.pending.length,
    alreadyRecorded: plan.entries.length - plan.pending.length,
    subregionLabels: [...new Set(plan.pending.map(entry => entry.subregionLabel))],
  }
}
