import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { readWorldCountriesGeography } from '@/features/world-countries/geography/worldScope'
import { clearSubregionScope, getCountriesForSubregionScopeInEffectiveOrder, getSubregionScopeLabel, normalizeSubregionScope, selectAllSubregions, toggleContinentInScope, toggleSubregionInScope } from '@/features/world-countries/geography/subregionScope'
import type { SvgMapLoadState } from '@/features/world-countries/maps/SvgMapView'
import type { WorldCountriesTypedAnswerEvaluation } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import {
  continueReciteSession,
  createReciteSession,
  getReciteCountryOutcomes,
  revealReciteAnswer,
  submitReciteAnswer,
  type ReciteCountryOutcome,
  type ReciteMode,
} from './reciteSession'
import {
  loadWorldCountriesReciteProgress,
  saveCompletedReciteRun,
  type WorldCountriesReciteProgress,
} from './reciteProgress'
import { ReciteSession, type ActiveReciteRun } from './ReciteSessionView'
import { ReciteSessionRails } from './ReciteSessionRails'
import { ReciteSetup } from './ReciteSetup'
import type { ReciteMapAssistance } from './recitePresentation'

type RecitePhase = 'setup' | 'session' | 'complete'

export function WorldCountriesRecite({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const geographyRevision = useWorldCountriesGeographyRevision()
  const [phase, setPhase] = useState<RecitePhase>('setup')
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(null)
  const [selectedSubregionIds, setSelectedSubregionIds] = useState<readonly SubregionId[]>([])
  const [mode, setMode] = useState<ReciteMode>('countries')
  const [assistance, setAssistance] = useState<ReciteMapAssistance>('visible')
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [mapState, setMapState] = useState<SvgMapLoadState>('loading')
  const [readyMapKey, setReadyMapKey] = useState<string | null>(null)
  const [progress, setProgress] = useState<WorldCountriesReciteProgress>(() => loadWorldCountriesReciteProgress())
  const [run, setRun] = useState<ActiveReciteRun | null>(null)

  const geography = useMemo(() => {
    void geographyRevision
    return readWorldCountriesGeography(activeCountries)
  }, [activeCountries, geographyRevision])
  const { worldOrder, metadata: selectionMetadata } = geography
  const normalizedSelection = useMemo(
    () => normalizeSubregionScope({ subregionIds: selectedSubregionIds }, activeCountries, selectionMetadata),
    [activeCountries, selectedSubregionIds, selectionMetadata],
  )
  const selectedScopeSubregionIds = normalizedSelection.subregionIds
  const continentMetadata = useMemo(() => {
    void geographyRevision
    return selectedContinent ? getContinentMetadata(selectedContinent) : null
  }, [geographyRevision, selectedContinent])
  const subregions = useMemo(() => {
    void geographyRevision
    return selectedContinent
      ? getSubregionsForContinentInEffectiveOrder(selectedContinent, activeCountries, continentMetadata)
      : []
  }, [activeCountries, continentMetadata, geographyRevision, selectedContinent])
  const setupScopeCountries = useMemo(
    () => getCountriesForSubregionScopeInEffectiveOrder(normalizedSelection, activeCountries, selectionMetadata),
    [activeCountries, normalizedSelection, selectionMetadata],
  )
  const mapKey = selectedContinent ?? 'world'
  const mapReady = readyMapKey === mapKey && mapState === 'ready'

  const handleMapStateChange = useCallback((nextState: SvgMapLoadState) => {
    setMapState(nextState)
    if (nextState === 'ready') setReadyMapKey(mapKey)
    else setReadyMapKey(current => current === mapKey ? null : current)
  }, [mapKey])

  const selectContinent = useCallback((continent: Continent) => {
    setSelectedContinent(continent)
    setHoveredGroupId(null)
  }, [])

  const goToWorld = useCallback(() => {
    setSelectedContinent(null)
    setHoveredGroupId(null)
  }, [])

  const toggleSubregion = useCallback((subregionId: SubregionId) => {
    if (!selectedContinent) return
    setSelectedSubregionIds(toggleSubregionInScope(normalizedSelection, subregionId, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectedContinent, selectionMetadata])

  const toggleEntireContinent = useCallback(() => {
    if (!selectedContinent) return
    setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, selectedContinent, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectedContinent, selectionMetadata])

  const toggleWorldContinent = useCallback((continent: Continent) => {
    setSelectedSubregionIds(toggleContinentInScope(normalizedSelection, continent, activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, normalizedSelection, selectionMetadata])

  const selectAllWorld = useCallback(() => {
    setSelectedSubregionIds(selectAllSubregions(activeCountries, selectionMetadata).subregionIds)
  }, [activeCountries, selectionMetadata])

  const clearWorld = useCallback(() => {
    setSelectedSubregionIds(clearSubregionScope().subregionIds)
  }, [])

  const startRecite = useCallback(() => {
    if (setupScopeCountries.length === 0 || !mapReady) return
    const sessionCountries = setupScopeCountries.map(country => ({
      id: country.id,
      country: country.country,
      capital: country.capital,
    }))
    setRun({
      subregionIds: selectedScopeSubregionIds,
      scopeLabel: getSubregionScopeLabel(normalizedSelection, activeCountries, selectionMetadata),
      mode,
      assistance,
      population: [...activeCountries],
      scopeCountries: [...setupScopeCountries],
      session: createReciteSession(mode, sessionCountries),
    })
    setPhase('session')
    setHoveredGroupId(null)
  }, [activeCountries, assistance, mapReady, mode, normalizedSelection, selectedScopeSubregionIds, selectionMetadata, setupScopeCountries])

  const submitAnswer = useCallback((evaluation: WorldCountriesTypedAnswerEvaluation) => {
    if (!run) return
    setRun({ ...run, session: submitReciteAnswer(run.session, evaluation.outcome !== 'incorrect') })
  }, [run])

  const revealAnswer = useCallback(() => {
    if (!run) return
    setRun({ ...run, session: revealReciteAnswer(run.session) })
  }, [run])

  const continueSession = useCallback(() => {
    if (!run) return
    const session = continueReciteSession(run.session)
    setRun({ ...run, session })
    if (session.phase !== 'complete') return
    const outcomes = getReciteCountryOutcomes(session)
    if (outcomes.some(outcome => outcome === null)) return
    const completedOutcomes = outcomes.map((outcome, index) => ({
      countryId: run.scopeCountries[index]?.id ?? session.countries[index].id,
      outcome: outcome as ReciteCountryOutcome,
    }))
    setProgress(saveCompletedReciteRun(run.mode, completedOutcomes))
    setPhase('complete')
  }, [run])

  const backToSetup = useCallback(() => {
    setRun(null)
    setPhase('setup')
  }, [])

  const reciteAgain = useCallback(() => {
    if (!run) return
    setRun({
      ...run,
      session: createReciteSession(run.mode, run.session.countries),
    })
    setPhase('session')
  }, [run])

  if (phase === 'setup') {
    return (
      <ReciteSetup
        activeCountries={activeCountries}
        selectedContinent={selectedContinent}
        selectedScopeSubregionIds={selectedScopeSubregionIds}
        setupScopeCountries={setupScopeCountries}
        selection={normalizedSelection}
        selectionMetadata={selectionMetadata}
        worldOrder={worldOrder}
        subregions={subregions}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={setHoveredGroupId}
        onWorld={goToWorld}
        onSelectContinent={selectContinent}
        onToggleContinent={toggleWorldContinent}
        onSelectAllWorld={selectAllWorld}
        onClearWorld={clearWorld}
        onToggleSubregion={toggleSubregion}
        onSelectEntireContinent={toggleEntireContinent}
        onMapStateChange={handleMapStateChange}
        mode={mode}
        assistance={assistance}
        onModeChange={setMode}
        onAssistanceChange={setAssistance}
        canStart={Boolean(setupScopeCountries.length > 0 && mapReady)}
        mapState={mapState}
        onStart={startRecite}
        progress={progress}
      />
    )
  }

  if (!run) return null
  return (
    <>
      <ReciteSessionRails run={run} phase={phase} onExit={backToSetup} />
      <ReciteSession
        run={run}
        phase={phase}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onSubmit={submitAnswer}
        onReveal={revealAnswer}
        onContinue={continueSession}
        onReciteAgain={reciteAgain}
        onBackToSetup={backToSetup}
      />
    </>
  )
}
