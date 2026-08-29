import { useCallback, useId, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useRails } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition, type SubregionDefinition } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getAllContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentsInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { clearSubregionScope, getCountriesForSubregionScopeInEffectiveOrder, getSubregionScopeLabel, normalizeSubregionScope, selectAllSubregions, toggleContinentInScope, toggleSubregionInScope, type WorldCountriesSubregionScopeMetadata } from '@/features/world-countries/geography/subregionScope'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import type { SvgMapLoadState } from '@/features/world-countries/maps/SvgMapView'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import {
  continueReciteSession,
  createReciteSession,
  getCurrentRecitePrompt,
  getReciteCountryOutcomes,
  getReciteResolvedCountryIds,
  revealReciteAnswer,
  submitReciteAnswer,
  type ReciteCountryOutcome,
  type ReciteMode,
  type RecitePromptView,
  type ReciteSessionState,
} from './reciteSession'
import {
  loadWorldCountriesReciteProgress,
  saveCompletedReciteRun,
  type WorldCountriesReciteProgress,
} from './reciteProgress'
import {
  createReciteActiveCountryColors,
  createReciteSetupCountryColors,
  createReciteSetupCountryDescriptions,
  getReciteStatusDescription,
  RECITE_STATUS_COLORS,
  type ReciteStatus,
} from './recitePresentation'

type RecitePhase = 'setup' | 'session' | 'complete'
type ReciteMapAssistance = 'visible' | 'reveal'

interface ActiveReciteRun {
  subregionIds: readonly SubregionId[]
  scopeLabel: string
  mode: ReciteMode
  assistance: ReciteMapAssistance
  population: readonly Country[]
  scopeCountries: readonly Country[]
  session: ReciteSessionState
}

const RECITE_MODE_DEFINITIONS: readonly {
  id: ReciteMode
  label: string
  description: string
}[] = [
  { id: 'countries', label: 'Countries', description: 'Recall each Country name in authored geographic order.' },
  { id: 'countries-capitals', label: 'Countries + Capitals', description: 'Recall each Country, then its Capital, before advancing.' },
  { id: 'countries-from-capitals', label: 'Countries from Capitals', description: 'Use each Capital as a cue to recall the Country.' },
]

