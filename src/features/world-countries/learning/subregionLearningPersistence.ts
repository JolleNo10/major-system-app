import { countries, type Country, type CountryId } from '@/features/world-countries/data/countries'
import { isSubregionId, type SubregionId } from '@/features/world-countries/data/subregions'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'

export type CompletionField = 'countriesLearnedAt' | 'capitalsLearnedAt'
export type CompletionSnapshot = Partial<Record<CompletionField, number>>

export interface MembershipRecord {
  current: string
  history: Record<string, CompletionSnapshot>
}

export type PersistedMembership = string | MembershipRecord

const canonicalCountriesById = new Map(countries.map(country => [country.id, country]))

export interface RetainedSubregionLearningSnapshot {
  subregionId: SubregionId
  countryIds: CountryId[]
  countriesLearnedAt?: number
  capitalsLearnedAt?: number
}

function parseCompletionSnapshot(value: unknown): CompletionSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  const snapshot: CompletionSnapshot = {}
  if (typeof candidate.countriesLearnedAt === 'number' && Number.isFinite(candidate.countriesLearnedAt)) {
    snapshot.countriesLearnedAt = candidate.countriesLearnedAt
  }
  if (typeof candidate.capitalsLearnedAt === 'number' && Number.isFinite(candidate.capitalsLearnedAt)) {
    snapshot.capitalsLearnedAt = candidate.capitalsLearnedAt
  }
  return Object.keys(snapshot).length > 0 ? snapshot : null
}

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
        const normalized = parseCompletionSnapshot(snapshot)
        if (normalized) history[fingerprint] = normalized
      }
    }
    records[subregionId] = { current: row.current, history }
  }
  return records
}

function countryIdsForMembershipFingerprint(
  subregionId: SubregionId,
  fingerprint: string,
): CountryId[] | null {
  const countryIds = fingerprint.split('|')
  if (!countryIds.length || countryIds.some(countryId => !countryId)) return null
  if (new Set(countryIds).size !== countryIds.length) return null
  if ([...countryIds].sort().join('|') !== fingerprint) return null

  for (const countryId of countryIds) {
    const country = canonicalCountriesById.get(countryId)
    if (!country || country.subregionId !== subregionId) return null
  }
  return countryIds as CountryId[]
}

/**
 * Enumerate every persisted completion snapshot without reconciling the active
 * membership or writing either learning storage key.
 */
export function enumerateRetainedSubregionLearningSnapshots(
  statesRaw: unknown,
  membershipsRaw: unknown,
): RetainedSubregionLearningSnapshot[] {
  const states = parseStoredStates(statesRaw)
  const rawMemberships = membershipsRaw && typeof membershipsRaw === 'object' && !Array.isArray(membershipsRaw)
    ? membershipsRaw as Record<string, unknown>
    : {}
  const parsedMemberships = parseMembershipRecords(membershipsRaw)
  const snapshots: RetainedSubregionLearningSnapshot[] = []

  for (const state of states) {
    const hasStoredMembership = Object.prototype.hasOwnProperty.call(rawMemberships, state.subregionId)
    const storedMembership = parsedMemberships[state.subregionId]
    const currentFingerprint = !hasStoredMembership
      ? countries.filter(country => country.subregionId === state.subregionId).map(country => country.id).sort().join('|')
      : typeof storedMembership === 'string'
        ? storedMembership
        : storedMembership?.current
    const countryIds = currentFingerprint
      ? countryIdsForMembershipFingerprint(state.subregionId, currentFingerprint)
      : null
    if (countryIds) snapshots.push({ ...state, countryIds })
  }

  for (const [subregionIdValue, membership] of Object.entries(rawMemberships)) {
    if (!isSubregionId(subregionIdValue) || !membership || typeof membership !== 'object' || Array.isArray(membership)) continue
    const history = (membership as Record<string, unknown>).history
    if (!history || typeof history !== 'object' || Array.isArray(history)) continue
    for (const [fingerprint, snapshotRaw] of Object.entries(history)) {
      const countryIds = countryIdsForMembershipFingerprint(subregionIdValue, fingerprint)
      const snapshot = parseCompletionSnapshot(snapshotRaw)
      if (countryIds && snapshot) snapshots.push({ subregionId: subregionIdValue, countryIds, ...snapshot })
    }
  }
  return snapshots
}

export function activeMembershipFingerprint(
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

export type ReconciliationResult = {
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

export function updateMembershipRecords(
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
