import { describe, expect, it, vi } from 'vitest'
import { countries } from '@/features/world-countries/data/countries'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import {
  advanceDrillLearningRun,
  deriveDrillLearningScope,
  getDrillLearningRunDoneLabel,
  resolveDrillLearningRunLaunch,
  type DrillLearningRun,
  type ResolveDrillLearningRunLaunchOptions,
} from './drillLearningRun'

const loadRecallProgressMock = vi.hoisted(() => vi.fn(async () => new Map()))
const resolveProficiencyScopeMock = vi.hoisted(() => vi.fn(() => ({ counts: { weak: 0, developing: 0 }, countryIds: [], countries: [] })))

vi.mock('@/features/world-countries/learning/recallProgress', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/world-countries/learning/recallProgress')>(),
  loadWorldCountriesRecallProgress: loadRecallProgressMock,
}))
vi.mock('./drillProficiencyScope', async importOriginal => ({
  ...await importOriginal<typeof import('./drillProficiencyScope')>(),
  resolveDrillProficiencyScope: resolveProficiencyScopeMock,
}))

const geographyOptions: ResolveDrillLearningRunLaunchOptions = {
  mode: 'learn-countries',
  selectedSubregionIds: ['northern-europe'],
  proficiencySelection: [],
  proficiencyContinent: null,
  activeCountries: countries,
  drillMode: 'countries',
  newItemsPerSet: 3,
}

function proficiencyOptions(
  overrides: Partial<ResolveDrillLearningRunLaunchOptions> = {},
): ResolveDrillLearningRunLaunchOptions {
  return {
    ...geographyOptions,
    proficiencySelection: ['weak'],
    proficiencyContinent: 'Europe',
    ...overrides,
  }
}

function run(overrides: Partial<DrillLearningRun> = {}): DrillLearningRun {
  return {
    mode: 'learn-countries',
    subregionIds: ['northern-europe', 'south-asia'],
    index: 0,
    newItemsPerSet: 3,
    recordCompletion: true,
    ...overrides,
  }
}

describe('Drill Learning-run launch resolution', () => {
  it('creates a Geography run at index zero with the configured set size', () => {
    const launch = resolveDrillLearningRunLaunch(geographyOptions)

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch).toEqual({
      mode: 'learn-countries',
      subregionIds: ['northern-europe'],
      index: 0,
      newItemsPerSet: 3,
      recordCompletion: true,
    })
  })

  it('preserves the supplied effective Subregion order', () => {
    const launch = resolveDrillLearningRunLaunch({
      ...geographyOptions,
      selectedSubregionIds: ['south-asia', 'northern-europe'],
    })

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch.subregionIds).toEqual(['south-asia', 'northern-europe'])
  })

  it('returns no Geography run for an empty selection', () => {
    expect(resolveDrillLearningRunLaunch({ ...geographyOptions, selectedSubregionIds: [] })).toBeNull()
  })

  it('snapshots the configured New items per set value and records completion', () => {
    const launch = resolveDrillLearningRunLaunch({ ...geographyOptions, newItemsPerSet: 'all' })

    if (!launch || launch instanceof Promise) throw new Error('Expected a synchronous launch')
    expect(launch.newItemsPerSet).toBe('all')
    expect(launch.recordCompletion).toBe(true)
  })
})

