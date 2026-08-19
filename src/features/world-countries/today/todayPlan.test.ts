import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { deriveWorldCountriesRecallHistory } from '@/features/world-countries/learning/recallHistory'
import { buildWorldCountriesTodayPlan } from './todayPlan'

function historyFor(attempts: readonly { itemId: string; at: number; ok: boolean; evidenceKind?: 'recall' | 'recognition'; localDate?: string }[]) {
  return deriveWorldCountriesRecallHistory({
    countryIds: ['NO'],
    skills: ['location-to-country', 'country-to-capital'],
  }, attempts.map(attempt => ({ ms: 100, ...attempt })))
}

describe('World Countries Today plan', () => {
  it('counts only the two core skills and prioritizes latest failures', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-10' },
        { itemId: 'world-countries:location-to-country:NO', at: 2, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
        { itemId: 'world-countries:capital-to-country:NO', at: 3, ok: false, evidenceKind: 'recall', localDate: '2026-08-11' },
      ]),
      localDate: '2026-08-19',
    })
    expect(plan.dueCount).toBe(1)
    expect(plan.dueCandidates[0]?.target.skill).toBe('location-to-country')
  })

  it('recommends Capitals after successful location evidence without re-teaching Countries', () => {
    const plan = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recognition', localDate: '2026-08-10' },
      ]),
      localDate: '2026-08-19',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(plan.dueCount).toBe(1)
    expect(plan.nextLearning).toBeNull()

    const caughtUp = buildWorldCountriesTodayPlan({
      activeCountries: countries.filter(country => country.id === 'NO'),
      history: historyFor([
        { itemId: 'world-countries:location-to-country:NO', at: 1, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
        { itemId: 'world-countries:country-to-capital:NO', at: 2, ok: true, evidenceKind: 'recall', localDate: '2026-08-18' },
      ]),
      localDate: '2026-08-18',
      effectiveSubregionIds: ['northern-europe'],
    })
    expect(caughtUp.nextLearning).toBeNull()
  })
})
