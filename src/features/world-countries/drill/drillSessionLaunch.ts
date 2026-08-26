import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { loadWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import { createDrillCountryOrder, getWorldCountriesSessionOrder } from './drillOrder'
import { getSkillsForDrillMode } from './drillModes'
import { getCountriesForDrillSelectionInEffectiveOrder, normalizeDrillSelection, type WorldCountriesDrillSelection } from './drillSelection'
import { resolveDrillProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'
import type { DrillSessionInteraction } from './DrillSession'
import type { WorldCountriesDrillPreferences } from './drillPreferences'

export interface ResolveDrillSessionLaunchOptions {
  startPreferences: WorldCountriesDrillPreferences
  activeCountries: readonly Country[]
  proficiencySelection: WorldCountriesProficiencySelection
  interaction?: DrillSessionInteraction
  activity?: 'drill' | 'practice'
  skills?: readonly WorldCountriesRecallSkill[]
  practiceMode?: WorldCountriesPracticeMode
  /** A transient Country subset for a retry; it never changes preferences. */
  countryIds?: readonly CountryId[]
}

export interface WorldCountriesDrillSessionLaunch {
  selection: WorldCountriesDrillSelection
  entries: readonly Country[]
  countryIds: readonly CountryId[]
  countryOrder: readonly CountryId[]
  skills?: readonly WorldCountriesRecallSkill[]
  interaction: DrillSessionInteraction
  activity: 'drill' | 'practice'
}

/** Resolve the complete, session-scoped launch snapshot without React state. */
export function resolveDrillSessionLaunch({
  startPreferences,
  activeCountries,
  proficiencySelection,
  interaction = 'recall',
  activity = 'drill',
  skills,
  practiceMode,
  countryIds,
}: ResolveDrillSessionLaunchOptions): WorldCountriesDrillSessionLaunch | null | Promise<WorldCountriesDrillSessionLaunch | null> {
  const normalizedStartSelection = normalizeDrillSelection(startPreferences, activeCountries)
  const selectedSubregions = new Set(normalizedStartSelection.subregionIds)
  const selection: WorldCountriesDrillSelection = {
    continent: normalizedStartSelection.continent,
    subregionIds: getSubregionsForContinentInEffectiveOrder(
      normalizedStartSelection.continent,
      activeCountries,
      getContinentMetadata(normalizedStartSelection.continent),
    ).map(subregion => subregion.id).filter(id => selectedSubregions.has(id)),
  }

  let entries = countryIds
    ? [...new Set(countryIds)]
      .map(countryId => activeCountries.find(country => country.id === countryId))
      .filter((country): country is Country => country !== undefined)
    : getCountriesForDrillSelectionInEffectiveOrder(
      startPreferences,
      activeCountries,
      getContinentMetadata(startPreferences.continent),
      getAllSubregionMetadata(),
    )

  const finish = (resolvedEntries: readonly Country[]): WorldCountriesDrillSessionLaunch | null => {
    if (resolvedEntries.length === 0) return null

    const resolvedCountryIds = resolvedEntries.map(entry => entry.id)
    return {
      selection,
      entries: resolvedEntries,
      countryIds: resolvedCountryIds,
      countryOrder: createDrillCountryOrder(
        resolvedCountryIds,
        getWorldCountriesSessionOrder(activity, startPreferences.order),
      ),
      ...(skills ? { skills: [...skills] } : {}),
      interaction,
      activity,
    }
  }

  if (!countryIds && proficiencySelection.length > 0) {
    const proficiencySkills = skills ?? [...getSkillsForDrillMode(startPreferences.mode)]
    return loadWorldCountriesRecallProgress({
      countryIds: activeCountries.map(country => country.id),
      skills: proficiencySkills,
    }).then(progress => {
      const proficiencyScope = resolveDrillProficiencyScope(
        startPreferences.continent,
        proficiencySelection,
        progress,
        activity === 'practice'
          ? { kind: 'practice', mode: practiceMode ?? (interaction === 'location-click' ? 'locate-countries' : 'capitals') }
          : { kind: 'drill', mode: startPreferences.mode },
        activeCountries,
        getAllSubregionMetadata(),
      )
      return finish(proficiencyScope.countries)
    })
  }

  return finish(entries)
}
