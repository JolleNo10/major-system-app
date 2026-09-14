import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPreferredJourneyContinent,
  getPreferredJourneyContinent,
  JOURNEY_PREFERENCE_STORAGE_KEY,
  setPreferredJourneyContinent,
} from './journeyPreferenceStore'

afterEach(() => localStorage.clear())

describe('World Countries Journey preference store', () => {
  it('round-trips a valid stable Continent ID', () => {
    setPreferredJourneyContinent('africa')

    expect(getPreferredJourneyContinent()).toBe('africa')
    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBe('africa')
  })

  it('clears the preference', () => {
    setPreferredJourneyContinent('africa')

    clearPreferredJourneyContinent()

    expect(getPreferredJourneyContinent()).toBeNull()
    expect(localStorage.getItem(JOURNEY_PREFERENCE_STORAGE_KEY)).toBeNull()
  })

  it('rejects malformed and unknown stored values without inventing an ID', () => {
    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'Africa')
    expect(getPreferredJourneyContinent()).toBeNull()

    localStorage.setItem(JOURNEY_PREFERENCE_STORAGE_KEY, 'antarctica')
    expect(getPreferredJourneyContinent()).toBeNull()
  })
})
