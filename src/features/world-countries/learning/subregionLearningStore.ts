import { readJSON, safeSet } from '@/core/storage'
import { getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'

export const SUBREGION_LEARNING_STORAGE_KEY = 'world-countries-subregion-learning'
export const SUBREGION_LEARNING_MEMBERSHIP_KEY = 'world-countries-subregion-learning-membership'

type CompletionField = 'countriesLearnedAt' | 'capitalsLearnedAt'

function readStoredStates(): SubregionLearningState[] {
  const raw = readJSON<unknown>(SUBREGION_LEARNING_STORAGE_KEY, [])
  if (!Array.isArray(raw)) return []
  const seen = new Set<SubregionId>()
  const states: SubregionLearningState[] = []
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    if (typeof row.subregionId !== 'string' || !isSubregionId(row.subregionId)) continue
    if (seen.has(row.subregionId)) continue
    if (row.countriesLearnedAt !== undefined
      && (typeof row.countriesLearnedAt !== 'number' || !Number.isFinite(row.countriesLearnedAt))) continue
    if (row.capitalsLearnedAt !== undefined
      && (typeof row.capitalsLearnedAt !== 'number' || !Number.isFinite(row.capitalsLearnedAt))) continue
    if (row.countriesLearnedAt === undefined && row.capitalsLearnedAt === undefined) continue
    seen.add(row.subregionId)
    states.push({
      subregionId: row.subregionId,
      ...(row.countriesLearnedAt === undefined ? {} : { countriesLearnedAt: row.countriesLearnedAt }),
      ...(row.capitalsLearnedAt === undefined ? {} : { capitalsLearnedAt: row.capitalsLearnedAt }),
    })
  }
  return states
}

function readMembershipFingerprints(): Record<string, string> {
  const raw = readJSON<unknown>(SUBREGION_LEARNING_MEMBERSHIP_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw).filter(([subregionId, fingerprint]) => isSubregionId(subregionId) && typeof fingerprint === 'string'),
  )
}

function writeMembershipFingerprints(fingerprints: Record<string, string>): void {
  safeSet(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify(fingerprints))
}

function writeStates(states: readonly SubregionLearningState[]): void {
  safeSet(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify(states))
}

/**
 * Completion is about the current canonical Country set, not a historical
 * order. Unknown fingerprints conservatively invalidate legacy completion
 * rows, while user-authored order changes leave them untouched.
 */
function currentMembershipFingerprint(subregionId: SubregionId): string {
  return getCanonicalCountryIdsForSubregion(subregionId)
    .sort()
    .join('|')
}

function readCurrentStates(): SubregionLearningState[] {
  const states = readStoredStates()
  const fingerprints = readMembershipFingerprints()
  const valid = states.filter(state => fingerprints[state.subregionId] === currentMembershipFingerprint(state.subregionId))
  if (valid.length !== states.length) {
    const validIds = new Set(valid.map(state => state.subregionId))
    writeStates(valid)
    writeMembershipFingerprints(Object.fromEntries(
      Object.entries(fingerprints).filter(([subregionId]) => validIds.has(subregionId as SubregionId)),
    ))
  }
  return valid
}

function updateCompletion(
  subregionId: SubregionId,
  field: CompletionField,
  learnedAt: number | undefined,
): SubregionLearningState | null {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  if (learnedAt !== undefined && !Number.isFinite(learnedAt)) throw new Error(`${field} must be finite`)

  const states = readCurrentStates()
  const current = states.find(candidate => candidate.subregionId === subregionId)
  const updatedState: SubregionLearningState | null = current
    ? { ...current, ...(learnedAt === undefined ? {} : { [field]: learnedAt }) }
    : learnedAt === undefined
      ? null
      : { subregionId, [field]: learnedAt }

  if (updatedState && learnedAt === undefined) delete updatedState[field]
  const nextState = updatedState && (updatedState.countriesLearnedAt !== undefined || updatedState.capitalsLearnedAt !== undefined)
    ? updatedState
    : null

  const nextStates = states.filter(candidate => candidate.subregionId !== subregionId)
  if (nextState) nextStates.push(nextState)
  writeStates(nextStates)

  const fingerprints = readMembershipFingerprints()
  if (nextState) fingerprints[subregionId] = currentMembershipFingerprint(subregionId)
  else delete fingerprints[subregionId]
  writeMembershipFingerprints(fingerprints)
  return nextState ? { ...nextState } : null
}

export function getAllSubregionLearningStates(): SubregionLearningState[] {
  return readCurrentStates().map(state => ({ ...state }))
}

export function getSubregionLearningState(subregionId: SubregionId): SubregionLearningState | null {
  const state = readCurrentStates().find(candidate => candidate.subregionId === subregionId)
  return state ? { ...state } : null
}

export function markSubregionCountriesLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
): SubregionLearningState {
  return updateCompletion(subregionId, 'countriesLearnedAt', learnedAt)!
}

export function clearSubregionCountriesLearned(subregionId: SubregionId): void {
  updateCompletion(subregionId, 'countriesLearnedAt', undefined)
}

export function markSubregionCapitalsLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
): SubregionLearningState {
  return updateCompletion(subregionId, 'capitalsLearnedAt', learnedAt)!
}

export function clearSubregionCapitalsLearned(subregionId: SubregionId): void {
  updateCompletion(subregionId, 'capitalsLearnedAt', undefined)
}
