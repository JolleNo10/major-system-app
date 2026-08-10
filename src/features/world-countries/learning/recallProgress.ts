import type {
  Attempt,
  AttemptEvidenceKind,
} from '@/core/learning'
import { getAllAttempts, recordAttempt } from '@/core/learning'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  WORLD_COUNTRIES_ADDITIONAL_RECALL_SKILLS,
  WORLD_COUNTRIES_CORE_RECALL_SKILLS,
  WORLD_COUNTRIES_RECALL_SKILLS,
  recallTargetIdFor,
  type WorldCountriesAdditionalRecallSkill,
  type WorldCountriesCoreRecallSkill,
  type WorldCountriesRecallSkill,
} from './recallTargets'
import {
  deriveWorldCountriesAtomicProgress,
  type WorldCountriesAtomicProgress,
  type WorldCountriesProficiency,
} from './recallMastery'

export interface WorldCountriesAttempt extends Attempt {
  itemId: string
}

export type RecallProgress = ReadonlyMap<string, WorldCountriesAtomicProgress>

export interface RecallProgressConfig {
  countryIds: readonly CountryId[]
  skills: readonly WorldCountriesRecallSkill[]
}

/** Derive requested World Countries progress from raw atomic attempts. */
export function deriveWorldCountriesRecallProgress(
  config: RecallProgressConfig,
  attempts: readonly WorldCountriesAttempt[],
): Map<string, WorldCountriesAtomicProgress> {
  const result = new Map<string, WorldCountriesAtomicProgress>()
  for (const countryId of [...new Set(config.countryIds)]) {
    for (const skill of [...new Set(config.skills)]) {
      const itemId = recallTargetIdFor(countryId, skill)
      result.set(itemId, deriveWorldCountriesAtomicProgress(
        itemId,
        attempts
          .filter(attempt => attempt.itemId === itemId)
          .map(({ itemId: _itemId, ...attempt }) => attempt),
      ))
    }
  }
  return result
}

/** Load the retained shared evidence needed for a World Countries view. */
export async function loadWorldCountriesRecallProgress(
  config: RecallProgressConfig,
): Promise<Map<string, WorldCountriesAtomicProgress>> {
  const itemIds = new Set(
    [...new Set(config.countryIds)].flatMap(countryId => (
      [...new Set(config.skills)].map(skill => recallTargetIdFor(countryId, skill))
    )),
  )
  const attempts = await getAllAttempts()
  return deriveWorldCountriesRecallProgress(config, attempts
    .filter(attempt => itemIds.has(attempt.itemId))
    .map(attempt => ({ ...attempt, itemId: attempt.itemId })))
}

