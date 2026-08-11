import { readJSON, safeSet } from '@/core/storage'
import { countries, type Country } from '@/features/world-countries/data/countries'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'

export const SUBREGION_LEARNING_STORAGE_KEY = 'world-countries-subregion-learning'
export const SUBREGION_LEARNING_MEMBERSHIP_KEY = 'world-countries-subregion-learning-membership'

type CompletionField = 'countriesLearnedAt' | 'capitalsLearnedAt'
type CompletionSnapshot = Partial<Record<CompletionField, number>>
interface MembershipRecord {
  current: string
  history: Record<string, CompletionSnapshot>
}
type PersistedMembership = string | MembershipRecord

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

function readMembershipRecords(): Record<string, PersistedMembership> {
  const raw = readJSON<unknown>(SUBREGION_LEARNING_MEMBERSHIP_KEY, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const records: Record<string, PersistedMembership> = {}
  for (const [subregionId, value] of Object.entries(raw)) {
    if (!isSubregionId(subregionId)) continue
    if (typeof value === 'string') {
      records[subregionId] = value
      continue
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    if (typeof row.current !== 'string' || !row.current) continue
    const history: Record<string, CompletionSnapshot> = {}
    if (row.history && typeof row.history === 'object' && !Array.isArray(row.history)) {
      for (const [fingerprint, snapshot] of Object.entries(row.history)) {
        if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) continue
        const candidate = snapshot as Record<string, unknown>
        const normalized: CompletionSnapshot = {}
        if (typeof candidate.countriesLearnedAt === 'number' && Number.isFinite(candidate.countriesLearnedAt)) {
          normalized.countriesLearnedAt = candidate.countriesLearnedAt
        }
        if (typeof candidate.capitalsLearnedAt === 'number' && Number.isFinite(candidate.capitalsLearnedAt)) {
          normalized.capitalsLearnedAt = candidate.capitalsLearnedAt
        }
        if (Object.keys(normalized).length > 0) history[fingerprint] = normalized
      }
    }
    records[subregionId] = { current: row.current, history }
  }
  return records
}

function writeMembershipRecords(records: Record<string, PersistedMembership>): void {
  safeSet(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify(records))
}

function writeStates(states: readonly SubregionLearningState[]): void {
  safeSet(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify(states))
}

function currentMembershipFingerprint(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
): string {
  return currentCountries
    .filter(country => country.subregionId === subregionId)
    .map(country => country.id)
    .sort()
    .join('|')
}

function snapshotOf(state: SubregionLearningState): CompletionSnapshot {
  return {
    ...(state.countriesLearnedAt === undefined ? {} : { countriesLearnedAt: state.countriesLearnedAt }),
    ...(state.capitalsLearnedAt === undefined ? {} : { capitalsLearnedAt: state.capitalsLearnedAt }),
  }
}

function stateFromSnapshot(subregionId: SubregionId, snapshot: CompletionSnapshot): SubregionLearningState {
  return {
    subregionId,
    ...(snapshot.countriesLearnedAt === undefined ? {} : { countriesLearnedAt: snapshot.countriesLearnedAt }),
    ...(snapshot.capitalsLearnedAt === undefined ? {} : { capitalsLearnedAt: snapshot.capitalsLearnedAt }),
  }
}

function asMembershipRecord(value: PersistedMembership | undefined): MembershipRecord | null {
  if (!value) return null
  if (typeof value === 'string') return { current: value, history: {} }
  return { current: value.current, history: { ...value.history } }
}

function compactMembershipRecord(record: MembershipRecord): PersistedMembership {
  return Object.keys(record.history).length > 0 ? record : record.current
}

/**
 * Read completion for the active Country membership while retaining facts for
 * other memberships in the existing learning storage keys.
 */
function readCurrentStates(currentCountries: readonly Country[] = countries): SubregionLearningState[] {
  const states = readStoredStates()
  const records = readMembershipRecords()
  const nextStates: SubregionLearningState[] = []
  let statesChanged = false
  let recordsChanged = false

  for (const state of states) {
    const currentFingerprint = currentMembershipFingerprint(state.subregionId, currentCountries)
    const stored = asMembershipRecord(records[state.subregionId])
    if (!stored) {
      statesChanged = true
      continue
    }
    if (stored.current === currentFingerprint) {
      nextStates.push(state)
      continue
    }

    stored.history[stored.current] = snapshotOf(state)
    const historical = stored.history[currentFingerprint]
    if (historical) {
      nextStates.push(stateFromSnapshot(state.subregionId, historical))
      delete stored.history[currentFingerprint]
      stored.current = currentFingerprint
    }
    records[state.subregionId] = compactMembershipRecord(stored)
    statesChanged = true
    recordsChanged = true
  }

  for (const [subregionId, value] of Object.entries(records)) {
    if (!isSubregionId(subregionId)) continue
    if (nextStates.some(state => state.subregionId === subregionId)) continue
    const currentFingerprint = currentMembershipFingerprint(subregionId, currentCountries)
    const stored = asMembershipRecord(value)
    const historical = stored?.history[currentFingerprint]
    if (!stored || !historical) continue
    nextStates.push(stateFromSnapshot(subregionId, historical))
    delete stored.history[currentFingerprint]
    stored.current = currentFingerprint
    records[subregionId] = compactMembershipRecord(stored)
    statesChanged = true
    recordsChanged = true
  }

  if (statesChanged || nextStates.length !== states.length) writeStates(nextStates)
  if (recordsChanged) writeMembershipRecords(records)
  return nextStates
}

function updateCompletion(
  subregionId: SubregionId,
  field: CompletionField,
  learnedAt: number | undefined,
  currentCountries: readonly Country[] = countries,
): SubregionLearningState | null {
  if (!isSubregionId(subregionId)) throw new Error(`Unknown Subregion ID: ${subregionId}`)
  if (learnedAt !== undefined && !Number.isFinite(learnedAt)) throw new Error(`${field} must be finite`)

  const states = readCurrentStates(currentCountries)
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
  const fingerprint = currentMembershipFingerprint(subregionId, currentCountries)
  const record = asMembershipRecord(records[subregionId]) ?? { current: fingerprint, history: {} }
  record.current = fingerprint
  if (nextState) {
    delete record.history[fingerprint]
    records[subregionId] = compactMembershipRecord(record)
  } else {
    delete record.history[fingerprint]
    if (Object.keys(record.history).length > 0) records[subregionId] = record
    else delete records[subregionId]
  }
  writeMembershipRecords(records)
  return nextState ? { ...nextState } : null
}

export function getAllSubregionLearningStates(
  currentCountries: readonly Country[] = countries,
): SubregionLearningState[] {
  return readCurrentStates(currentCountries).map(state => ({ ...state }))
}

export function getSubregionLearningState(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
): SubregionLearningState | null {
  const state = readCurrentStates(currentCountries).find(candidate => candidate.subregionId === subregionId)
  return state ? { ...state } : null
}

export function markSubregionCountriesLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
  currentCountries: readonly Country[] = countries,
): SubregionLearningState {
  return updateCompletion(subregionId, 'countriesLearnedAt', learnedAt, currentCountries)!
}

export function clearSubregionCountriesLearned(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
): void {
  updateCompletion(subregionId, 'countriesLearnedAt', undefined, currentCountries)
}

export function markSubregionCapitalsLearned(
  subregionId: SubregionId,
  learnedAt = Date.now(),
  currentCountries: readonly Country[] = countries,
): SubregionLearningState {
  return updateCompletion(subregionId, 'capitalsLearnedAt', learnedAt, currentCountries)!
}

export function clearSubregionCapitalsLearned(
  subregionId: SubregionId,
  currentCountries: readonly Country[] = countries,
): void {
  updateCompletion(subregionId, 'capitalsLearnedAt', undefined, currentCountries)
}
