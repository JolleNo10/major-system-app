// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { countries, getCanonicalCountryIdsForSubregion } from '@/features/world-countries/data/countries'
import { setSubregionCountryOrder } from '@/features/world-countries/geography/subregionMetadataStore'
import {
  clearSubregionCapitalsLearned,
  clearSubregionCountriesLearned,
  getSubregionLearningState,
  markSubregionCapitalsLearned,
  markSubregionCountriesLearned,
  parseMembershipRecords,
  parseStoredStates,
  reconcileSubregionLearningMembership,
  SUBREGION_LEARNING_MEMBERSHIP_KEY,
  SUBREGION_LEARNING_STORAGE_KEY,
} from './subregionLearningStore'

afterEach(() => localStorage.clear())

const fullNorthernEuropeMembership = countries.filter(country => country.id === 'IS' || country.id === 'NO')
const reducedNorthernEuropeMembership = fullNorthernEuropeMembership.filter(country => country.id === 'IS')

describe('Subregion learning store', () => {
  it('preserves independent Country and Capital completion facts', () => {
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(markSubregionCountriesLearned('northern-europe', 1234)).toEqual({ subregionId: 'northern-europe', countriesLearnedAt: 1234 })
    expect(markSubregionCapitalsLearned('northern-europe', 5678)).toEqual({
      subregionId: 'northern-europe',
      countriesLearnedAt: 1234,
      capitalsLearnedAt: 5678,
    })
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      countriesLearnedAt: 1234,
      capitalsLearnedAt: 5678,
    })
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_STORAGE_KEY)!)).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234, capitalsLearnedAt: 5678 },
    ])
  })

  it('allows Capitals to be learned before Countries and clears fields independently', () => {
    expect(markSubregionCapitalsLearned('northern-europe', 5678)).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
    clearSubregionCountriesLearned('northern-europe')
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
    clearSubregionCapitalsLearned('northern-europe')
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_MEMBERSHIP_KEY)!)).toEqual({})
  })

  it('does not trust legacy completion rows without a membership fingerprint', () => {
    localStorage.setItem(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234, capitalsLearnedAt: 5678 },
    ]))
    expect(getSubregionLearningState('northern-europe')).toBeNull()
  })

  it('keeps completion when only the user-authored Country order changes', () => {
    markSubregionCapitalsLearned('northern-europe', 5678)
    const canonicalIds = getCanonicalCountryIdsForSubregion('northern-europe')
    setSubregionCountryOrder('northern-europe', [...canonicalIds].reverse())
    expect(getSubregionLearningState('northern-europe')).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
  })

  it('invalidates both completion dimensions when the membership fingerprint changes', () => {
    markSubregionCountriesLearned('northern-europe', 1234)
    markSubregionCapitalsLearned('northern-europe', 5678)
    localStorage.setItem(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify({ 'northern-europe': 'changed' }))
    expect(getSubregionLearningState('northern-europe')).toBeNull()
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_STORAGE_KEY)!)).toEqual([])
  })

  it('restores completion when a previously learned Country membership is re-enabled', () => {
    const fullMembership = countries
    const withoutGreenland = countries.filter(country => country.id !== 'GL')
    markSubregionCountriesLearned('northern-america', 1234, fullMembership)
    expect(getSubregionLearningState('northern-america', withoutGreenland)).toBeNull()
    expect(getSubregionLearningState('northern-america', fullMembership)).toEqual({
      subregionId: 'northern-america',
      countriesLearnedAt: 1234,
    })
  })
})

describe('Subregion learning parsing', () => {
  it('parses only valid, non-empty, first-seen completion rows', () => {
    expect(parseStoredStates('not an array')).toEqual([])
    expect(parseStoredStates([
      { subregionId: 'not-a-subregion', countriesLearnedAt: 1 },
      { subregionId: 'northern-europe', countriesLearnedAt: Number.NaN },
      { subregionId: 'northern-europe', countriesLearnedAt: 1234 },
      { subregionId: 'northern-europe', capitalsLearnedAt: 5678 },
      { subregionId: 'southern-europe' },
      { subregionId: 'eastern-europe', capitalsLearnedAt: 4321 },
      { subregionId: 'western-europe', capitalsLearnedAt: Number.POSITIVE_INFINITY },
      { subregionId: 'balkans', countriesLearnedAt: 1111, capitalsLearnedAt: 2222 },
    ])).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234 },
      { subregionId: 'eastern-europe', capitalsLearnedAt: 4321 },
      { subregionId: 'balkans', countriesLearnedAt: 1111, capitalsLearnedAt: 2222 },
    ])
  })

  it('parses legacy and history-capable membership records while ignoring malformed values', () => {
    expect(parseMembershipRecords(null)).toEqual({})
    expect(parseMembershipRecords({
      'not-a-subregion': 'ignored',
      'northern-europe': 'IS|NO',
      'southern-europe': {
        current: 'PT|ES',
        history: {
          malformedNull: null,
          malformedArray: [],
          empty: {},
          countryOnly: { countriesLearnedAt: 100, ignored: 'value' },
          capitalOnly: { capitalsLearnedAt: 200 },
          both: { countriesLearnedAt: 300, capitalsLearnedAt: 400 },
          nonFinite: { countriesLearnedAt: Number.NaN },
        },
      },
      'western-europe': { current: '' },
      'eastern-europe': [],
    })).toEqual({
      'northern-europe': 'IS|NO',
      'southern-europe': {
        current: 'PT|ES',
        history: {
          countryOnly: { countriesLearnedAt: 100 },
          capitalOnly: { capitalsLearnedAt: 200 },
          both: { countriesLearnedAt: 300, capitalsLearnedAt: 400 },
        },
      },
    })
  })
})

