import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import {
  deriveWorldCountriesRecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { selectWorldCountriesMaintenanceCandidates } from './maintenanceCandidates'

describe('World Countries Maintenance candidates', () => {
  it('filters retained evidence through the active population', () => {
    const progress = deriveWorldCountriesRecallProgress(
      { countryIds: ['GL', 'NO'], skills: WORLD_COUNTRIES_RECALL_SKILLS },
      [{
        itemId: 'world-countries:location-to-country:GL',
        at: 1,
        ok: false,
        ms: 1000,
      }],
    )

    expect(selectWorldCountriesMaintenanceCandidates(
      countries.filter(country => country.id === 'NO'),
      progress,
    ).map(country => country.id)).toEqual([])
    expect(selectWorldCountriesMaintenanceCandidates(
      countries.filter(country => country.id === 'GL'),
      progress,
    ).map(country => country.id)).toEqual(['GL'])
  })
})
