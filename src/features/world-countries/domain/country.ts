import { countries, type Country, type CountryId } from '@/features/world-countries/data/countries'

// Keep the identity table beside the canonical data contract, rather than in
// a learning/session adapter. The bundled records are intentionally assigned
// their stable IDs in data/countries.ts; this table also supports fixtures and
// imported records that predate the explicit `id` field.
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

function fallbackCountryId(name: string): CountryId {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Return the stable domain identity for a Country record or country name/ID. */
export function getCountryId(country: Country | string): CountryId {
  if (typeof country === 'string') {
    const code = COUNTRY_CODES.find(candidate => candidate === country.toUpperCase())
    if (code) return code
    return codeByName.get(country) ?? fallbackCountryId(country)
  }
  if (country.id) return country.id
  return codeByName.get(country.country) ?? fallbackCountryId(country.country)
}

/** Resolve a stable Country identity without involving a workflow or store. */
export function getCountryById(
  id: CountryId,
  entries: readonly Country[] = countries,
): Country | undefined {
  return entries.find(country => getCountryId(country) === id)
}
