import {
  deriveItemProgress,
  recordAttempt,
  type Attempt,
  type ItemProgress,
  type MasteryPolicy,
  defaultMasteryPolicy,
} from '@/core/learning'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  recallTargetIdFor,
  type WorldCountriesRecallSkill,
} from './recallTargets'

export interface WorldCountriesAttempt extends Attempt {
  itemId: string
}

export type RecallProgress = ReadonlyMap<string, ItemProgress>

function progressFor(
  progress: RecallProgress,
  itemId: string,
  policy: MasteryPolicy = defaultMasteryPolicy,
): ItemProgress {
  return progress.get(itemId) ?? deriveItemProgress(itemId, [], policy)
}

export interface RecallProgressConfig {
  countryIds: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
  policy?: MasteryPolicy
}

/** Derive requested World Countries progress from domain-neutral attempts. */
export function deriveWorldCountriesRecallProgress(
  config: RecallProgressConfig,
  attempts: readonly WorldCountriesAttempt[],
): Map<string, ItemProgress> {
  const policy = config.policy ?? defaultMasteryPolicy
  const result = new Map<string, ItemProgress>()
  for (const countryId of [...new Set(config.countryIds)]) {
    for (const skill of [...new Set(config.skills)]) {
      const itemId = recallTargetIdFor(countryId, skill)
      result.set(itemId, deriveItemProgress(
        itemId,
        attempts.filter(attempt => attempt.itemId === itemId),
        policy,
      ))
    }
  }
  return result
}

/** Record one atomic Country + skill attempt in the shared evidence store. */
export function recordWorldCountriesAttempt(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
  attempt: Attempt,
): Promise<void> {
  return recordAttempt(recallTargetIdFor(countryId, skill), attempt)
}

export interface WorldCountriesCountryProgress {
  countryId: CountryId
  skills: ReadonlyMap<WorldCountriesRecallSkill, ItemProgress>
  attempts: number
  masteredSkills: number
  masteryRatio: number
  mastered: boolean
}

/** Aggregate relevant atomic skill progress for a visible Country unit. */
export function deriveCountryRecallProgress(
  countryId: CountryId,
  skills: readonly WorldCountriesRecallSkill[],
  progress: RecallProgress,
  policy: MasteryPolicy = defaultMasteryPolicy,
): WorldCountriesCountryProgress {
  const skillProgress = new Map<WorldCountriesRecallSkill, ItemProgress>()
  for (const skill of [...new Set(skills)]) {
    const itemId = recallTargetIdFor(countryId, skill)
    skillProgress.set(skill, progressFor(progress, itemId, policy))
  }
  const values = [...skillProgress.values()]
  const masteredSkills = values.filter(item => item.mastered).length
  return {
    countryId,
    skills: skillProgress,
    attempts: values.reduce((total, item) => total + item.attempts, 0),
    masteredSkills,
    masteryRatio: values.length ? masteredSkills / values.length : 0,
    mastered: values.length > 0 && masteredSkills === values.length,
  }
}
