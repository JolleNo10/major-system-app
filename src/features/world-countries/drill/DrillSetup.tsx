import { useCallback, useEffect, useMemo, useState } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import {
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import {
  getDrillSubregions,
  toggleEntireContinentSelection,
  toggleDrillSubregion,
  type WorldCountriesDrillSelection,
} from './drillSelection'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { createDrillProgressColors, createDrillProgressDescriptions } from './drillProgressPresentation'
import { DrillSetupRails } from './DrillRails'
import { DrillProgressLegend } from './DrillProgressLegend'
import type { GuidedLearningActionId } from './guidedLearning'

export function DrillSetup({
  level,
  selection,
  mode,
  order,
  hoveredGroupId,
  onHoverGroup,
  onSelectionChange,
  onModeChange,
  onOrderChange,
  onStart,
  onPracticeStart = () => undefined,
  onWorld,
  onSelectContinent,
  onGuidedAction = () => undefined,
  entries = countries,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onPracticeStart?: (mode: WorldCountriesDrillMode) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onGuidedAction?: (action: GuidedLearningActionId) => void
  entries?: readonly Country[]
}) {
  const subregions = getDrillSubregions(selection.continent, entries)
  const skills = getSkillsForDrillMode(mode)
  const memoLearningStates = useMemo(() => getAllSubregionLearningStates(entries), [entries])
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({
      countryIds: entries.map(country => country.id),
      skills,
    }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [entries, skills])

  const countryColorsById = useMemo(
    () => recallProgress ? createDrillProgressColors({ mode, scopeCountries: entries, recallProgress, learningStates: memoLearningStates }) : undefined,
    [entries, memoLearningStates, mode, recallProgress],
  )
  const countryAccessibleDescriptionsById = useMemo(
    () => recallProgress ? createDrillProgressDescriptions({ mode, scopeCountries: entries, recallProgress, learningStates: memoLearningStates }) : undefined,
    [entries, memoLearningStates, mode, recallProgress],
  )

  const toggleEntireContinent = useCallback(
    () => onSelectionChange(toggleEntireContinentSelection(selection, entries)),
    [entries, onSelectionChange, selection],
  )
  const toggleSubregion = useCallback((subregionId: Parameters<typeof toggleDrillSubregion>[1]) => {
    onSelectionChange(toggleDrillSubregion(selection, subregionId, entries))
  }, [entries, onSelectionChange, selection])

  return (
    <>
      <DrillSetupRails
        level={level}
        selection={selection}
        mode={mode}
        order={order}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onWorld={onWorld}
        onSelectContinent={onSelectContinent}
        onToggleSubregion={toggleSubregion}
        onSelectEntireContinent={toggleEntireContinent}
        onModeChange={onModeChange}
        onOrderChange={onOrderChange}
        onStart={onStart}
        onPracticeStart={onPracticeStart}
        onGuidedAction={onGuidedAction}
        entries={entries}
      />

      <div className="space-y-3 animate-fade-in">
        {level === 'world' && (
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries Drill</p>
        )}

        {level === 'continent' && (
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries Drill</p>
            <h1 id="world-countries-drill-heading" className="text-2xl font-bold text-zinc-100">
              {selection.continent} Drill
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Choose the Subregions and recall relationship while the map keeps the geographic context in view.
            </p>
          </section>
        )}

        <GeographyOverviewMap
          level={level}
          continent={level === 'continent' ? selection.continent : undefined}
          selectedSubregionIds={level === 'continent' ? selection.subregionIds : undefined}
          countryColorsById={countryColorsById}
          countryAccessibleDescriptionsById={countryAccessibleDescriptionsById}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onCountryClick={country => {
            if (level === 'world') onSelectContinent(country.continent)
            else toggleSubregion(country.subregionId)
          }}
          ariaLabel={level === 'world' ? 'World map for choosing a Continent' : `${selection.continent} map for choosing Drill Subregions`}
        />

        <p className="px-1 text-xs text-zinc-500">
          {level === 'world'
            ? 'Hover a Continent in the rail or map. Select it from either surface to continue.'
            : `Selected ${selection.subregionIds.length} of ${subregions.length} Subregions. Click a Country to toggle its Subregion.`}
        </p>
        <DrillProgressLegend mode={mode} />

      </div>
    </>
  )
}
