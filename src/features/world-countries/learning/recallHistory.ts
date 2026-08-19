import { getAllAttemptsOrThrow } from '@/core/learning'
import type { Attempt } from '@/core/learning'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  recallTargetIdFor,
  type WorldCountriesRecallSkill,
} from './recallTargets'

export interface WorldCountriesRecallHistoryAttempt extends Attempt {
  itemId: string
}

export type WorldCountriesRecallHistory = ReadonlyMap<
  string,
  readonly WorldCountriesRecallHistoryAttempt[]
>

export interface RecallHistoryConfig {
  countryIds: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
}

function requestedItemIds(config: RecallHistoryConfig): Set<string> {
  return new Set(
    [...new Set(config.countryIds)].flatMap(countryId => (
      [...new Set(config.skills)].map(skill => recallTargetIdFor(countryId, skill))
    )),
  )
}

/** Build deterministic per-target history from retained opaque evidence. */
export function deriveWorldCountriesRecallHistory(
  config: RecallHistoryConfig,
  attempts: readonly WorldCountriesRecallHistoryAttempt[],
): WorldCountriesRecallHistory {
  const itemIds = requestedItemIds(config)
  const grouped = new Map<string, Array<{ attempt: WorldCountriesRecallHistoryAttempt; index: number }>>()

  attempts.forEach((attempt, index) => {
    if (!itemIds.has(attempt.itemId)) return
    const values = grouped.get(attempt.itemId) ?? []
    values.push({ attempt: { ...attempt }, index })
    grouped.set(attempt.itemId, values)
  })

  return new Map([...itemIds].map(itemId => [
    itemId,
    (grouped.get(itemId) ?? [])
      .sort((left, right) => left.attempt.at - right.attempt.at || left.index - right.index)
      .map(({ attempt }) => attempt),
  ] as const))
}

/** Load raw evidence for the requested active Country targets only. */
export async function loadWorldCountriesRecallHistory(
  config: RecallHistoryConfig,
): Promise<WorldCountriesRecallHistory> {
  const attempts = await getAllAttemptsOrThrow()
  return deriveWorldCountriesRecallHistory(config, attempts)
}

export function flattenWorldCountriesRecallHistory(
  history: WorldCountriesRecallHistory,
): WorldCountriesRecallHistoryAttempt[] {
  return [...history.values()].flatMap(attempts => attempts.map(attempt => ({ ...attempt })))
}
