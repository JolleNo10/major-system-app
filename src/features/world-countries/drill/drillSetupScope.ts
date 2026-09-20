import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import {
  getContinentSelectionState,
  type DrillSelectionMetadata,
  type WorldCountriesDrillSelection,
  type WorldCountriesDrillSelectionCounts,
} from './drillSelection'
import type {
  WorldCountriesDrillScopeSource,
  WorldCountriesProficiencyScope,
  WorldCountriesProficiencySelection,
} from './drillProficiencyScope'

/** Shown until a geography scope resolves; the prompt never varies by level. */
const SELECTION_PROMPT = 'Choose at least one Subregion'

export interface DrillSetupLaunchState {
  canStart: boolean
  noMatching: boolean
  /** Button label while the run cannot start; says what is still missing. */
  disabledButtonLabel: string
  /** The resolved scope, or undefined while nothing resolves yet. */
  scopeSummary?: string
}

export interface DrillSetupLaunchStateInput {
  scopeSource: WorldCountriesDrillScopeSource
  selection: WorldCountriesDrillSelection
  selectionCounts: WorldCountriesDrillSelectionCounts
  proficiencySelection: WorldCountriesProficiencySelection
  proficiencyScope: WorldCountriesProficiencyScope
  proficiencyLoading: boolean
  entries: readonly Country[]
  selectionMetadata: DrillSelectionMetadata
  worldOrder: readonly Continent[]
}

/**
 * Whether the configured run can start, and how to describe it.
 *
 * This lives outside the rails component because the setup centre owns the
 * action now: the dock states the scope and starts the run, while the rails
 * only collect the settings that feed this.
 */
export function deriveDrillSetupLaunchState({
  scopeSource,
  selection,
  selectionCounts,
  proficiencySelection,
  proficiencyScope,
  proficiencyLoading,
  entries,
  selectionMetadata,
  worldOrder,
}: DrillSetupLaunchStateInput): DrillSetupLaunchState {
  const usesProficiency = scopeSource === 'proficiency'
  const proficiencySelected = usesProficiency && proficiencySelection.length > 0
  const canStart = usesProficiency
    ? proficiencySelected && !proficiencyLoading && proficiencyScope.countries.length > 0
    : selectionCounts.countries > 0
  const noMatching = proficiencySelected && !proficiencyLoading && proficiencyScope.countries.length === 0
  const disabledButtonLabel = usesProficiency
    ? !proficiencySelected
      ? 'Choose Weak or Developing'
      : proficiencyLoading
        ? 'Loading proficiency…'
        : noMatching
          ? 'No matching Countries'
          : 'Start Drill'
    : canStart
      ? 'Start Drill'
      : SELECTION_PROMPT
  const scopeSummary = proficiencySelected
    ? !proficiencyLoading && proficiencyScope.countries.length > 0
      ? formatProficiencyScopeSummary(proficiencySelection, proficiencyScope.countries.length)
      : undefined
    : !usesProficiency && selectionCounts.countries > 0
      ? formatGeographyScopeSummary(selection, selectionCounts, entries, selectionMetadata, worldOrder)
      : undefined

  return { canStart, noMatching, disabledButtonLabel, ...(scopeSummary ? { scopeSummary } : {}) }
}

export function formatCountryCount(count: number): string {
  return `${count} ${count === 1 ? 'Country' : 'Countries'}`
}

function formatGeographyScopeSummary(
  selection: WorldCountriesDrillSelection,
  counts: WorldCountriesDrillSelectionCounts,
  entries: readonly Country[],
  metadata: DrillSelectionMetadata,
  worldOrder: readonly Continent[],
): string {
  const entireContinent = counts.continents === 1
    ? worldOrder.find(continent => getContinentSelectionState(selection, continent, entries, metadata) === 'all')
    : undefined
  if (entireContinent) return `${entireContinent} · ${formatCountryCount(counts.countries)}`
  if (counts.subregions === 1) return `${getSubregionDefinition(selection.subregionIds[0]!).label} · ${formatCountryCount(counts.countries)}`
  return `${counts.subregions} Subregions · ${formatCountryCount(counts.countries)}`
}

function formatProficiencyScopeSummary(
  selection: WorldCountriesProficiencySelection,
  countryCount: number,
): string {
  const labels = (['weak', 'developing'] as const)
    .filter(filter => selection.includes(filter))
    .map(filter => filter === 'weak' ? 'Weak' : 'Developing')
  return `${labels.join(' + ')} · ${formatCountryCount(countryCount)}`
}
