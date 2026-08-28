import { describe, expect, it } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import { resolveDrillSessionLaunch } from './drillSessionLaunch'

const preferences = {
  subregionIds: ['northern-europe'] as const,
  mode: 'countries-capitals' as const,
  order: 'ordered' as const,
}

describe('World Countries Drill session launch resolution', () => {
  it('returns a normalized World-wide selection and a session country snapshot', () => {
    const launch = resolveDrillSessionLaunch({
      startPreferences: preferences,
      activeCountries: countries,
      proficiencySelection: [],
    })

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch?.selection).toEqual({ subregionIds: ['northern-europe'] })
    expect(launch?.countryIds).toEqual(launch?.entries.map(country => country.id))
    expect(launch?.countryOrder).toEqual(launch?.countryIds)
    expect(launch?.activity).toBe('drill')
    expect(launch?.interaction).toBe('recall')
  })

  it('keeps a retry subset transient and in the requested Country order', () => {
    const launch = resolveDrillSessionLaunch({
      startPreferences: preferences,
      activeCountries: countries,
      proficiencySelection: [],
      countryIds: ['SE', 'NO', 'SE', 'not-a-country'],
    })

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch.countryIds).toEqual(['SE', 'NO'])
    expect(launch.countryOrder).toEqual(['SE', 'NO'])
  })

  it('does not produce a launch for an empty geographic scope', () => {
    const launch = resolveDrillSessionLaunch({
      startPreferences: { ...preferences, subregionIds: [] },
      activeCountries: countries,
      proficiencySelection: [],
    })

    expect(launch).toBeNull()
  })

  it('launches one session containing selected Subregions from Europe and Asia', () => {
    const launch = resolveDrillSessionLaunch({
      startPreferences: { ...preferences, subregionIds: ['northern-europe', 'south-asia'] },
      activeCountries: countries,
      proficiencySelection: [],
    })

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch.selection).toEqual({ subregionIds: ['northern-europe', 'south-asia'] })
    expect(new Set(launch.entries.map(country => country.continent))).toEqual(new Set(['Asia', 'Europe']))
    expect(launch.countryIds).toHaveLength(launch.entries.length)
  })

  it('keeps random mode membership identical to ordered mode', () => {
    const ordered = resolveDrillSessionLaunch({
      startPreferences: { ...preferences, subregionIds: ['northern-europe', 'south-asia'], order: 'ordered' },
      activeCountries: countries,
      proficiencySelection: [],
    })
    const random = resolveDrillSessionLaunch({
      startPreferences: { ...preferences, subregionIds: ['northern-europe', 'south-asia'], order: 'random' },
      activeCountries: countries,
      proficiencySelection: [],
    })

    if (!ordered || ordered instanceof Promise || !random || random instanceof Promise) throw new Error('Expected synchronous launches')
    expect(new Set(ordered.entries.map(country => country.id))).toEqual(new Set(random.entries.map(country => country.id)))
  })
})
