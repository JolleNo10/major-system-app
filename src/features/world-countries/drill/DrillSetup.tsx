import { useEffect, useMemo, useState } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { continentIdFor, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { saveContinentSubregionOrder, saveWorldContinentOrder } from '@/features/world-countries/geography/orderAuthoring'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { loadWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { createWorldCountriesLearningReadinessByCountry, createWorldCountriesLearningReadinessColors, getLearningReadinessBySubregionWithDrillEvidence, getWorldCountriesLearningReadinessDescription, getWorldCountriesLearningReadinessLabel, getWorldCountriesLearningStateList, WORLD_COUNTRIES_LEARNING_READINESS_COLORS, WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES, type WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import { getDrillSubregions, toggleEntireContinentSelection, toggleDrillSubregion, type WorldCountriesDrillSelection } from './drillSelection'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { createDrillProgressColors, createDrillProgressDescriptions } from './drillProgressPresentation'
import { DrillProgressLegend } from './DrillProgressLegend'
import { DrillSetupRails } from './DrillSetupRails'
import type { WorldCountriesLearnPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import { getPracticeSkill, resolveDrillProficiencyScope, type WorldCountriesProficiencyActivity, type WorldCountriesProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'

export function DrillSetup({
  level, selection, mode, order, purpose, learnPracticeMode, proficiencySelection = [], learningStates, hoveredGroupId, onHoverGroup, onSelectionChange, onProficiencySelectionChange = () => undefined, onModeChange, onOrderChange, onPurposeChange, onLearnPracticeModeChange, onStart, onLearnPracticeStart, onWorld, onSelectContinent, onGeographyChanged, entries = countries,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  purpose: 'drill' | 'learn-practise' | null
  learnPracticeMode: WorldCountriesLearnPracticeMode
  proficiencySelection: WorldCountriesProficiencySelection
  learningStates: LearningStates
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onProficiencySelectionChange: (selection: WorldCountriesProficiencySelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onPurposeChange: (purpose: 'drill' | 'learn-practise') => void
  onLearnPracticeModeChange: (mode: WorldCountriesLearnPracticeMode) => void
  onStart: () => void
  onLearnPracticeStart: (mode: WorldCountriesLearnPracticeMode) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onGeographyChanged: () => void
  entries?: readonly Country[]
}) {
  const subregions = getDrillSubregions(selection.continent, entries)
  const skills = getSkillsForDrillMode(mode)
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)
  const allLearningStates = useMemo(() => getWorldCountriesLearningStateList(learningStates), [learningStates])
  const readinessColors = useMemo(() => createWorldCountriesLearningReadinessColors(entries, allLearningStates), [allLearningStates, entries])
  const readinessByCountry = useMemo(() => createWorldCountriesLearningReadinessByCountry(entries, allLearningStates), [allLearningStates, entries])
  const isDrill = purpose === 'drill'
  const proficiencyActivity = useMemo<WorldCountriesProficiencyActivity>(() => purpose === 'learn-practise' && learnPracticeMode !== 'learn-countries' && learnPracticeMode !== 'learn-capitals'
    ? { kind: 'practice', mode: learnPracticeMode }
    : { kind: 'drill', mode }, [learnPracticeMode, mode, purpose])
  const proficiencyScope = useMemo<WorldCountriesProficiencyScope>(() => resolveDrillProficiencyScope(
    selection.continent,
    proficiencySelection,
    recallProgress ?? new Map(),
    proficiencyActivity,
    entries,
    getAllSubregionMetadata(),
  ), [entries, proficiencyActivity, proficiencySelection, recallProgress, selection.continent])
  const hasProficiencyScope = proficiencySelection.length > 0
  const [orderVersion, setOrderVersion] = useState(0)
  const [editingOrder, setEditingOrder] = useState<'world' | 'continent' | null>(null)
  const [draftWorldOrder, setDraftWorldOrder] = useState<readonly Continent[] | null>(null)
  const [draftSubregionOrder, setDraftSubregionOrder] = useState<readonly SubregionDefinition[] | null>(null)
  const worldOrder = useMemo(
    () => draftWorldOrder ?? getContinentsInEffectiveOrder(entries, getWorldMetadata()),
    [draftWorldOrder, entries, orderVersion],
  )
  const subregionOrder = useMemo(
    () => draftSubregionOrder ?? getSubregionsForContinentInEffectiveOrder(selection.continent, entries, getContinentMetadata(selection.continent)),
    [draftSubregionOrder, entries, orderVersion, selection.continent],
  )

  const beginOrderEdit = (target: 'world' | 'continent') => {
    setEditingOrder(target)
    if (target === 'world') setDraftWorldOrder([...worldOrder])
    else setDraftSubregionOrder([...subregionOrder])
  }
  const cancelOrderEdit = () => {
    setEditingOrder(null)
    setDraftWorldOrder(null)
    setDraftSubregionOrder(null)
  }
  const saveWorldOrder = (draft: readonly Continent[]) => {
    const ids = draft.map(continent => continentIdFor(continent)).filter((id): id is NonNullable<typeof id> => id !== undefined)
    saveWorldContinentOrder(ids)
    cancelOrderEdit()
    setOrderVersion(version => version + 1)
    onGeographyChanged()
  }
  const saveSubregionOrder = (draft: readonly SubregionDefinition[]) => {
    saveContinentSubregionOrder(selection.continent, draft.map(subregion => subregion.id as SubregionId))
    cancelOrderEdit()
    setOrderVersion(version => version + 1)
    onGeographyChanged()
  }

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    const progressSkills = isDrill
      ? skills
      : purpose === 'learn-practise' && learnPracticeMode !== 'learn-countries' && learnPracticeMode !== 'learn-capitals'
        ? [...new Set(['location-to-country' as const, getPracticeSkill(learnPracticeMode)])]
        : purpose === 'learn-practise'
          ? [...new Set(['location-to-country' as const, ...skills])]
          : skills
    void loadWorldCountriesRecallProgress({ countryIds: entries.map(country => country.id), skills: progressSkills }).then(progress => { if (active) setRecallProgress(progress) })
    return () => { active = false }
  }, [entries, isDrill, learnPracticeMode, level, purpose, skills])

  const readinessBySubregion = useMemo(
    () => purpose === 'learn-practise' && recallProgress
      ? getLearningReadinessBySubregionWithDrillEvidence(entries, allLearningStates, recallProgress)
      : undefined,
    [allLearningStates, entries, purpose, recallProgress],
  )
  const effectiveReadinessByCountry = useMemo(() => new Map(entries.map(country => [
    country.id,
    readinessBySubregion?.get(country.subregionId) ?? readinessByCountry.get(country.id) ?? 'NOT_LEARNED',
  ] as const)), [entries, readinessByCountry, readinessBySubregion])

  const countryColorsById = useMemo(() => isDrill && recallProgress
    ? createDrillProgressColors({ mode, scopeCountries: entries, recallProgress, learningStates: allLearningStates })
    : readinessBySubregion
      ? new Map(entries.map(country => [country.id, WORLD_COUNTRIES_LEARNING_READINESS_COLORS[effectiveReadinessByCountry.get(country.id) ?? 'NOT_LEARNED']] as const))
      : readinessColors, [allLearningStates, effectiveReadinessByCountry, entries, isDrill, mode, readinessBySubregion, readinessColors, recallProgress])
  const countryAccessibleDescriptionsById = useMemo(() => {
    if (isDrill && recallProgress) return createDrillProgressDescriptions({ mode, scopeCountries: entries, recallProgress, learningStates: allLearningStates })
    return new Map([...effectiveReadinessByCountry.entries()].map(([countryId, readiness]) => [countryId, `${getWorldCountriesLearningReadinessLabel(readiness)}. ${getWorldCountriesLearningReadinessDescription(readiness)}`] as const))
  }, [allLearningStates, effectiveReadinessByCountry, entries, isDrill, mode, recallProgress])
  const selectGeography = (nextSelection: WorldCountriesDrillSelection) => {
    onProficiencySelectionChange([])
    onSelectionChange(nextSelection)
  }
  const toggleEntireContinent = () => selectGeography(toggleEntireContinentSelection(selection, entries))
  const toggleSubregion = (subregionId: Parameters<typeof toggleDrillSubregion>[1]) => selectGeography(toggleDrillSubregion(selection, subregionId, entries))
  const selectProficiency = (nextSelection: WorldCountriesProficiencySelection) => {
    onSelectionChange({ ...selection, subregionIds: [] })
    onProficiencySelectionChange(nextSelection)
  }
  return <>
    <DrillSetupRails level={level} selection={selection} mode={mode} order={order} purpose={purpose} learnPracticeMode={learnPracticeMode} proficiencySelection={proficiencySelection} proficiencyScope={proficiencyScope} proficiencyLoading={recallProgress === null} learningStates={allLearningStates} learningReadinessBySubregion={readinessBySubregion} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onWorld={onWorld} onSelectContinent={onSelectContinent} onToggleSubregion={toggleSubregion} onSelectEntireContinent={toggleEntireContinent} onProficiencySelectionChange={selectProficiency} onModeChange={onModeChange} onOrderChange={onOrderChange} onStart={onStart} onPurposeChange={onPurposeChange} onLearnPracticeModeChange={onLearnPracticeModeChange} onLearnPracticeStart={onLearnPracticeStart} entries={entries} worldOrder={worldOrder} subregionOrder={subregionOrder} editingOrder={editingOrder} onBeginOrderEdit={beginOrderEdit} onCancelOrderEdit={cancelOrderEdit} onDraftWorldOrder={setDraftWorldOrder} onDraftSubregionOrder={setDraftSubregionOrder} onSaveWorldOrder={saveWorldOrder} onSaveSubregionOrder={saveSubregionOrder} />
    <div className="space-y-3 animate-fade-in">
      {level === 'world' ? <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p> : <section className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p><h1 id="world-countries-drill-heading" className="text-2xl font-bold text-zinc-100">{selection.continent}</h1><p className="text-sm leading-relaxed text-zinc-400">Choose an activity purpose and keep geographic context in view.</p></section>}
      <GeographyOverviewMap level={level} continent={level === 'continent' ? selection.continent : undefined} selectedSubregionIds={level === 'continent' ? selection.subregionIds : undefined} selectedCountryIds={level === 'continent' && hasProficiencyScope ? proficiencyScope.countryIds : undefined} countryColorsById={countryColorsById} countryAccessibleDescriptionsById={countryAccessibleDescriptionsById} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onCountryClick={country => { if (editingOrder) return; if (level === 'world') onSelectContinent(country.continent); else toggleSubregion(country.subregionId) }} ariaLabel={level === 'world' ? 'World map for choosing a Continent' : `${selection.continent} map for choosing Subregions`} />
      <p className="px-1 text-xs text-zinc-500">{level === 'world' ? 'Select a Continent from the rail or map.' : hasProficiencyScope ? `${proficiencyScope.countryIds.length} Countries selected by proficiency. Click a Country to switch to Geography.` : `Selected ${selection.subregionIds.length} of ${subregions.length} Subregions. Click a Country to toggle its Subregion.`}</p>
      <p className="px-1 text-xs text-zinc-500">Country order can be edited from Learn Countries when a Subregion Country list is visible.</p>
      {isDrill ? <DrillProgressLegend mode={mode} /> : <ProgressMapLegend title="Learning Readiness" entries={WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES} explanation="Learning Readiness shows durable Learning milestones. Practice does not change it." mapCues="Map cues: a neutral outline is temporary hover or navigation focus, not Learning Readiness." ariaLabel="Learning Readiness legend" collapsibleDetails />}
    </div>
  </>
}
