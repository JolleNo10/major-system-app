import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { getReciteProgressOutcome, type WorldCountriesReciteProgress } from './reciteProgress'
import type { ReciteCountryOutcome, ReciteMode } from './reciteSession'

export const RECITE_CONTEXT_GREY = '#303036'

export const RECITE_STATUS_COLORS = {
  unrecited: '#52525b',
  revealed: '#92400e',
  recovered: '#d97706',
  recalled: '#15803d',
} as const

export type ReciteStatus = keyof typeof RECITE_STATUS_COLORS

const RECITE_STATUS_DESCRIPTIONS: Readonly<Record<ReciteStatus, string>> = {
  unrecited: 'No completed Recite outcome for this mode.',
  revealed: 'The latest completed Recite run used Reveal or Skip.',
  recovered: 'The latest completed Recite run required a retry without Reveal or Skip.',
  recalled: 'The latest completed Recite run was clean on the first try.',
}

function colorForStatus(status: ReciteStatus): string {
  return RECITE_STATUS_COLORS[status]
}

function statusForOutcome(outcome: ReciteCountryOutcome | undefined): ReciteStatus {
  return outcome ?? 'unrecited'
}

export function getReciteStatusDescription(status: ReciteStatus): string {
  return RECITE_STATUS_DESCRIPTIONS[status]
}

export function createReciteSetupCountryColors(
  visibleCountries: readonly Country[],
  scopeCountryIds: readonly CountryId[] | undefined,
  mode: ReciteMode,
  progress: WorldCountriesReciteProgress,
): ReadonlyMap<CountryId, string> {
  const scope = scopeCountryIds === undefined ? null : new Set(scopeCountryIds)
  return new Map(visibleCountries.map(country => {
    if (scope && !scope.has(country.id)) return [country.id, RECITE_CONTEXT_GREY] as const
    const outcome = getReciteProgressOutcome(progress, mode, country.id)?.outcome
    return [country.id, colorForStatus(statusForOutcome(outcome))] as const
  }))
}

export function createReciteSetupCountryDescriptions(
  visibleCountries: readonly Country[],
  scopeCountryIds: readonly CountryId[] | undefined,
  mode: ReciteMode,
  progress: WorldCountriesReciteProgress,
): ReadonlyMap<CountryId, string> {
  const scope = scopeCountryIds === undefined ? null : new Set(scopeCountryIds)
  return new Map(visibleCountries.map(country => {
    if (scope && !scope.has(country.id)) return [country.id, 'Outside the active Recite scope.'] as const
    const outcome = getReciteProgressOutcome(progress, mode, country.id)?.outcome
    return [country.id, getReciteStatusDescription(statusForOutcome(outcome))] as const
  }))
}

export function createReciteActiveCountryColors(
  visibleCountries: readonly Country[],
  scopeCountryIds: readonly CountryId[],
  outcomesByCountryId: ReadonlyMap<CountryId, ReciteCountryOutcome | null>,
): ReadonlyMap<CountryId, string> {
  const scope = new Set(scopeCountryIds)
  return new Map(visibleCountries.map(country => {
    if (!scope.has(country.id)) return [country.id, RECITE_CONTEXT_GREY] as const
    return [country.id, colorForStatus(statusForOutcome(outcomesByCountryId.get(country.id) ?? undefined))] as const
  }))
}
