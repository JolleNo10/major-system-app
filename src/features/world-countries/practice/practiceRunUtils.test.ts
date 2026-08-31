import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { shufflePracticeItems, snapshotPracticeCountries } from './practiceRunUtils'

describe('World Countries Practice run utilities', () => {
  it('deduplicates by first Country occurrence and clones answer aliases', () => {
    const unitedKingdom = countries.find(country => country.id === 'GB')!
    const duplicate = { ...unitedKingdom, countryAliases: ['Changed alias'] }
    const snapshot = snapshotPracticeCountries([unitedKingdom, duplicate])

    expect(snapshot).toHaveLength(1)
    expect(snapshot[0]).not.toBe(unitedKingdom)
    expect(snapshot[0]?.countryAliases).toEqual(unitedKingdom.countryAliases)
    expect(snapshot[0]?.countryAliases).not.toBe(unitedKingdom.countryAliases)
  })

  it('preserves injected Fisher-Yates randomization semantics', () => {
    expect(shufflePracticeItems(['A', 'B', 'C'], () => 0)).toEqual(['B', 'C', 'A'])
    expect(shufflePracticeItems(['A', 'B', 'C'], () => 0.999999999)).toEqual(['A', 'B', 'C'])
  })
})
