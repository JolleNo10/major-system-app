import { useEffect, useMemo, useState } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { loadWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { createWorldCountriesLearningReadinessByCountry, createWorldCountriesLearningReadinessColors, getWorldCountriesLearningReadinessDescription, getWorldCountriesLearningReadinessLabel, getWorldCountriesLearningStateList, WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES, type WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import type { WorldCountriesSetupContext } from '@/features/world-countries/setup/WorldCountriesSetup'
import { getDrillSubregions, toggleEntireContinentSelection, toggleDrillSubregion, type WorldCountriesDrillSelection } from './drillSelection'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { createDrillProgressColors, createDrillProgressDescriptions } from './drillProgressPresentation'
import { DrillProgressLegend } from './DrillProgressLegend'
import { DrillSetupRails } from './DrillSetupRails'
import type { WorldCountriesLearnPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'

export function DrillSetup({
  level, selection, mode, order, purpose, learnPracticeMode, learningStates, hoveredGroupId, onHoverGroup, onSelectionChange, onModeChange, onOrderChange, onPurposeChange, onLearnPracticeModeChange, onStart, onLearnPracticeStart, onOpenSetup, onWorld, onSelectContinent, entries = countries,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  purpose: 'drill' | 'learn-practise'
  learnPracticeMode: WorldCountriesLearnPracticeMode
  learningStates: LearningStates
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onPurposeChange: (purpose: 'drill' | 'learn-practise') => void
  onLearnPracticeModeChange: (mode: WorldCountriesLearnPracticeMode) => void
  onStart: () => void
  onLearnPracticeStart: (mode: WorldCountriesLearnPracticeMode) => void
  onOpenSetup?: () => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  entries?: readonly Country[]
}) {
  const subregions = getDrillSubregions(selection.continent, entries)
  const skills = getSkillsForDrillMode(mode)
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)
  const allLearningStates = useMemo(() => getWorldCountriesLearningStateList(learningStates), [learningStates])
  const readinessColors = useMemo(() => createWorldCountriesLearningReadinessColors(entries, allLearningStates), [allLearningStates, entries])
  const readinessByCountry = useMemo(() => createWorldCountriesLearningReadinessByCountry(entries, allLearningStates), [allLearningStates, entries])
  const isDrill = purpose === 'drill'

  useEffect(() => {
    if (!isDrill) { setRecallProgress(null); return }
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({ countryIds: entries.map(country => country.id), skills }).then(progress => { if (active) setRecallProgress(progress) })
    return () => { active = false }
  }, [entries, isDrill, skills])

  const countryColorsById = useMemo(() => isDrill && recallProgress ? createDrillProgressColors({ mode, scopeCountries: entries, recallProgress, learningStates: allLearningStates }) : readinessColors, [allLearningStates, entries, isDrill, mode, readinessColors, recallProgress])
  const countryAccessibleDescriptionsById = useMemo(() => {
    if (isDrill && recallProgress) return createDrillProgressDescriptions({ mode, scopeCountries: entries, recallProgress, learningStates: allLearningStates })
    return new Map([...readinessByCountry.entries()].map(([countryId, readiness]) => [countryId, `${getWorldCountriesLearningReadinessLabel(readiness)}. ${getWorldCountriesLearningReadinessDescription(readiness)}`] as const))
  }, [allLearningStates, entries, isDrill, mode, readinessByCountry, recallProgress])
  const toggleEntireContinent = () => onSelectionChange(toggleEntireContinentSelection(selection, entries))
  const toggleSubregion = (subregionId: Parameters<typeof toggleDrillSubregion>[1]) => onSelectionChange(toggleDrillSubregion(selection, subregionId, entries))

  return <>
    <DrillSetupRails level={level} selection={selection} mode={mode} order={order} purpose={purpose} learnPracticeMode={learnPracticeMode} learningStates={allLearningStates} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onWorld={onWorld} onSelectContinent={onSelectContinent} onToggleSubregion={toggleSubregion} onSelectEntireContinent={toggleEntireContinent} onModeChange={onModeChange} onOrderChange={onOrderChange} onStart={onStart} onPurposeChange={onPurposeChange} onLearnPracticeModeChange={onLearnPracticeModeChange} onLearnPracticeStart={onLearnPracticeStart} onOpenSetup={onOpenSetup} entries={entries} />
    <div className="space-y-3 animate-fade-in">
      {level === 'world' ? <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p> : <section className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p><h1 id="world-countries-drill-heading" className="text-2xl font-bold text-zinc-100">{selection.continent}</h1><p className="text-sm leading-relaxed text-zinc-400">Choose an activity purpose and keep geographic context in view.</p></section>}
      <GeographyOverviewMap level={level} continent={level === 'continent' ? selection.continent : undefined} selectedSubregionIds={level === 'continent' ? selection.subregionIds : undefined} countryColorsById={countryColorsById} countryAccessibleDescriptionsById={countryAccessibleDescriptionsById} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onCountryClick={country => level === 'world' ? onSelectContinent(country.continent) : toggleSubregion(country.subregionId)} ariaLabel={level === 'world' ? 'World map for choosing a Continent' : `${selection.continent} map for choosing Subregions`} />
      <p className="px-1 text-xs text-zinc-500">{level === 'world' ? 'Select a Continent from the rail or map.' : `Selected ${selection.subregionIds.length} of ${subregions.length} Subregions. Click a Country to toggle its Subregion.`}</p>
      {isDrill ? <DrillProgressLegend mode={mode} /> : <ProgressMapLegend title="Learning Readiness" entries={WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES} explanation="Learning Readiness shows durable Learning milestones. Practice does not change it." mapCues="Map cues: a neutral outline is temporary hover or navigation focus, not Learning Readiness." ariaLabel="Learning Readiness legend" collapsibleDetails />}
    </div>
  </>
}