describe('Drill proficiency Learning-run launch resolution', () => {
  it('returns no run without the open setup Continent', async () => {
    const launch = resolveDrillLearningRunLaunch(proficiencyOptions({ proficiencyContinent: null }))

    expect(launch).toBeNull()
    expect(loadRecallProgressMock).not.toHaveBeenCalled()
  })

  it('returns no run for an empty resolved proficiency scope', async () => {
    const launch = await resolveDrillLearningRunLaunch(proficiencyOptions())

    expect(launch).toBeNull()
  })

  it('snapshots resolved Country IDs as a temporary proficiency run', async () => {
    const resolvedCountryIds = ['AL', 'AT']
    resolveProficiencyScopeMock.mockReturnValue({
      counts: { weak: 2, developing: 0 },
      countryIds: resolvedCountryIds,
      countries: [],
    } as never)

    const launch = await resolveDrillLearningRunLaunch(proficiencyOptions({
      drillMode: 'countries-capitals',
      newItemsPerSet: 5,
    }))

    if (!launch) throw new Error('Expected a proficiency Learning run')
    expect(launch).toEqual({
      mode: 'learn-countries',
      subregionIds: [],
      countryIds: resolvedCountryIds,
      index: 0,
      newItemsPerSet: 5,
      scopeLabel: 'Proficiency scope',
      recordCompletion: false,
    })
    expect(launch.countryIds).not.toBe(resolvedCountryIds)
  })

  it('loads progress using the active Drill mode skills', async () => {
    resolveProficiencyScopeMock.mockReturnValue({
      counts: { weak: 1, developing: 0 },
      countryIds: ['AL'],
      countries: [],
    } as never)

    await resolveDrillLearningRunLaunch(proficiencyOptions({ drillMode: 'countries-from-shape' }))

    expect(loadRecallProgressMock).toHaveBeenCalledWith({
      countryIds: countries.map(country => country.id),
      skills: ['shape-to-country'],
    })
    expect(resolveProficiencyScopeMock).toHaveBeenCalledWith(
      'Europe',
      ['weak'],
      expect.any(Map),
      { kind: 'drill', mode: 'countries-from-shape' },
      countries,
      [],
    )
  })
})

describe('Drill Learning-run scope derivation', () => {
  it('filters a temporary Country snapshot against the active population', () => {
    const activeCountries = countries.filter(country => country.id === 'AL')
    const scope = deriveDrillLearningScope(
      run({ subregionIds: [], countryIds: ['AL', 'AT'], recordCompletion: false }),
      activeCountries,
      [],
    )

    expect(scope.entries.map(country => country.id)).toEqual(['AL'])
    expect(scope.subregionId).toBeNull()
    expect(scope.continent).toBe('Europe')
    expect(scope.state).toBeUndefined()
  })

  it('resolves the active indexed Geography Subregion and its durable state', () => {
    const learningStates: SubregionLearningState[] = [{ subregionId: 'south-asia', countriesLearnedAt: 123 }]
    const scope = deriveDrillLearningScope(
      run({ index: 1 }),
      countries,
      learningStates,
    )

    expect(scope.subregionId).toBe('south-asia')
    expect(scope.entries.length).toBeGreaterThan(0)
    expect(scope.entries.every(country => country.subregionId === 'south-asia')).toBe(true)
    expect(scope.continent).toBe('Asia')
    expect(scope.state).toEqual(learningStates[0])
  })
})

describe('Drill Learning-run progression', () => {
  it('advances a non-final Geography run without mutating its input', () => {
    const current = run()
    const progression = advanceDrillLearningRun(current)

    expect(progression).toEqual({ kind: 'advance', run: { ...current, index: 1 } })
    expect(progression.kind === 'advance' && progression.run).not.toBe(current)
    expect(current.index).toBe(0)
  })

  it('completes a final Geography scope', () => {
    expect(advanceDrillLearningRun(run({ index: 1 }))).toEqual({ kind: 'complete' })
  })

  it('completes a temporary Country-snapshot scope after its one scope', () => {
    expect(advanceDrillLearningRun(run({ subregionIds: [], countryIds: ['AL'], recordCompletion: false }))).toEqual({ kind: 'complete' })
  })

  it('labels an intermediate scope for continuation and final scopes for setup return', () => {
    expect(getDrillLearningRunDoneLabel(run())).toBe('Continue to next Subregion')
    expect(getDrillLearningRunDoneLabel(run({ index: 1 }))).toBe('Back to Learn & Practise')
    expect(getDrillLearningRunDoneLabel(run({ subregionIds: [], countryIds: ['AL'], recordCompletion: false }))).toBe('Back to Learn & Practise')
  })
})
