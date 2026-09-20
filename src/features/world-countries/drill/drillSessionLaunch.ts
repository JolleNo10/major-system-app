import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getAllContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { loadWorldCountriesRecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'
import { createDrillCountryOrder, getWorldCountriesSessionOrder } from './drillOrder'
import { getSkillsForDrillMode } from './drillModes'
import { getCountriesForDrillSelectionInEffectiveOrder, getDrillSelectionScopeLabel, normalizeDrillSelection, type DrillSelectionMetadata, type WorldCountriesDrillSelection } from './drillSelection'
import { resolveDrillProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'
import type { PracticeSessionInteraction } from '@/features/world-countries/practice/PracticeSession'
import type { WorldCountriesDrillPreferences } from './drillPreferences'

export interface ResolveDrillSessionLaunchOptions {
  startPreferences: WorldCountriesDrillPreferences
  activeCountries: readonly Country[]
  proficiencySelection: WorldCountriesProficiencySelection
  interaction?: PracticeSessionInteraction
  activity?: 'drill' | 'practice'
  skills?: readonly WorldCountriesRecallSkill[]
  practiceMode?: WorldCountriesPracticeMode
  /** A transient Country subset for a retry; it never changes preferences. */
  countryIds?: readonly CountryId[]
  /** The open setup Continent, or null when proficiency searches the whole World. */
  proficiencyContinent?: Continent | null
  /** Effective geography metadata captured by the setup coordinator. */
  selectionMetadata?: DrillSelectionMetadata
}

export interface WorldCountriesDrillSessionLaunch {
  selection: WorldCountriesDrillSelection
  scopeLabel: string
  entries: readonly Country[]
  countryIds: readonly CountryId[]
  countryOrder: readonly CountryId[]
  skills?: readonly WorldCountriesRecallSkill[]
  interaction: PracticeSessionInteraction
  activity: 'drill' | 'practice'
  practiceMode?: WorldCountriesPracticeMode
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
  proficiencyContinent = null,
  selectionMetadata = {
    world: getWorldMetadata(),
    continents: getAllContinentMetadata(),
    subregions: getAllSubregionMetadata(),
  },
}: ResolveDrillSessionLaunchOptions): WorldCountriesDrillSessionLaunch | null | Promise<WorldCountriesDrillSessionLaunch | null> {
  if (activity === 'practice' && !practiceMode) return null

  const normalizedStartSelection = normalizeDrillSelection(startPreferences, activeCountries, selectionMetadata)
  const selection: WorldCountriesDrillSelection = normalizedStartSelection

  let entries = countryIds
    ? [...new Set(countryIds)]
      .map(countryId => activeCountries.find(country => country.id === countryId))
      .filter((country): country is Country => country !== undefined)
    : getCountriesForDrillSelectionInEffectiveOrder(
      startPreferences,
      activeCountries,
      selectionMetadata,
    )

  const finish = (resolvedEntries: readonly Country[]): WorldCountriesDrillSessionLaunch | null => {
    if (resolvedEntries.length === 0) return null

    const resolvedCountryIds = resolvedEntries.map(entry => entry.id)
    return {
      selection,
      scopeLabel: proficiencySelection.length > 0
        ? proficiencyContinent ?? 'World'
        : getDrillSelectionScopeLabel(selection, activeCountries),
      entries: resolvedEntries,
      countryIds: resolvedCountryIds,
      countryOrder: createDrillCountryOrder(
        resolvedCountryIds,
        getWorldCountriesSessionOrder(activity, startPreferences.order),
      ),
      ...(skills ? { skills: [...skills] } : {}),
      interaction,
      activity,
      ...(practiceMode ? { practiceMode } : {}),
    }
  }

  if (!countryIds && proficiencySelection.length > 0) {
    const proficiencySkills = skills ?? [...getSkillsForDrillMode(startPreferences.mode)]
    return loadWorldCountriesRecallProgress({
      countryIds: activeCountries.map(country => country.id),
      skills: proficiencySkills,
    }).then(progress => {
      const proficiencyScope = resolveDrillProficiencyScope({
        continent: proficiencyContinent,
        selection: proficiencySelection,
        recallProgress: progress,
        activity: activity === 'practice'
          ? { kind: 'practice', mode: practiceMode ?? (interaction === 'location-click' ? 'locate-countries' : 'capitals') }
          : { kind: 'drill', mode: startPreferences.mode },
        entries: activeCountries,
        selectionMetadata,
      })
      return finish(proficiencyScope.countries)
    })
  }

  return finish(entries)
}