function localDateForTimestamp(at: number): string {
  const date = new Date(at)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface RecordWorldCountriesAttempt extends Attempt {
  /** New callers should provide this; omitted values default to free recall. */
  evidenceKind?: AttemptEvidenceKind
  /** Filled from `at` when omitted, using the current local timezone. */
  localDate?: string
}

/**
 * Record one atomic Country + skill attempt. Metadata is captured before the
 * shared adapter is called so later timezone changes cannot reclassify it.
 */
export function recordWorldCountriesAttempt(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
  attempt: RecordWorldCountriesAttempt,
): Promise<void> {
  return recordAttempt(
    recallTargetIdFor(countryId, skill),
    {
      ...attempt,
      evidenceKind: attempt.evidenceKind ?? 'recall',
      localDate: attempt.localDate ?? localDateForTimestamp(attempt.at),
    },
    { pruneHistory: false },
  )
}

export type WorldCountriesCountryCoreState =
  | 'unpractised'
  | 'weak'
  | 'developing'
  | 'strong'
  | 'complete'

export interface WorldCountriesCountryProgress {
  countryId: CountryId
  skills: ReadonlyMap<WorldCountriesRecallSkill, WorldCountriesAtomicProgress>
  coreSkills: ReadonlyMap<WorldCountriesCoreRecallSkill, WorldCountriesAtomicProgress>
  additionalSkills: ReadonlyMap<WorldCountriesAdditionalRecallSkill, WorldCountriesAtomicProgress>

  attempts: number
  coreMasteredSkills: number
  coreSkillCount: number
  coreMasteryRatio: number
  coreState: WorldCountriesCountryCoreState
  complete: boolean

  additionalMasteredSkills: number
  additionalSkillCount: number
  additionalMasteryRatio: number
  additionalMastered: boolean
}

function uniqueSkills(skills: readonly WorldCountriesRecallSkill[]): WorldCountriesRecallSkill[] {
  return [...new Set(skills)]
}

function progressFor(
  countryId: CountryId,
  skill: WorldCountriesRecallSkill,
  progress: RecallProgress,
): WorldCountriesAtomicProgress {
  const itemId = recallTargetIdFor(countryId, skill)
  return progress.get(itemId) ?? deriveWorldCountriesAtomicProgress(itemId, [])
}

function deriveCoreState(
  coreSkills: readonly WorldCountriesAtomicProgress[],
): WorldCountriesCountryCoreState {
  if (coreSkills.length === 0 || coreSkills.every(skill => skill.proficiency === 'unpractised')) {
    return 'unpractised'
  }
  if (coreSkills.some(skill => skill.proficiency === 'weak')) return 'weak'
  if (coreSkills.every(skill => skill.proficiency === 'mastered')) return 'complete'
  if (coreSkills.every(skill => skill.proficiency === 'strong' || skill.proficiency === 'mastered')) {
    return 'strong'
  }
  return 'developing'
}

/**
 * Aggregate one Country. Core completeness always evaluates the canonical
 * core skill set; additional skills are reported independently.
 */
export function deriveCountryRecallProgress(
  countryId: CountryId,
  skills: readonly WorldCountriesRecallSkill[],
  progress: RecallProgress,
): WorldCountriesCountryProgress {
  const requestedSkills = uniqueSkills([
    ...WORLD_COUNTRIES_CORE_RECALL_SKILLS,
    ...skills.filter(skill => (WORLD_COUNTRIES_ADDITIONAL_RECALL_SKILLS as readonly string[]).includes(skill)),
  ])
  const skillProgress = new Map<WorldCountriesRecallSkill, WorldCountriesAtomicProgress>(
    requestedSkills.map(skill => [skill, progressFor(countryId, skill, progress)]),
  )
  const coreSkills = new Map<WorldCountriesCoreRecallSkill, WorldCountriesAtomicProgress>(
    WORLD_COUNTRIES_CORE_RECALL_SKILLS.map(skill => [skill, skillProgress.get(skill)!]),
  )
  const additionalSkills = new Map<WorldCountriesAdditionalRecallSkill, WorldCountriesAtomicProgress>(
    WORLD_COUNTRIES_ADDITIONAL_RECALL_SKILLS
      .filter(skill => skills.includes(skill))
      .map(skill => [skill, skillProgress.get(skill)!]),
  )
  const coreValues = [...coreSkills.values()]
  const additionalValues = [...additionalSkills.values()]
  const coreMasteredSkills = coreValues.filter(skill => skill.mastered).length
  const additionalMasteredSkills = additionalValues.filter(skill => skill.mastered).length
  const coreState = deriveCoreState(coreValues)
  const complete = coreState === 'complete'

  return {
    countryId,
    skills: skillProgress,
    coreSkills,
    additionalSkills,
    attempts: [...skillProgress.values()].reduce((total, skill) => total + skill.attempts, 0),
    coreMasteredSkills,
    coreSkillCount: coreValues.length,
    coreMasteryRatio: coreValues.length ? coreMasteredSkills / coreValues.length : 0,
    coreState,
    complete,
    additionalMasteredSkills,
    additionalSkillCount: additionalValues.length,
    additionalMasteryRatio: additionalValues.length ? additionalMasteredSkills / additionalValues.length : 0,
    additionalMastered: additionalValues.length > 0 && additionalMasteredSkills === additionalValues.length,
  }
}

/** Aggregate all currently defined atomic skills for one Country. */
export function deriveWorldCountriesCountryProgress(
  countryId: CountryId,
  progress: RecallProgress,
): WorldCountriesCountryProgress {
  return deriveCountryRecallProgress(countryId, WORLD_COUNTRIES_RECALL_SKILLS, progress)
}

export type { WorldCountriesAtomicProgress, WorldCountriesProficiency }