const RECITE_ASSISTANCE_DEFINITIONS: readonly {
  id: ReciteMapAssistance
  label: string
  description: string
}[] = [
  { id: 'visible', label: 'Visible', description: 'Keep Country geography visible without names or status history.' },
  { id: 'reveal', label: 'Reveal as you go', description: 'Reveal each Country only after its Country prompt is resolved.' },
]

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

  const worldOrder = useMemo(() => {
    void geographyRevision
    return getContinentsInEffectiveOrder(activeCountries, getWorldMetadata())
  }, [activeCountries, geographyRevision])
  const selectionMetadata = useMemo<WorldCountriesSubregionScopeMetadata>(() => {
    void geographyRevision
    return {
      world: getWorldMetadata(),
      continents: getAllContinentMetadata(),
      subregions: getAllSubregionMetadata(),
    }
  }, [geographyRevision])
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
  const setupColors = useMemo(
    () => createReciteSetupCountryColors(
      selectedContinent ? activeCountries.filter(country => country.continent === selectedContinent) : activeCountries,
      selectedContinent ? setupScopeCountries.map(country => country.id) : undefined,
      mode,
      progress,
    ),
    [activeCountries, mode, progress, selectedContinent, setupScopeCountries],
  )
  const setupDescriptions = useMemo(
    () => createReciteSetupCountryDescriptions(
      selectedContinent ? activeCountries.filter(country => country.continent === selectedContinent) : activeCountries,
      selectedContinent ? setupScopeCountries.map(country => country.id) : undefined,
      mode,
      progress,
    ),
    [activeCountries, mode, progress, selectedContinent, setupScopeCountries],
  )

  const handleMapStateChange = (nextState: SvgMapLoadState) => {
    setMapState(nextState)
    if (nextState === 'ready') setReadyMapKey(mapKey)
    else setReadyMapKey(current => current === mapKey ? null : current)
  }

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

  const submitAnswer = (evaluation: WorldCountriesTypedAnswerEvaluation) => {
    if (!run) return
    setRun({ ...run, session: submitReciteAnswer(run.session, evaluation.outcome !== 'incorrect') })
  }

  const revealAnswer = () => {
    if (!run) return
    setRun({ ...run, session: revealReciteAnswer(run.session) })
  }

  const continueSession = () => {
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
  }

  const backToSetup = () => {
    setRun(null)
    setPhase('setup')
  }

  const reciteAgain = () => {
    if (!run) return
    setRun({
      ...run,
      session: createReciteSession(run.mode, run.session.countries),
    })
    setPhase('session')
  }

  const currentPrompt = run && phase === 'session' ? getCurrentRecitePrompt(run.session) : null
  const currentCountry = currentPrompt ? run?.scopeCountries.find(country => country.id === currentPrompt.countryId) : undefined
  const runContinents = run ? [...new Set(run.scopeCountries.map(country => country.continent))] : []
  const activeContinent = currentCountry?.continent ?? (phase === 'complete' && runContinents.length === 1 ? runContinents[0] : undefined)
  const activeCountryColors = run
    ? createReciteActiveCountryColors(
      activeContinent ? run.population.filter(country => country.continent === activeContinent) : run.population,
      run.session.countries.map(country => country.id),
      new Map(run.session.countries.map((country, index) => [country.id, getReciteCountryOutcomes(run.session)[index] ?? null] as const)),
    )
    : new Map<CountryId, string>()
  const hiddenCountryIds = run && run.assistance === 'reveal' && phase === 'session'
    ? run.session.countries
      .filter(country => !activeContinent || run.scopeCountries.find(entry => entry.id === country.id)?.continent === activeContinent)
      .filter(country => !getReciteResolvedCountryIds(run.session).includes(country.id))
      .map(country => country.id)
    : []
  const currentAnswerKind = currentPrompt
    ? currentPrompt.kind === 'capital' ? 'capital' : 'country'
    : undefined
  const highlightedCountryIds = run && run.assistance === 'visible' && currentPrompt
    ? [currentPrompt.countryId]
    : []

  const map = phase === 'setup' ? (
    <GeographyOverviewMap
      level={selectedContinent ? 'continent' : 'world'}
      continent={selectedContinent ?? undefined}
      selectedSubregionIds={selectedContinent ? selectedScopeSubregionIds : undefined}
      countryColorsById={setupColors}
      countryAccessibleDescriptionsById={setupDescriptions}
      hoveredGroupId={hoveredGroupId}
      onHoverGroup={setHoveredGroupId}
      onCountryClick={country => selectedContinent ? toggleSubregion(country.subregionId) : selectContinent(country.continent)}
      onMapStateChange={handleMapStateChange}
      ariaLabel={selectedContinent ? `${selectedContinent} map for Recite setup` : 'World map for Recite setup'}
    />
  ) : run ? (
    <GeographyOverviewMap
      level={activeContinent ? 'continent' : 'world'}
      continent={activeContinent}
      selectedSubregionIds={activeContinent ? run.subregionIds : undefined}
      countryColorsById={activeCountryColors}
      countryPopulation={run.population}
      highlightedCountryIds={highlightedCountryIds}
      highlightFill={currentAnswerKind ? getWorldCountriesTaskHighlightFill(currentAnswerKind) : undefined}
      hiddenCountryIds={hiddenCountryIds}
      interactive={false}
      ariaLabel={`${activeContinent ?? 'World'} map for active Recite session`}
    />
  ) : null

  const rails = useMemo(() => phase === 'setup'
      ? {
        left: (
            <GeographySelectionRail
              level={selectedContinent ? 'continent' : 'world'}
              setupContinent={selectedContinent}
              selection={normalizedSelection}
              selectionMetadata={selectionMetadata}
              worldOrder={worldOrder}
              subregionOrder={subregions}
              entries={activeCountries}
              hoveredGroupId={hoveredGroupId}
              onHoverGroup={setHoveredGroupId}
              onWorld={goToWorld}
              onSelectContinent={selectContinent}
              onToggleContinent={toggleWorldContinent}
              onSelectAllWorld={selectAllWorld}
              onClearWorld={clearWorld}
              onToggleSubregion={toggleSubregion}
              onSelectEntireContinent={toggleEntireContinent}
              headingId="world-countries-recite-geography-heading"
            />
        ),
        right: (
          <ReciteSetupControls
            mode={mode}
            assistance={assistance}
            onModeChange={setMode}
            onAssistanceChange={setAssistance}
            canStart={Boolean(setupScopeCountries.length > 0 && mapReady)}
            mapState={mapState}
            selectedCount={selectedScopeSubregionIds.length}
            onStart={startRecite}
            progress={progress}
          />
        ),
        leftLabel: 'Geography',
        rightLabel: 'Recite',
      }
      : {
        left: run ? <ReciteSessionGeographyRail run={run} onExit={backToSetup} /> : null,
        right: run ? <ReciteSessionControls run={run} phase={phase} onExit={backToSetup} /> : null,
        leftLabel: 'Geography',
        rightLabel: 'Recite',
      },
    [
      activeCountries, assistance, clearWorld, goToWorld, hoveredGroupId, mapReady, mapState, mode, phase, progress,
      normalizedSelection, run, selectAllWorld, selectContinent, selectedContinent, selectedScopeSubregionIds, selectionMetadata, setupScopeCountries.length, startRecite, subregions, toggleEntireContinent, toggleSubregion, toggleWorldContinent, worldOrder,
    ],
  )
  useRails(rails)

  if (phase === 'setup') {
    return (
      <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-recite-heading">
        <MapSurface
          context={(
            <div className="px-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Recite</p>
              <h1 id="world-countries-recite-heading" className="mt-1 text-2xl font-black text-zinc-100">Ordered recall</h1>
              <p className="mt-1 text-sm text-zinc-500">Choose a World-wide Subregion scope, then recall it in authored order.</p>
            </div>
          )}
          map={map}
          mapMeta={<span>{setupScopeCountries.length > 0 ? `${setupScopeCountries.length} Countries in current scope` : 'Select a Subregion to begin'}</span>}
        />
      </section>
    )
  }

  if (!run) return null
  if (phase === 'complete') {
    const outcomes = getReciteCountryOutcomes(run.session)
    const count = (outcome: ReciteCountryOutcome) => outcomes.filter(candidate => candidate === outcome).length
    return (
      <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-recite-complete-heading">
        <MapSurface
          context={(
            <div className="px-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">World Countries · Recite</p>
              <h1 id="world-countries-recite-complete-heading" className="mt-1 text-2xl font-black text-zinc-100">Recite complete</h1>
              <p className="mt-1 text-sm text-zinc-500">{run.scopeLabel} · {run.session.countries.length} Countries</p>
            </div>
          )}
          map={map}
          dockPlacement="stacked"
          dock={(
            <TaskDock variant="completion" tone="ready" status="This completed run is now the latest Recite status for each Country in this mode." enableEnterPrimary>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-300">Recalled {count('recalled')}</span>
                <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Recovered {count('recovered')}</span>
                <span className="rounded-md bg-orange-900/40 px-2 py-1 text-xs text-orange-300">Revealed {count('revealed')}</span>
                <button type="button" data-primary-action onClick={reciteAgain} className="ml-auto rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Recite again</button>
                <button type="button" onClick={backToSetup} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to setup</button>
              </div>
            </TaskDock>
          )}
        />
      </section>
    )
  }

  if (!currentPrompt || !currentCountry) return null
  const activeTask: WorldCountriesActivityTask = run.mode === 'countries-from-capitals' && currentPrompt.kind === 'country'
    ? {
      direction: 'Capital → Country',
      cue: currentCountry.capital,
      answerKind: 'country',
      sessionContext: <><span className="text-zinc-300">{currentCountry.continent}</span> · {modeLabel(run.mode)}</>,
      progress: { label: 'Country', current: currentPrompt.countryIndex + 1, total: run.session.countries.length },
    }
    : {
      direction: currentPrompt.kind === 'capital' ? 'Country → Capital' : 'Ordered Country recall',
      cue: currentPrompt.kind === 'capital' ? `Capital of ${currentCountry.country}` : 'Next country',
      answerKind: currentAnswerKind,
      sessionContext: <><span className="text-zinc-300">{currentCountry.continent}</span> · {modeLabel(run.mode)}</>,
      progress: { label: 'Country', current: currentPrompt.countryIndex + 1, total: run.session.countries.length },
    }
  return (
    <section className="space-y-3 animate-fade-in">
      <WorldCountriesMapActivitySurface
        task={activeTask}
        map={map}
        dockPlacement="stacked"
        dock={(
          <RecitePromptDock
            key={`${currentPrompt.countryId}-${currentPrompt.kind}`}
            prompt={currentPrompt}
            country={currentCountry}
            scopeCountries={run.scopeCountries}
            fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
            onSubmit={submitAnswer}
            onReveal={revealAnswer}
            onContinue={continueSession}
          />
        )}
      />
    </section>
  )
}

