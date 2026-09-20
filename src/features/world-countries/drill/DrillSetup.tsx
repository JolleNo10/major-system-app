import { useEffect, useMemo, useState } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { continentIdFor, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { saveContinentSubregionOrder, saveWorldContinentOrder } from '@/features/world-countries/geography/orderAuthoring'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { loadWorldCountriesRecallProgress, type RecallProgress } from '@/features/world-countries/learning/recallProgress'
import { WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { createWorldCountriesEstablishedLearningReadinessByCountry, getWorldCountriesLearningStateList, isWorldCountriesLearningComplete } from '@/features/world-countries/learning/learningReadiness'
import { createWorldCountriesStatusMapPresentation } from '@/features/world-countries/learning/countryStatusMap'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { WorldCountriesMapHeader } from '@/features/world-countries/ui/WorldCountriesMapHeader'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { TaskDockMessage } from '@/features/world-countries/ui/TaskDockMessage'
import { getDrillSelectionCounts, getDrillSubregions, toggleEntireContinentSelection, toggleDrillSubregion, type DrillSelectionMetadata, type WorldCountriesDrillSelection } from './drillSelection'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getDrillModeDefinition, type WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { DrillSetupRails } from './DrillSetupRails'
import type { WorldCountriesSetupActivity } from './setupActivity'
import { getPracticeModeDefinition, type WorldCountriesPracticeInteraction } from '@/features/world-countries/practice/practiceModes'
import { deriveDrillSetupLaunchState } from './drillSetupScope'
import { resolveDrillProficiencyScope, type WorldCountriesDrillScopeSource, type WorldCountriesProficiencyActivity, type WorldCountriesProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'

const EMPTY_PROFICIENCY_SCOPE: WorldCountriesProficiencyScope = {
  counts: { weak: 0, developing: 0 },
  countryIds: [],
  countries: [],
}

export function DrillSetup({
  level, setupContinent, selection, selectionMetadata, mode, order, activity, practiceInteraction, onPracticeInteractionChange, scopeSource = 'geography', onScopeSourceChange = () => undefined, proficiencySelection = [], learningStates, hoveredGroupId, onHoverGroup, onSelectionChange, onProficiencySelectionChange = () => undefined, onModeChange, onOrderChange, onStart, onWorld, onSelectContinent, onToggleWorld, onExit, onOpenPlayground, entries = countries,
}: {
  level: 'world' | 'continent'
  setupContinent: Continent | null
  selection: WorldCountriesDrillSelection
  selectionMetadata: DrillSelectionMetadata
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  activity: WorldCountriesSetupActivity
  practiceInteraction?: WorldCountriesPracticeInteraction
  onPracticeInteractionChange?: (interaction: WorldCountriesPracticeInteraction) => void
  scopeSource?: WorldCountriesDrillScopeSource
  onScopeSourceChange?: (source: WorldCountriesDrillScopeSource) => void
  proficiencySelection: WorldCountriesProficiencySelection
  learningStates: LearningStates
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onProficiencySelectionChange: (selection: WorldCountriesProficiencySelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleWorld: () => void
  onExit?: () => void
  onOpenPlayground?: () => void
  entries?: readonly Country[]
}) {
  const geographyRevision = useWorldCountriesGeographyRevision()
  const subregions = setupContinent ? getDrillSubregions(setupContinent, entries, selectionMetadata) : []
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)
  const activeCountryKey = [...new Set(entries.map(country => country.id))].sort().join('|')
  const activeCountryIds = useMemo(() => activeCountryKey ? activeCountryKey.split('|') : [], [activeCountryKey])
  const [loadedCountryKey, setLoadedCountryKey] = useState<string | null>(null)
  const currentRecallProgress = loadedCountryKey === activeCountryKey ? recallProgress : null
  const allLearningStates = useMemo(() => getWorldCountriesLearningStateList(learningStates), [learningStates])
  const readinessByCountry = useMemo(
    () => createWorldCountriesEstablishedLearningReadinessByCountry(entries, allLearningStates, currentRecallProgress ?? new Map()),
    [allLearningStates, currentRecallProgress, entries],
  )
  const isDrill = activity.kind === 'drill'
  const proficiencyActivity = useMemo<WorldCountriesProficiencyActivity>(() => activity.kind === 'practice'
    ? { kind: 'practice', mode: activity.mode }
    : { kind: 'drill', mode }, [activity, mode])
  const usesProficiencyScope = scopeSource === 'proficiency'
  const proficiencyScope = useMemo<WorldCountriesProficiencyScope>(() => usesProficiencyScope
    ? resolveDrillProficiencyScope({
      continent: setupContinent,
      selection: proficiencySelection,
      recallProgress: currentRecallProgress ?? new Map(),
      activity: proficiencyActivity,
      entries,
      selectionMetadata,
      readinessByCountry,
    })
    : EMPTY_PROFICIENCY_SCOPE, [currentRecallProgress, entries, proficiencyActivity, proficiencySelection, readinessByCountry, selectionMetadata, setupContinent, usesProficiencyScope])
  const hasProficiencyScope = usesProficiencyScope && proficiencySelection.length > 0
  const [editingOrder, setEditingOrder] = useState<'world' | 'continent' | null>(null)
  const [draftWorldOrder, setDraftWorldOrder] = useState<readonly Continent[] | null>(null)
  const [draftSubregionOrder, setDraftSubregionOrder] = useState<readonly SubregionDefinition[] | null>(null)
  const worldOrder = useMemo(
    () => {
      void geographyRevision
      return draftWorldOrder ?? getContinentsInEffectiveOrder(entries, getWorldMetadata())
    },
    [draftWorldOrder, entries, geographyRevision],
  )
  const subregionOrder = useMemo(
    () => {
      void geographyRevision
      return draftSubregionOrder ?? (setupContinent ? getSubregionsForContinentInEffectiveOrder(setupContinent, entries, getContinentMetadata(setupContinent)) : [])
    },
    [draftSubregionOrder, entries, geographyRevision, setupContinent],
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
  }
  const saveSubregionOrder = (draft: readonly SubregionDefinition[]) => {
    if (!setupContinent) return
    saveContinentSubregionOrder(setupContinent, draft.map(subregion => subregion.id as SubregionId))
    cancelOrderEdit()
  }

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    setLoadedCountryKey(null)
    void loadWorldCountriesRecallProgress({ countryIds: activeCountryIds, skills: [...WORLD_COUNTRIES_RECALL_SKILLS] }).then(progress => {
      if (!active) return
      setRecallProgress(progress)
      setLoadedCountryKey(activeCountryKey)
    })
    return () => { active = false }
  }, [activeCountryIds, activeCountryKey])

  const statusMap = useMemo(() => createWorldCountriesStatusMapPresentation({
    countries: entries,
    readinessByCountry,
    recallProgress: currentRecallProgress ?? new Map(),
  }), [currentRecallProgress, entries, readinessByCountry])
  const launchState = deriveDrillSetupLaunchState({
    scopeSource,
    selection,
    selectionCounts: getDrillSelectionCounts(selection, entries, selectionMetadata),
    proficiencySelection,
    proficiencyScope,
    proficiencyLoading: currentRecallProgress === null,
    entries,
    selectionMetadata,
    worldOrder,
  })
  const activityLabel = isDrill
    ? `Drill · ${getDrillModeDefinition(mode).label}`
    : `Practice · ${getPracticeModeDefinition(activity.mode).label}`
  const startLabel = isDrill ? 'Start Drill' : `Start ${getPracticeModeDefinition(activity.mode).label}`
  const selectGeography = (nextSelection: WorldCountriesDrillSelection) => onSelectionChange(nextSelection)
  const toggleEntireContinent = () => {
    if (!setupContinent) return
    selectGeography(toggleEntireContinentSelection(selection, setupContinent, entries, selectionMetadata))
  }
  const toggleWorldContinent = (continent: Continent) => selectGeography(toggleEntireContinentSelection(selection, continent, entries, selectionMetadata))
  const toggleSubregion = (subregionId: Parameters<typeof toggleDrillSubregion>[1]) => selectGeography(toggleDrillSubregion(selection, subregionId, entries, selectionMetadata))
  const selectProficiency = (nextSelection: WorldCountriesProficiencySelection) => onProficiencySelectionChange(nextSelection)
  return <>
    <DrillSetupRails level={level} setupContinent={setupContinent} selection={selection} selectionMetadata={selectionMetadata} mode={mode} order={order} activity={activity} practiceInteraction={practiceInteraction} onPracticeInteractionChange={onPracticeInteractionChange} scopeSource={scopeSource} onScopeSourceChange={onScopeSourceChange} proficiencySelection={proficiencySelection} proficiencyScope={proficiencyScope} proficiencyLoading={currentRecallProgress === null} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onWorld={onWorld} onSelectContinent={onSelectContinent} onToggleContinent={continent => toggleWorldContinent(continent)} onToggleWorld={onToggleWorld} onToggleSubregion={toggleSubregion} onSelectEntireContinent={toggleEntireContinent} onProficiencySelectionChange={selectProficiency} onModeChange={onModeChange} onOrderChange={onOrderChange} onExit={onExit} entries={entries} worldOrder={worldOrder} subregionOrder={subregionOrder} editingOrder={editingOrder} onBeginOrderEdit={beginOrderEdit} onCancelOrderEdit={cancelOrderEdit} onDraftWorldOrder={setDraftWorldOrder} onDraftSubregionOrder={setDraftSubregionOrder} onSaveWorldOrder={saveWorldOrder} onSaveSubregionOrder={saveSubregionOrder} />
    <MapSurface
      className="animate-fade-in"
      context={(
        <WorldCountriesMapHeader
          headingId="world-countries-drill-heading"
          title={setupContinent ?? 'World'}
          qualifier={activityLabel}
          learningComplete={currentRecallProgress !== null && isWorldCountriesLearningComplete(readinessByCountry, entries.length)}
        />
      )}
      map={(
        <GeographyOverviewMap level={level} continent={level === 'continent' ? setupContinent ?? undefined : undefined} selectedSubregionIds={level === 'continent' ? subregions.map(subregion => subregion.id).filter(id => selection.subregionIds.includes(id)) : undefined} selectedCountryIds={hasProficiencyScope ? proficiencyScope.countryIds : undefined} countryColorsById={statusMap.countryColorsById} countryPatternsById={statusMap.countryPatternsById} countryInnerGlowsById={statusMap.countryInnerGlowsById} countryAccessibleDescriptionsById={statusMap.countryDescriptionsById} hoveredGroupId={hoveredGroupId} onHoverGroup={onHoverGroup} onCountryClick={country => { if (editingOrder) return; if (level === 'world') onSelectContinent(country.continent); else toggleSubregion(country.subregionId) }} ariaLabel={level === 'world' ? 'World map for choosing a Continent' : `${setupContinent ?? 'Continent'} map for choosing Subregions`} />
      )}
      dock={(
        <TaskDockMessage
          enableEnterPrimary
          header="Scope"
          description={launchState.noMatching
            ? <span role="alert" className="text-amber-300">No Countries currently match the selected proficiency.</span>
            : launchState.scopeSummary ?? launchState.disabledButtonLabel}
          actions={<button type="button" data-primary-action disabled={!launchState.canStart} onClick={onStart} className="rounded-[9px] border border-cyan-500 bg-cyan-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">{startLabel}</button>}
        />
      )}
      dockPlacement="attached"
    />
  </>
}
