import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/geography/queries'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { loadWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'
import type { WorldCountriesLearningMode } from '@/features/world-countries/learning/learnPracticeModes'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import { resolveDrillProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'

export interface DrillLearningRun {
  mode: WorldCountriesLearningMode
  subregionIds: readonly SubregionId[]
  countryIds?: readonly CountryId[]
  index: number
  newItemsPerSet: LearningSetMaximum
  scopeLabel?: string
  recordCompletion: boolean
}

export interface DrillLearningSubregionMetadata {
  subregionId: SubregionId
  countryOrder: readonly CountryId[]
}

export interface ResolveDrillLearningRunLaunchOptions {
  mode: WorldCountriesLearningMode
  selectedSubregionIds: readonly SubregionId[]
  proficiencySelection: WorldCountriesProficiencySelection
  proficiencyContinent: Continent | null
  activeCountries: readonly Country[]
  drillMode: WorldCountriesDrillMode
  newItemsPerSet: LearningSetMaximum
  subregionMetadata?: readonly DrillLearningSubregionMetadata[]
}

export function isTemporaryDrillLearningRun(
  run: DrillLearningRun,
): run is DrillLearningRun & { countryIds: readonly CountryId[] } {
  return run.countryIds !== undefined
}

/** Resolve either the selected Geography run or a temporary proficiency run. */
export function resolveDrillLearningRunLaunch({
  mode,
  selectedSubregionIds,
  proficiencySelection,
  proficiencyContinent,
  activeCountries,
  drillMode,
  newItemsPerSet,
  subregionMetadata = [],
}: ResolveDrillLearningRunLaunchOptions): DrillLearningRun | null | Promise<DrillLearningRun | null> {
  if (proficiencySelection.length === 0) {
    if (selectedSubregionIds.length === 0) return null
    return {
      mode,
      subregionIds: [...selectedSubregionIds],
      index: 0,
      newItemsPerSet,
      recordCompletion: true,
    }
  }

  if (!proficiencyContinent) return null

  return loadWorldCountriesRecallProgress({
    countryIds: activeCountries.map(country => country.id),
    skills: [...getSkillsForDrillMode(drillMode)],
  }).then(progress => {
    const proficiencyScope = resolveDrillProficiencyScope(
      proficiencyContinent,
      proficiencySelection,
      progress,
      { kind: 'drill', mode: drillMode },
      activeCountries,
      subregionMetadata,
    )
    if (proficiencyScope.countryIds.length === 0) return null
    return {
      mode,
      subregionIds: [],
      countryIds: [...proficiencyScope.countryIds],
      index: 0,
      newItemsPerSet,
      scopeLabel: 'Proficiency scope',
      recordCompletion: false,
    }
  })
}

export interface DrillLearningScope {
  entries: readonly Country[]
  subregionId: SubregionId | null
  state: SubregionLearningState | undefined
  continent: Continent | null
}

/** Derive the current Learning flow scope without storage or React side effects. */
export function deriveDrillLearningScope(
  run: DrillLearningRun | null,
  activeCountries: readonly Country[],
  learningStates: readonly SubregionLearningState[],
  subregionMetadata: readonly DrillLearningSubregionMetadata[] = [],
): DrillLearningScope {
  if (!run) return { entries: [], subregionId: null, state: undefined, continent: null }

  if (isTemporaryDrillLearningRun(run)) {
    const entries = run.countryIds
      .map(countryId => activeCountries.find(country => country.id === countryId))
      .filter((country): country is Country => country !== undefined)
    return { entries, subregionId: null, state: undefined, continent: entries[0]?.continent ?? null }
  }

  const subregionId = run.subregionIds[run.index] ?? null
  if (!subregionId) return { entries: [], subregionId: null, state: undefined, continent: null }
  const entries = getCountriesForSubregionInEffectiveOrder(
    subregionId,
    activeCountries,
    subregionMetadata.find(metadata => metadata.subregionId === subregionId),
  )
  return {
    entries,
    subregionId,
    state: learningStates.find(state => state.subregionId === subregionId),
    continent: entries[0]?.continent ?? null,
  }
}

export type DrillLearningRunProgression =
  | { kind: 'advance'; run: DrillLearningRun }
  | { kind: 'complete' }

export function advanceDrillLearningRun(run: DrillLearningRun): DrillLearningRunProgression {
  if (isTemporaryDrillLearningRun(run) || run.index >= run.subregionIds.length - 1) return { kind: 'complete' }
  return { kind: 'advance', run: { ...run, index: run.index + 1 } }
}

export function getDrillLearningRunDoneLabel(run: DrillLearningRun): string {
  return isTemporaryDrillLearningRun(run) || run.index === run.subregionIds.length - 1
    ? 'Back to Learn & Practise'
    : 'Continue to next Subregion'
}
