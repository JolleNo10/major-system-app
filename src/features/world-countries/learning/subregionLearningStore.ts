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

export function parseStoredStates(raw: unknown): SubregionLearningState[] {
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

function readStoredStates(): SubregionLearningState[] {
  return parseStoredStates(readJSON<unknown>(SUBREGION_LEARNING_STORAGE_KEY, []))
}

export function parseMembershipRecords(raw: unknown): Record<string, PersistedMembership> {
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

function readMembershipRecords(): Record<string, PersistedMembership> {
  return parseMembershipRecords(readJSON<unknown>(SUBREGION_LEARNING_MEMBERSHIP_KEY, {}))
}

function writeMembershipRecords(records: Record<string, PersistedMembership>): void {
  safeSet(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify(records))
}

function writeStates(states: readonly SubregionLearningState[]): void {
  safeSet(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify(states))
}

function activeMembershipFingerprint(
  subregionId: SubregionId,
  activeCountries: readonly Country[] = countries,
): string {
  return activeCountries
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

function cloneMembershipRecords(records: Readonly<Record<string, PersistedMembership>>): Record<string, PersistedMembership> {
  const cloned: Record<string, PersistedMembership> = {}
  for (const [subregionId, value] of Object.entries(records)) {
    if (typeof value === 'string') {
      cloned[subregionId] = value
      continue
    }
    const history: Record<string, CompletionSnapshot> = {}
    for (const [fingerprint, snapshot] of Object.entries(value.history)) {
      history[fingerprint] = { ...snapshot }
    }
    cloned[subregionId] = { current: value.current, history }
  }
  return cloned
}

type ReconciliationResult = {
  states: SubregionLearningState[]
  records: Record<string, PersistedMembership>
  statesChanged: boolean
  recordsChanged: boolean
}

export function reconcileSubregionLearningMembership(
  states: readonly SubregionLearningState[],
  records: Readonly<Record<string, PersistedMembership>>,
  activeCountries: readonly Country[],
): ReconciliationResult {
  const nextRecords = cloneMembershipRecords(records)
  const nextStates: SubregionLearningState[] = []
  const reconciledSubregions = new Set<SubregionId>()
  let statesChanged = false
  let recordsChanged = false

  for (const state of states) {
    const currentFingerprint = activeMembershipFingerprint(state.subregionId, activeCountries)
    const stored = asMembershipRecord(nextRecords[state.subregionId])
    if (!stored) {
      statesChanged = true
      continue
    }
    if (stored.current === currentFingerprint) {
      nextStates.push({ ...state })
      reconciledSubregions.add(state.subregionId)
      continue
    }

    stored.history[stored.current] = snapshotOf(state)
    const historical = stored.history[currentFingerprint]
    if (historical) {
      nextStates.push(stateFromSnapshot(state.subregionId, historical))
      reconciledSubregions.add(state.subregionId)
      delete stored.history[currentFingerprint]
      stored.current = currentFingerprint
    }
    nextRecords[state.subregionId] = compactMembershipRecord(stored)
    statesChanged = true
    recordsChanged = true
  }

  for (const [subregionId, value] of Object.entries(nextRecords)) {
    if (!isSubregionId(subregionId)) continue
    if (reconciledSubregions.has(subregionId)) continue
    const currentFingerprint = activeMembershipFingerprint(subregionId, activeCountries)
    const stored = asMembershipRecord(value)
    const historical = stored?.history[currentFingerprint]
    if (!stored || !historical) continue
    nextStates.push(stateFromSnapshot(subregionId, historical))
    delete stored.history[currentFingerprint]
    stored.current = currentFingerprint
    nextRecords[subregionId] = compactMembershipRecord(stored)
    statesChanged = true
    recordsChanged = true
    reconciledSubregions.add(subregionId)
  }

  return {
    states: nextStates,
    records: nextRecords,
    statesChanged: statesChanged || nextStates.length !== states.length,
    recordsChanged,
  }
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

function updateMembershipRecords(
  records: Readonly<Record<string, PersistedMembership>>,
  subregionId: SubregionId,
  fingerprint: string,
  nextState: SubregionLearningState | null,
): Record<string, PersistedMembership> {
  const nextRecords = cloneMembershipRecords(records)
  const record = asMembershipRecord(nextRecords[subregionId]) ?? { current: fingerprint, history: {} }
  record.current = fingerprint
  delete record.history[fingerprint]

  if (nextState) {
    nextRecords[subregionId] = compactMembershipRecord(record)
  } else if (Object.keys(record.history).length > 0) {
    nextRecords[subregionId] = record
  } else {
    delete nextRecords[subregionId]
  }
  return nextRecords
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
