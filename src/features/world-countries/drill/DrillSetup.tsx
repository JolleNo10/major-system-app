import { useCallback, useEffect, useMemo, useState } from 'react'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import {
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import {
  getDrillSubregions,
  toggleEntireContinentSelection,
  toggleDrillSubregion,
  type WorldCountriesDrillSelection,
} from './drillSelection'
import { getDrillModeDefinition, getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import { createDrillProgressColors } from './drillProgressPresentation'
import { DrillSetupRails } from './DrillRails'
import { DrillProgressLegend } from './DrillProgressLegend'

export function DrillSetup({
  level,
  selection,
  mode,
  hoveredGroupId,
  onHoverGroup,
  onSelectionChange,
  onModeChange,
  onStart,
  onWorld,
  onSelectContinent,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onStart: () => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
}) {
  const subregions = getDrillSubregions(selection.continent)
  const skills = getSkillsForDrillMode(mode)
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({
      countryIds: countries.map(country => country.id),
      skills,
    }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [skills])

  const countryColorsById = useMemo(
    () => recallProgress ? createDrillProgressColors(mode, countries, recallProgress) : undefined,
    [mode, recallProgress],
  )

  const toggleEntireContinent = useCallback(
    () => onSelectionChange(toggleEntireContinentSelection(selection)),
    [onSelectionChange, selection],
  )
  const toggleSubregion = useCallback((subregionId: Parameters<typeof toggleDrillSubregion>[1]) => {
    onSelectionChange(toggleDrillSubregion(selection, subregionId))
  }, [onSelectionChange, selection])

  return (
    <>
      <DrillSetupRails
        level={level}
        selection={selection}
        mode={mode}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onWorld={onWorld}
        onSelectContinent={onSelectContinent}
        onToggleSubregion={toggleSubregion}
        onSelectEntireContinent={toggleEntireContinent}
        onModeChange={onModeChange}
      />

      <div className="space-y-3 animate-fade-in">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries Drill</p>
          <h1 id="world-countries-drill-heading" className="text-2xl font-bold text-zinc-100">
            {level === 'world' ? 'Choose a Continent' : `${selection.continent} Drill`}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            {level === 'world'
              ? 'Use the World map to stay oriented, then choose the geographic root for your practice.'
              : 'Choose the Subregions and recall relationship while the map keeps the geographic context in view.'}
          </p>
        </section>

        <GeographyOverviewMap
          level={level}
          continent={level === 'continent' ? selection.continent : undefined}
          selectedSubregionIds={level === 'continent' ? selection.subregionIds : undefined}
          countryColorsById={countryColorsById}
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

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="world-countries-current-drill-heading">
          <h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Current drill
          </h2>
          <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-zinc-500">{level === 'world' ? 'Geography' : 'Scope'}</span>
            <span className="text-right font-semibold text-zinc-200">
              {level === 'world'
                ? 'Choose a Continent'
                : `${selection.subregionIds.length} ${selection.subregionIds.length === 1 ? 'Subregion' : 'Subregions'} selected`}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-zinc-500">Recall mode</span>
            <span className="text-right font-semibold text-violet-200">{getDrillModeDefinition(mode).label}</span>
          </div>
          <button
            type="button"
            disabled={level !== 'continent' || selection.subregionIds.length === 0}
            onClick={onStart}
            className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {level === 'world' ? 'Choose a Continent first' : 'Start Drill'}
          </button>
        </section>
      </div>
    </>
  )
}