function ReciteSetupControls({ mode, assistance, onModeChange, onAssistanceChange, canStart, mapState, selectedCount, onStart, progress }: {
  mode: ReciteMode
  assistance: ReciteMapAssistance
  onModeChange: (mode: ReciteMode) => void
  onAssistanceChange: (assistance: ReciteMapAssistance) => void
  canStart: boolean
  mapState: SvgMapLoadState
  selectedCount: number
  onStart: () => void
  progress: WorldCountriesReciteProgress
}) {
  const modeGroup = `world-countries-recite-mode-${useId()}`
  const assistanceGroup = `world-countries-recite-assistance-${useId()}`
  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-controls-heading">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p><h2 id="world-countries-recite-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Mode</h2></div>
      <fieldset className="space-y-2"><legend className="sr-only">Recite mode</legend>{RECITE_MODE_DEFINITIONS.map(candidate => <label key={candidate.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${mode === candidate.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="radio" name={modeGroup} value={candidate.id} checked={mode === candidate.id} onChange={() => onModeChange(candidate.id)} className="mt-1 accent-cyan-500" /><span><span className="block font-semibold">{candidate.label}</span><span className="mt-0.5 block text-xs text-zinc-500">{candidate.description}</span></span></label>)}</fieldset>
      <fieldset className="space-y-2 border-t border-zinc-800 pt-4"><legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Map assistance</legend>{RECITE_ASSISTANCE_DEFINITIONS.map(candidate => <label key={candidate.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${assistance === candidate.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="radio" name={assistanceGroup} value={candidate.id} checked={assistance === candidate.id} onChange={() => onAssistanceChange(candidate.id)} className="mt-1 accent-cyan-500" /><span><span className="block font-semibold">{candidate.label}</span><span className="mt-0.5 block text-xs text-zinc-500">{candidate.description}</span></span></label>)}</fieldset>
      <ReciteStatusLegend mode={mode} progress={progress} />
      {selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion.</p>}
      {mapState === 'loading' && <p className="text-xs text-zinc-500" role="status">Loading map…</p>}
      {mapState === 'error' && <p className="text-sm text-red-300" role="alert">Recite will be available when the map loads successfully.</p>}
      <button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Recite' : 'Choose a ready Country scope'}</button>
    </WorldCountriesPanel>
  )
}

function ReciteStatusLegend({ mode, progress }: { mode: ReciteMode; progress: WorldCountriesReciteProgress }) {
  const statuses: readonly ReciteStatus[] = ['unrecited', 'revealed', 'recovered', 'recalled']
  return <details className="border-t border-zinc-800 pt-4"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-500">{modeLabel(mode)} status legend</summary><ul className="mt-3 space-y-2 text-xs text-zinc-400">{statuses.map(status => <li key={status} className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status === 'unrecited' ? RECITE_STATUS_COLORS.unrecited : RECITE_STATUS_COLORS[status] }} /><span><span className="font-semibold text-zinc-200">{statusLabel(status)}</span> — {getReciteStatusDescription(status)}{status !== 'unrecited' && <span className="sr-only"> Stored outcomes remain mode-specific.</span>}</span></li>)}</ul><p className="mt-3 text-xs text-zinc-500">Countries setup may use a stronger Countries + Capitals result. Countries + Capitals and Countries from Capitals remain their own status views; stored progress remains independent. Drill and Learning status are not used here.</p><span className="sr-only">{progress.version === 1 ? 'Recite progress storage active.' : ''}</span></details>
}

function ReciteSessionGeographyRail({ run, onExit }: { run: ActiveReciteRun; onExit: () => void }) {
  const currentPrompt = getCurrentRecitePrompt(run.session)
  const currentContinent = currentPrompt
    ? run.scopeCountries.find(country => country.id === currentPrompt.countryId)?.continent
    : undefined
  const groups = groupReciteSubregionsByContinent(run)
  return <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-session-geography-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p><h2 id="world-countries-recite-session-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Recite context</h2></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">{run.scopeLabel} scope</p><ul className="mt-2 space-y-3 text-sm text-zinc-300">{groups.map(group => <li key={group.continent} aria-current={group.continent === currentContinent ? 'location' : undefined} data-current-continent={group.continent === currentContinent ? 'true' : undefined}><p className={`font-semibold ${group.continent === currentContinent ? 'text-cyan-200' : 'text-zinc-200'}`}>{group.continent}</p><ul className="mt-1 space-y-1 pl-3 text-zinc-400">{group.subregions.map(subregion => <li key={subregion.id}>{subregion.label}</li>)}</ul></li>)}</ul><p className="mt-3 text-xs text-zinc-500">{run.session.countries.length} Countries in this ordered snapshot</p></div><p className="text-xs leading-relaxed text-zinc-500">The map is a geographic scaffold. Answer through the Recite prompt.</p><button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Back to setup</button></WorldCountriesPanel>
}

function groupReciteSubregionsByContinent(run: ActiveReciteRun): readonly { continent: Continent; subregions: readonly SubregionDefinition[] }[] {
  const groups: Array<{ continent: Continent; subregions: SubregionDefinition[] }> = []
  for (const subregionId of run.subregionIds) {
    const subregion = getSubregionDefinition(subregionId)
    const group = groups.find(candidate => candidate.continent === subregion.continent)
    if (group) group.subregions.push(subregion)
    else groups.push({ continent: subregion.continent, subregions: [subregion] })
  }
  return groups
}

function ReciteSessionControls({ run, phase, onExit }: { run: ActiveReciteRun; phase: RecitePhase; onExit: () => void }) {
  const current = getCurrentRecitePrompt(run.session)
  return <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-session-controls-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p><h2 id="world-countries-recite-session-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Session</h2></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">Mode</p><p className="mt-1 text-sm font-semibold text-zinc-200">{modeLabel(run.mode)}</p><p className="mt-1 text-xs text-zinc-500">{assistanceLabel(run.assistance)}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, current ? ((current.countryIndex + (current.kind === 'capital' ? 0.5 : 0)) / run.session.countries.length) * 100 : 100)}%` }} /></div><p className="mt-2 text-xs tabular-nums text-zinc-500">{phase === 'complete' ? run.session.countries.length : (current?.countryIndex ?? run.session.countries.length) + 1} / {run.session.countries.length} Countries</p></div><button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Back to setup</button></WorldCountriesPanel>
}

function RecitePromptDock({ prompt, country, scopeCountries, fuzzyMatching, onSubmit, onReveal, onContinue }: { prompt: RecitePromptView; country: Country; scopeCountries: readonly Country[]; fuzzyMatching: boolean; onSubmit: (evaluation: WorldCountriesTypedAnswerEvaluation) => void; onReveal: () => void; onContinue: () => void }) {
  const expected = prompt.kind === 'capital' ? country.capital : country.country
  const placeholder = prompt.kind === 'capital' ? 'Type the capital…' : 'Type the country…'

  return (
    <WorldCountriesTypedAnswer
      promptKey={`${prompt.countryId}-${prompt.kind}`}
      answerLabel={prompt.kind === 'capital' ? 'Type the capital' : 'Type the country name'}
      placeholder={placeholder}
      correctAnswer={expected}
      retryOnIncorrect
      reveal={{ canonicalAnswer: expected, answerKind: prompt.kind === 'capital' ? 'capital' : 'country', message: `Answer: ${expected}` }}
      evaluate={answer => {
        const skill = prompt.kind === 'capital' ? 'country-to-capital' : 'capital-to-country'
        const match = classifyRecallAnswer(skill, answer, country, {
          fuzzy: fuzzyMatching,
          countryCandidates: scopeCountries,
          capitalCandidates: scopeCountries.map(entry => entry.capital),
        })
        const outcome = match === 'fuzzy' ? 'fuzzy' : match === 'exact' ? 'exact' : 'incorrect'
        return {
          outcome,
          canonicalAnswer: expected,
          answerKind: prompt.kind === 'capital' ? 'capital' : 'country',
          message: outcome === 'incorrect'
            ? 'Not quite. Try again; the answer stays hidden.'
            : outcome === 'fuzzy'
              ? `Correct. The canonical answer is ${expected}.`
              : `Correct. ${expected}`,
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={(_, evaluation) => onSubmit(evaluation)}
      onTransition={onContinue}
    >
      {typed => (
        <TaskDock variant="form">
          <div className="space-y-3">
            {typed.input}
            {typed.isAnswerable && <button type="button" onClick={() => { if (typed.reveal()) onReveal() }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-orange-500 hover:text-zinc-100">Reveal / Skip</button>}
          </div>
        </TaskDock>
      )}
    </WorldCountriesTypedAnswer>
  )
}

function modeLabel(mode: ReciteMode): string {
  return RECITE_MODE_DEFINITIONS.find(candidate => candidate.id === mode)?.label ?? mode
}

function assistanceLabel(assistance: ReciteMapAssistance): string {
  return RECITE_ASSISTANCE_DEFINITIONS.find(candidate => candidate.id === assistance)?.label ?? assistance
}

function statusLabel(status: ReciteStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
