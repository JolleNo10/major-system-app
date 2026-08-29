import { readJSON, safeSet } from '@/core/storage'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import {
  activeMembershipFingerprint,
  parseMembershipRecords,
  parseStoredStates,
  reconcileSubregionLearningMembership,
  updateMembershipRecords,
  type CompletionField,
  type PersistedMembership,
} from './subregionLearningPersistence'

export const SUBREGION_LEARNING_STORAGE_KEY = 'world-countries-subregion-learning'
export const SUBREGION_LEARNING_MEMBERSHIP_KEY = 'world-countries-subregion-learning-membership'

function readStoredStates(): SubregionLearningState[] {
  return parseStoredStates(readJSON<unknown>(SUBREGION_LEARNING_STORAGE_KEY, []))
}

function readMembershipRecords(): Record<string, PersistedMembership> {
  return parseMembershipRecords(readJSON<unknown>(SUBREGION_LEARNING_MEMBERSHIP_KEY, {}))
}

function writeMembershipRecords(records: Record<string, PersistedMembership>): void {
  safeSet(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify(records))
}

function writeStates(states: readonly SubregionLearningState[]): void {
  safeSet(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify(states))
}

/**
 * Read completion for the active Country membership while retaining facts for
 * other memberships in the existing learning storage keys.
 */
function readActiveStates(activeCountries: readonly Country[] = countries): SubregionLearningState[] {
  const states = readStoredStates()
  const records = readMembershipRecords()
  const reconciled = reconcileSubregionLearningMembership(states, records, activeCountries)

  if (reconciled.statesChanged) writeStates(reconciled.states)
  if (reconciled.recordsChanged) writeMembershipRecords(reconciled.records)
  return reconciled.states
}

function updateCompletion(
  subregionId: SubregionId,
  field: CompletionField,
  learnedAt: number | undefined,
  activeCountries: readonly Country[] = countries,
): SubregionLearningState | null {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  if (learnedAt !== undefined && !Number.isFinite(learnedAt)) throw new Error(`${field} must be finite`)

  const states = readActiveStates(activeCountries)
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

  const records = readMembershipRecords()
  const fingerprint = activeMembershipFingerprint(subregionId, activeCountries)
  writeMembershipRecords(updateMembershipRecords(records, subregionId, fingerprint, nextState))
  return nextState ? { ...nextState } : null
}

export function getAllSubregionLearningStates(
  activeCountries: readonly Country[] = countries,
): SubregionLearningState[] {
  return readActiveStates(activeCountries).map(state => ({ ...state }))
}

export function getSubregionLearningState(
  subregionId: SubregionId,
  activeCountries: readonly Country[] = countries,
): SubregionLearningState | null {
  const state = readActiveStates(activeCountries).find(candidate => candidate.subregionId === subregionId)
  return state ? { ...state } : null
}

export function markSubregionCountriesLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
  activeCountries: readonly Country[] = countries,
): SubregionLearningState {
  return updateCompletion(subregionId, 'countriesLearnedAt', learnedAt, activeCountries)!
}

export function clearSubregionCountriesLearned(
  subregionId: SubregionId,
  activeCountries: readonly Country[] = countries,
): void {
  updateCompletion(subregionId, 'countriesLearnedAt', undefined, activeCountries)
}

export function markSubregionCapitalsLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
  activeCountries: readonly Country[] = countries,
): SubregionLearningState {
  return updateCompletion(subregionId, 'capitalsLearnedAt', learnedAt, activeCountries)!
}

export function clearSubregionCapitalsLearned(
  subregionId: SubregionId,
  activeCountries: readonly Country[] = countries,
): void {
  updateCompletion(subregionId, 'capitalsLearnedAt', undefined, activeCountries)
}