describe('Subregion learning membership reconciliation', () => {
  it('returns unchanged membership without mutating input objects', () => {
    const states = [{ subregionId: 'northern-europe' as const, countriesLearnedAt: 1234 }]
    const records = { 'northern-europe': 'IS|NO' as const }
    const statesBefore = JSON.parse(JSON.stringify(states))
    const recordsBefore = JSON.parse(JSON.stringify(records))

    const result = reconcileSubregionLearningMembership(states, records, fullNorthernEuropeMembership)

    expect(result).toEqual({ states, records, statesChanged: false, recordsChanged: false })
    expect(result.states).not.toBe(states)
    expect(states).toEqual(statesBefore)
    expect(records).toEqual(recordsBefore)
  })

  it('drops a completion state with no membership record', () => {
    const result = reconcileSubregionLearningMembership(
      [{ subregionId: 'northern-europe', countriesLearnedAt: 1234 }],
      {},
      fullNorthernEuropeMembership,
    )

    expect(result).toEqual({ states: [], records: {}, statesChanged: true, recordsChanged: false })
  })

  it('archives a changed membership and leaves the active completion absent without history', () => {
    const result = reconcileSubregionLearningMembership(
      [{ subregionId: 'northern-europe', countriesLearnedAt: 1234, capitalsLearnedAt: 5678 }],
      { 'northern-europe': 'IS|NO' },
      reducedNorthernEuropeMembership,
    )

    expect(result.states).toEqual([])
    expect(result.records).toEqual({
      'northern-europe': {
        current: 'IS|NO',
        history: { 'IS|NO': { countriesLearnedAt: 1234, capitalsLearnedAt: 5678 } },
      },
    })
    expect(result.statesChanged).toBe(true)
    expect(result.recordsChanged).toBe(true)
  })

  it('restores matching history, removes the restored fingerprint, and keeps unrelated history', () => {
    const states = [{ subregionId: 'northern-europe' as const, countriesLearnedAt: 1234 }]
    const records = {
      'northern-europe': {
        current: 'IS|NO',
        history: {
          IS: { countriesLearnedAt: 2222, capitalsLearnedAt: 3333 },
          'DE|FR': { capitalsLearnedAt: 4444 },
        },
      },
    }
    const statesBefore = JSON.parse(JSON.stringify(states))
    const recordsBefore = JSON.parse(JSON.stringify(records))

    const result = reconcileSubregionLearningMembership(states, records, reducedNorthernEuropeMembership)

    expect(result.states).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 2222, capitalsLearnedAt: 3333 },
    ])
    expect(result.records).toEqual({
      'northern-europe': {
        current: 'IS',
        history: {
          'IS|NO': { countriesLearnedAt: 1234 },
          'DE|FR': { capitalsLearnedAt: 4444 },
        },
      },
    })
    expect(states).toEqual(statesBefore)
    expect(records).toEqual(recordsBefore)
    expect(result.statesChanged).toBe(true)
    expect(result.recordsChanged).toBe(true)
  })

  it('compacts a restored membership record when no history remains', () => {
    const result = reconcileSubregionLearningMembership(
      [],
      {
        'northern-europe': {
          current: 'IS|NO',
          history: { IS: { countriesLearnedAt: 2222 } },
        },
      },
      reducedNorthernEuropeMembership,
    )

    expect(result.states).toEqual([
      { subregionId: 'northern-europe', countriesLearnedAt: 2222 },
    ])
    expect(result.records).toEqual({ 'northern-europe': 'IS' })
    expect(result.statesChanged).toBe(true)
    expect(result.recordsChanged).toBe(true)
  })

  it('keeps unrelated historical snapshots when updating the active completion', () => {
    localStorage.setItem(SUBREGION_LEARNING_STORAGE_KEY, JSON.stringify([
      { subregionId: 'northern-europe', countriesLearnedAt: 1234 },
    ]))
    localStorage.setItem(SUBREGION_LEARNING_MEMBERSHIP_KEY, JSON.stringify({
      'northern-europe': {
        current: 'IS',
        history: { 'DE|FR': { capitalsLearnedAt: 4444 } },
      },
    }))

    expect(markSubregionCapitalsLearned('northern-europe', 5678, fullNorthernEuropeMembership)).toEqual({
      subregionId: 'northern-europe',
      capitalsLearnedAt: 5678,
    })
    expect(JSON.parse(localStorage.getItem(SUBREGION_LEARNING_MEMBERSHIP_KEY)!)).toEqual({
      'northern-europe': {
        current: 'IS|NO',
        history: {
          IS: { countriesLearnedAt: 1234 },
          'DE|FR': { capitalsLearnedAt: 4444 },
        },
      },
    })
  })
})
