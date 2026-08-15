import { readJSON, safeSet } from '@/core/storage'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  RECITE_MODES,
  type ReciteCountryOutcome,
  type ReciteMode,
} from './reciteSession'

export const RECITE_PROGRESS_STORAGE_KEY = 'world-countries-recite-progress'
const RECITE_PROGRESS_VERSION = 1 as const

export interface ReciteProgressEntry {
  outcome: ReciteCountryOutcome
  completedAt: number
}

export interface WorldCountriesReciteProgress {
  version: typeof RECITE_PROGRESS_VERSION
  outcomes: Partial<Record<ReciteMode, Record<string, ReciteProgressEntry>>>
}

export interface CompletedReciteCountryOutcome {
  countryId: CountryId
  outcome: ReciteCountryOutcome
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReciteMode(value: string): value is ReciteMode {
  return (RECITE_MODES as readonly string[]).includes(value)
}

function isReciteOutcome(value: unknown): value is ReciteCountryOutcome {
  return value === 'recalled' || value === 'recovered' || value === 'revealed'
}

function emptyProgress(): WorldCountriesReciteProgress {
  return { version: RECITE_PROGRESS_VERSION, outcomes: {} }
}

function normalizeProgress(value: unknown): WorldCountriesReciteProgress {
  if (!isRecord(value) || value.version !== RECITE_PROGRESS_VERSION || !isRecord(value.outcomes)) {
    return emptyProgress()
  }

  const outcomes: Partial<Record<ReciteMode, Record<string, ReciteProgressEntry>>> = {}
  for (const [mode, rawEntries] of Object.entries(value.outcomes)) {
    if (!isReciteMode(mode) || !isRecord(rawEntries)) continue
    const entries: Record<string, ReciteProgressEntry> = {}
    for (const [countryId, rawEntry] of Object.entries(rawEntries)) {
      if (!countryId.trim() || !isRecord(rawEntry)) continue
      const { outcome, completedAt } = rawEntry
      if (!isReciteOutcome(outcome) || typeof completedAt !== 'number' || !Number.isFinite(completedAt)) continue
      entries[countryId] = { outcome, completedAt }
    }
    if (Object.keys(entries).length > 0) outcomes[mode] = entries
  }
  return { version: RECITE_PROGRESS_VERSION, outcomes }
}

export function loadWorldCountriesReciteProgress(): WorldCountriesReciteProgress {
  return normalizeProgress(readJSON<unknown>(RECITE_PROGRESS_STORAGE_KEY, null))
}

export function getReciteProgressOutcome(
  progress: WorldCountriesReciteProgress,
  mode: ReciteMode,
  countryId: CountryId,
): ReciteProgressEntry | undefined {
  const entry = progress.outcomes[mode]?.[countryId]
  return entry ? { ...entry } : undefined
}

/** Persist only outcomes from a completed run; incomplete sessions never call this. */
export function saveCompletedReciteRun(
  mode: ReciteMode,
  outcomes: readonly CompletedReciteCountryOutcome[],
  completedAt = Date.now(),
): WorldCountriesReciteProgress {
  const current = loadWorldCountriesReciteProgress()
  const modeEntries = { ...(current.outcomes[mode] ?? {}) }
  for (const { countryId, outcome } of outcomes) {
    if (!countryId.trim()) continue
    const previous = modeEntries[countryId]
    if (previous && previous.completedAt > completedAt) continue
    modeEntries[countryId] = { outcome, completedAt }
  }
  const next: WorldCountriesReciteProgress = {
    version: RECITE_PROGRESS_VERSION,
    outcomes: { ...current.outcomes, [mode]: modeEntries },
  }
  safeSet(RECITE_PROGRESS_STORAGE_KEY, JSON.stringify(next))
  return next
}
