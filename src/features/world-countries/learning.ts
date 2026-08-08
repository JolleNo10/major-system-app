import {
  deriveItemProgress,
  deriveScopeProgress,
  getAllAttempts,
  recordAttempt,
  selectNextItem,
  type Attempt,
  type ItemProgress,
  type LearningScope,
  type RecallItemId,
  type ScopeProgress,
} from '@/core/learning'
import { countries, type Continent, type Country } from './data/countries'
import { continentIdFor, subregionIdFor } from './data/subregions'
import type { CountryQuizDirection } from './quiz/countryQuiz'

// ISO-like stable identities in the same order as the bundled dataset. Keeping
// identity here means changing a displayed country name does not rewrite saved
// learning history. Dataset records may also provide an explicit `id`.
const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
  'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH',
  'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'CD',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU', 'IS',
  'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'XK', 'KW',
  'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY', 'MV', 'ML',
  'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR',
  'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'KP', 'MK', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG',
  'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'CG', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM',
  'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'KR', 'SS', 'ES',
  'LK', 'SD', 'SR', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN',
  'TR', 'TM', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'YE',
  'ZM', 'ZW',
] as const

const codeByName = new Map(countries.map((entry, index) => [entry.country, COUNTRY_CODES[index]]))

function fallbackCountryId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Return a stable identity for a bundled or caller-supplied country record. */
export function countryId(country: Country | string): string {
  if (typeof country === 'string') {
    const code = COUNTRY_CODES.find(candidate => candidate === country.toUpperCase())
    if (code) return code
    return codeByName.get(country) ?? fallbackCountryId(country)
  }
  if (country.id) return country.id
  return codeByName.get(country.country) ?? fallbackCountryId(country.country)
}

export function countryToCapitalItemId(country: Country | string): RecallItemId {
  return `geo:capital:${countryId(country)}:country-to-capital`
}

export function capitalToCountryItemId(country: Country | string): RecallItemId {
  return `geo:capital:${countryId(country)}:capital-to-country`
}

export function countryRecallItemId(
  country: Country | string,
  direction: CountryQuizDirection,
): RecallItemId {
  return direction === 'country-to-capital'
    ? countryToCapitalItemId(country)
    : capitalToCountryItemId(country)
}

function itemIdsFor(entries: readonly Country[], direction: CountryQuizDirection): RecallItemId[] {
  return entries.map(entry => countryRecallItemId(entry, direction))
}

function scope(
  id: string,
  entries: readonly Country[],
  direction: CountryQuizDirection,
): LearningScope {
  // Direction changes the item IDs in the scope, but the reportable geography
  // scope remains the same entity (for example, Europe or Northern Europe).
  return { id, itemIds: itemIdsFor(entries, direction) }
}

export function getCountryScope(
  entry: Country,
  direction: CountryQuizDirection,
): LearningScope {
  return scope(`geo:country:${countryId(entry)}`, [entry], direction)
}

export function getSubregionScope(
  subregion: string,
  direction: CountryQuizDirection,
  entries: readonly Country[] = countries,
): LearningScope {
  const stableSubregionId = subregionIdFor(subregion)
  return scope(
    `geo:subregion:${stableSubregionId ?? fallbackCountryId(subregion)}`,
    entries.filter(entry => stableSubregionId
      ? (entry.subregionId ?? subregionIdFor(entry.subregion)) === stableSubregionId
      : entry.subregion === subregion),
    direction,
  )
}

export function getContinentScope(
  continent: Continent,
  direction: CountryQuizDirection,
  entries: readonly Country[] = countries,
): LearningScope {
  const stableContinentId = continentIdFor(continent)
  return scope(
    `geo:continent:${stableContinentId ?? fallbackCountryId(continent)}`,
    entries.filter(entry => entry.continent === continent),
    direction,
  )
}

export function getWorldScope(
  direction: CountryQuizDirection,
  entries: readonly Country[] = countries,
): LearningScope {
  return scope('geo:world', entries, direction)
}

export function getCountryPoolScope(
  entries: readonly Country[],
  direction: CountryQuizDirection,
  label = 'quiz',
): LearningScope {
  return scope(`geo:${label}`, entries, direction)
}

export interface CountryLearningProgress {
  itemProgress: ReadonlyMap<RecallItemId, ItemProgress>
  scopeProgress: ScopeProgress
}

/** Load atomic histories and derive item + hierarchy progress on demand. */
export async function loadCountryLearningProgress(
  learningScope: LearningScope,
): Promise<CountryLearningProgress> {
  const itemIds = new Set(learningScope.itemIds)
  const attemptsByItem = new Map<RecallItemId, Attempt[]>()
  for (const attempt of await getAllAttempts()) {
    if (!itemIds.has(attempt.itemId)) continue
    const history = attemptsByItem.get(attempt.itemId) ?? []
    history.push(attempt)
    attemptsByItem.set(attempt.itemId, history)
  }
  const entries = [...itemIds].map(itemId => (
    [itemId, deriveItemProgress(itemId, attemptsByItem.get(itemId) ?? [])] as const
  ))
  const itemProgress = new Map(entries)
  return {
    itemProgress,
    scopeProgress: deriveScopeProgress(learningScope, itemProgress),
  }
}

export function recordCountryAttempt(
  country: Country,
  direction: CountryQuizDirection,
  attempt: Attempt,
): Promise<void> {
  return recordAttempt(countryRecallItemId(country, direction), attempt)
}

export function selectCountryEntry(
  entries: readonly Country[],
  direction: CountryQuizDirection,
  progress: ReadonlyMap<RecallItemId, ItemProgress>,
  recentHistory: readonly RecallItemId[] = [],
): Country | undefined {
  const itemId = selectNextItem({
    candidates: itemIdsFor(entries, direction),
    progress,
    recentHistory,
  })
  return itemId
    ? entries.find(entry => countryRecallItemId(entry, direction) === itemId)
    : undefined
}
