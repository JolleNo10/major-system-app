import { readJSON, safeSet } from '@/core/storage'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'

export const SUBREGION_LEARNING_STORAGE_KEY = 'world-countries-subregion-learning'

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
    seen.add(row.subregionId)
    states.push({
      subregionId: row.subregionId,
      ...(row.countriesLearnedAt === undefined ? {} : { countriesLearnedAt: row.countriesLearnedAt }),
    })
  }
  return states
}

function writeStates(states: readonly SubregionLearningState[]): void {
  safeSet(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify(states))
}

export function getAllSubregionLearningStates(): SubregionLearningState[] {
  return readStoredStates().map(state => ({ ...state }))
}

export function getSubregionLearningState(subregionId: SubregionId): SubregionLearningState | null {
  const state = readStoredStates().find(candidate => candidate.subregionId === subregionId)
  return state ? { ...state } : null
}

export function markSubregionCountriesLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
): SubregionLearningState {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  if (!Number.isFinite(learnedAt)) throw new Error('countriesLearnedAt must be finite')
  const state: SubregionLearningState = { subregionId, countriesLearnedAt: learnedAt }
  const states = readStoredStates().filter(candidate => candidate.subregionId !== subregionId)
  states.push(state)
  writeStates(states)
  return { ...state }
}

export function clearSubregionCountriesLearned(subregionId: SubregionId): void {
  writeStates(readStoredStates().filter(candidate => candidate.subregionId !== subregionId))
}
