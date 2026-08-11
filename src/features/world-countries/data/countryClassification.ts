import { countries, type CountryId } from './countries'

export type UnStatus = 'member' | 'observer' | 'none'

export type RecognitionStatus = 'general' | 'partial' | 'not-applicable'

export type EntityType =
  | 'sovereign-state'
  | 'associated-state'
  | 'territory'
  | 'special-administrative-region'
  | 'disputed-territory'

export interface CountryClassification {
  unStatus: UnStatus
  recognition: RecognitionStatus
  entityType: EntityType
  unRepresentationName?: string
  relationship?: {
    type: 'territory-of' | 'free-association-with' | 'special-administrative-region-of'
    countryId: CountryId
  }
}

/** The explicit UN Member State portion of the canonical classification. */
export const UN_MEMBER_COUNTRY_IDS: readonly CountryId[] = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
  'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH',
  'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'CD',
  'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU', 'IS',
  'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'KW', 'KG',
  'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT',
  'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP',
  'NL', 'NZ', 'NI', 'NE', 'NG', 'KP', 'MK', 'NO', 'OM', 'PK', 'PW', 'PA', 'PG', 'PY', 'PE',
  'PH', 'PL', 'PT', 'QA', 'CG', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA',
  'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'KR', 'SS', 'ES', 'LK', 'SD',
  'SR', 'SE', 'CH', 'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VE', 'VN', 'YE', 'ZM', 'ZW',
]

const NON_MEMBER_CLASSIFICATIONS: ReadonlyMap<CountryId, CountryClassification> = new Map([
  ['VA', {
    unStatus: 'observer',
    recognition: 'general',
    entityType: 'sovereign-state',
    unRepresentationName: 'Holy See',
  }],
  ['PS', {
    unStatus: 'observer',
    recognition: 'partial',
    entityType: 'sovereign-state',
  }],
  ['XK', {
    unStatus: 'none',
    recognition: 'partial',
    entityType: 'sovereign-state',
  }],
  ['TW', {
    unStatus: 'none',
    recognition: 'partial',
    entityType: 'sovereign-state',
  }],
  ['GL', {
    unStatus: 'none',
    recognition: 'not-applicable',
    entityType: 'territory',
    relationship: { type: 'territory-of', countryId: 'DK' },
  }],
  ['CK', {
    unStatus: 'none',
    recognition: 'general',
    entityType: 'associated-state',
    relationship: { type: 'free-association-with', countryId: 'NZ' },
  }],
  ['NU', {
    unStatus: 'none',
    recognition: 'general',
    entityType: 'associated-state',
    relationship: { type: 'free-association-with', countryId: 'NZ' },
  }],
])

const memberIds = new Set(UN_MEMBER_COUNTRY_IDS)

function createMemberClassification(): CountryClassification {
  return {
    unStatus: 'member',
    recognition: 'general',
    entityType: 'sovereign-state',
  }
}

/** Canonical geopolitical facts keyed by the feature-owned stable Country ID. */
export const countryClassifications: ReadonlyMap<CountryId, CountryClassification> = new Map(
  countries.map(country => {
    const explicit = NON_MEMBER_CLASSIFICATIONS.get(country.id)
    if (explicit) return [country.id, explicit] as const
    if (memberIds.has(country.id)) return [country.id, createMemberClassification()] as const
    throw new Error(`Country ${country.id} has no geopolitical classification`)
  }),
)

export function getCountryClassification(countryId: CountryId): CountryClassification {
  const classification = countryClassifications.get(countryId)
  if (!classification) throw new Error(`Unknown Country classification: ${countryId}`)
  return classification
}

/**
 * Validate both sides of the canonical Country/classification relationship.
 * This intentionally fails instead of assigning a fallback classification.
 */
export function validateCountryClassifications(
  entries: readonly Pick<{ id: CountryId }, 'id'>[],
  classifications: ReadonlyMap<CountryId, CountryClassification>,
): void {
  const countryIds = new Set(entries.map(entry => entry.id))
  const missing = entries.filter(entry => !classifications.has(entry.id)).map(entry => entry.id)
  const unknown = [...classifications.keys()].filter(countryId => !countryIds.has(countryId))
  if (missing.length || unknown.length) {
    throw new Error([
      missing.length ? `Countries without classifications: ${missing.join(', ')}` : '',
      unknown.length ? `Classifications reference unknown Countries: ${unknown.join(', ')}` : '',
    ].filter(Boolean).join('. '))
  }
}

validateCountryClassifications(countries, countryClassifications)
