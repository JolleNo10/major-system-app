import type { CountryId } from '@/features/world-countries/data/countries'
import { recordWorldCountriesAttempt } from './recallProgress'
import type { WorldCountriesCoreRecallSkill } from './recallTargets'

/**
 * An asserted pass has no measured answer time. Both median-latency consumers
 * skip non-finite values, so this keeps the reconstruction out of speed
 * statistics instead of inventing a plausible-looking latency.
 */
export const WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS = Number.NaN

/** Record one answered whole-scope Final recall prompt. */
export function recordWorldCountriesFinalRecallAnswer(
  countryId: CountryId,
  skill: WorldCountriesCoreRecallSkill,
  correct: boolean,
  latencyMs: number,
  at = Date.now(),
): Promise<void> {
  return recordWorldCountriesAttempt(countryId, skill, {
    at,
    ok: correct,
    ms: latencyMs,
    evidenceKind: 'recall',
  })
}

/**
 * Record the evidence a completed whole-scope Final recall pass implies: one
 * successful free recall per Country, because the ordered session only
 * completes on a clean pass over every Country in the scope.
 */
export function recordWorldCountriesFinalRecallPass(
  countryIds: readonly CountryId[],
  skill: WorldCountriesCoreRecallSkill,
  at = Date.now(),
): Promise<void> {
  return Promise.all([...new Set(countryIds)].map(countryId => recordWorldCountriesAttempt(
    countryId,
    skill,
    { at, ok: true, ms: WORLD_COUNTRIES_UNTIMED_ATTEMPT_MS, evidenceKind: 'recall' },
  ))).then(() => undefined)
}
