import { describe, expect, it } from 'vitest'
import { getCanonicalContinentSubregions } from './continentMetadata'
import { getCanonicalSubregionCountries } from './subregionMetadata'
import { getCanonicalWorldContinents } from './worldMetadata'
import { countries, type CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'

const expectedSubregions = {
  europe: ['northern-europe', 'eastern-europe', 'balkans', 'central-europe', 'western-europe', 'southern-europe'],
  asia: ['west-asia', 'caucasus', 'central-asia', 'east-asia', 'south-asia', 'southeast-asia'],
  oceania: ['australia-new-zealand', 'micronesia', 'melanesia', 'polynesia'],
  africa: ['north-africa', 'west-africa', 'central-africa', 'east-africa', 'southern-africa', 'indian-ocean'],
  'north-america': ['northern-america', 'central-america', 'caribbean'],
  'south-america': ['northern-south-america', 'andean-countries', 'eastern-south-america', 'southern-cone'],
} as const

const expectedCountries = {
  'northern-europe': ['IS', 'NO', 'SE', 'FI', 'EE', 'LV', 'LT', 'DK', 'GB', 'IE'],
  'eastern-europe': ['RU', 'BY', 'UA', 'MD', 'RO'],
  balkans: ['HR', 'BA', 'RS', 'ME', 'AL', 'XK', 'MK', 'BG'],
  'central-europe': ['DE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'AT', 'LI', 'CH'],
  'western-europe': ['NL', 'BE', 'LU', 'FR', 'MC'],
  'southern-europe': ['PT', 'ES', 'AD', 'IT', 'SM', 'VA', 'MT', 'GR', 'CY'],
  'west-asia': ['TR', 'SY', 'LB', 'IL', 'PS', 'JO', 'SA', 'YE', 'OM', 'AE', 'QA', 'BH', 'KW', 'IQ', 'IR'],
  caucasus: ['GE', 'AM', 'AZ'],
  'central-asia': ['KZ', 'TM', 'UZ', 'KG', 'TJ'],
  'east-asia': ['MN', 'CN', 'KP', 'KR', 'JP', 'TW'],
  'south-asia': ['AF', 'PK', 'IN', 'NP', 'BT', 'BD', 'LK', 'MV'],
  'southeast-asia': ['MM', 'LA', 'VN', 'KH', 'TH', 'MY', 'SG', 'BN', 'PH', 'ID', 'TL'],
  'australia-new-zealand': ['AU', 'NZ'],
  micronesia: ['PW', 'FM', 'NR', 'MH', 'KI'],
  melanesia: ['PG', 'SB', 'VU', 'FJ'],
  polynesia: ['CK', 'NU', 'TV', 'WS', 'TO'],
  'north-africa': ['MA', 'DZ', 'TN', 'LY', 'EG', 'SD'],
  'west-africa': ['TG', 'BJ', 'CV', 'GM', 'GW', 'MR', 'LR', 'GN', 'SL', 'CI', 'SN', 'ML', 'GH', 'BF', 'NG', 'NE'],
  'central-africa': ['TD', 'CM', 'CF', 'CD', 'CG', 'GA', 'GQ', 'ST'],
  'east-africa': ['ER', 'DJ', 'SO', 'ET', 'SS', 'UG', 'KE', 'TZ', 'BI', 'RW'],
  'southern-africa': ['AO', 'ZM', 'MW', 'MZ', 'ZW', 'BW', 'NA', 'ZA', 'SZ', 'LS'],
  'indian-ocean': ['KM', 'MG', 'SC', 'MU'],
  'northern-america': ['CA', 'GL', 'US', 'MX'],
  'central-america': ['BZ', 'GT', 'SV', 'HN', 'NI', 'CR', 'PA'],
  caribbean: ['CU', 'JM', 'BS', 'HT', 'DO', 'KN', 'AG', 'DM', 'LC', 'BB', 'VC', 'GD', 'TT'],
  'northern-south-america': ['CO', 'VE', 'GY', 'SR'],
  'andean-countries': ['EC', 'PE', 'BO'],
  'eastern-south-america': ['BR'],
  'southern-cone': ['CL', 'AR', 'PY', 'UY'],
} as const

describe('World Countries canonical geography order', () => {
  it('uses the revised export order for Continents and Subregions', () => {
    expect(getCanonicalWorldContinents()).toEqual([
      'Europe',
      'Asia',
      'Oceania',
      'Africa',
      'North America',
      'South America',
    ])

    const continentLabels = {
      europe: 'Europe',
      asia: 'Asia',
      oceania: 'Oceania',
      africa: 'Africa',
      'north-america': 'North America',
      'south-america': 'South America',
    } as const

    for (const [continentId, subregionIds] of Object.entries(expectedSubregions)) {
      expect(getCanonicalContinentSubregions(continentLabels[continentId as keyof typeof continentLabels])
        .map(subregion => subregion.id))
        .toEqual(subregionIds)
    }
  })

  it('uses the revised export order for Countries within every Subregion', () => {
    for (const [subregionId, countryIds] of Object.entries(expectedCountries)) {
      expect(getCanonicalSubregionCountries(subregionId as SubregionId).map(country => country.id))
        .toEqual(countryIds as readonly CountryId[])
    }
  })

  it('keeps affected Country names aligned with their stable IDs', () => {
    const idForCountry = (countryName: string) => countries.find(country => country.country === countryName)?.id

    expect(idForCountry('Pakistan')).toBe('PK')
    expect(idForCountry('India')).toBe('IN')
    expect(idForCountry('Maldives')).toBe('MV')
    expect(idForCountry('Myanmar')).toBe('MM')
  })
})
