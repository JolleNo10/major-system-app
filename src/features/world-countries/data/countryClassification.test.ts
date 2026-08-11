import { describe, expect, it } from 'vitest'
import { countries } from './countries'
import {
  countryClassifications,
  getCountryClassification,
  validateCountryClassifications,
} from './countryClassification'

describe('canonical country classifications', () => {
  it('classifies every canonical Country exactly once', () => {
    expect(countryClassifications.size).toBe(countries.length)
    expect(() => validateCountryClassifications(countries, countryClassifications)).not.toThrow()
    expect(countries.filter(country => getCountryClassification(country.id).unStatus === 'member')).toHaveLength(193)
  })

  it('keeps the required geopolitical distinctions', () => {
    expect(getCountryClassification('VA')).toMatchObject({
      unStatus: 'observer',
      entityType: 'sovereign-state',
      recognition: 'general',
      unRepresentationName: 'Holy See',
    })
    expect(getCountryClassification('PS')).toMatchObject({ unStatus: 'observer', recognition: 'partial' })
    expect(getCountryClassification('XK')).toMatchObject({
      unStatus: 'none',
      entityType: 'sovereign-state',
      recognition: 'partial',
    })
    expect(getCountryClassification('TW')).toMatchObject({
      unStatus: 'none',
      entityType: 'sovereign-state',
      recognition: 'partial',
    })
    expect(countries).toHaveLength(200)
    expect(countries.find(country => country.id === 'GL')).toMatchObject({
      country: 'Greenland',
      continent: 'North America',
      subregion: 'Northern America',
      unM49Subregion: 'Northern America',
    })
    expect(getCountryClassification('GL')).toMatchObject({
      unStatus: 'none',
      recognition: 'not-applicable',
      entityType: 'territory',
      relationship: { type: 'territory-of', countryId: 'DK' },
    })
    expect(countries.find(country => country.id === 'CK')).toMatchObject({
      country: 'Cook Islands',
      continent: 'Oceania',
      subregion: 'Polynesia',
      unM49Subregion: 'Polynesia',
    })
    expect(getCountryClassification('CK')).toMatchObject({
      entityType: 'associated-state',
      relationship: { type: 'free-association-with', countryId: 'NZ' },
    })
    expect(countries.find(country => country.id === 'NU')).toMatchObject({
      country: 'Niue',
      capital: 'Alofi',
      subregion: 'Polynesia',
    })
  })

  it('rejects classifications in either direction when validating a dataset', () => {
    expect(() => validateCountryClassifications(
      countries.slice(1),
      countryClassifications,
    )).toThrow(/without a classification|unknown Countr/i)
    expect(() => validateCountryClassifications(
      countries,
      new Map([...countryClassifications, ['UNKNOWN', getCountryClassification('AF')]]),
    )).toThrow(/unknown Countr/i)
  })
})
