import { useId, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useRails } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentsInEffectiveOrder, getCountriesForSubregion } from '@/features/world-countries/geography/queries'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import type { SvgMapLoadState } from '@/features/world-countries/maps/SvgMapView'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { GeographyHierarchyRow } from '@/features/world-countries/ui/GeographyHierarchyRow'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import {
  createWorldCountriesReciteScope,
  getCountriesForReciteSelectionInEffectiveOrder,
  getReciteSubregionsInEffectiveOrder,
  isEntireContinentReciteSelection,
  toggleEntireContinentReciteSelection,
  toggleReciteSubregionSelection,
} from './reciteScope'
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
  continent: Continent
  subregionIds: readonly SubregionId[]
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
  const [selectedSubregionsByContinent, setSelectedSubregionsByContinent] = useState<Partial<Record<Continent, readonly SubregionId[]>>>({})
  const [mode, setMode] = useState<ReciteMode>('countries')
  const [assistance, setAssistance] = useState<ReciteMapAssistance>('visible')
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [mapState, setMapState] = useState<SvgMapLoadState>('loading')
  const [readyMapKey, setReadyMapKey] = useState<string | null>(null)
  const [progress, setProgress] = useState<WorldCountriesReciteProgress>(() => loadWorldCountriesReciteProgress())
  const [run, setRun] = useState<ActiveReciteRun | null>(null)

  const worldOrder = useMemo(
    () => getContinentsInEffectiveOrder(activeCountries, getWorldMetadata()),
    [activeCountries, geographyRevision],
  )
  const selectedSubregionIds = selectedContinent
    ? selectedSubregionsByContinent[selectedContinent] ?? []
    : []
  const continentMetadata = selectedContinent ? getContinentMetadata(selectedContinent) : null
  const subregionMetadata = useMemo(
    () => getAllSubregionMetadata(),
    [activeCountries, geographyRevision, selectedContinent],
  )
  const subregions = selectedContinent
    ? getReciteSubregionsInEffectiveOrder(selectedContinent, activeCountries, continentMetadata)
    : []
  const setupScopeCountries = useMemo(
    () => selectedContinent
      ? getCountriesForReciteSelectionInEffectiveOrder(selectedContinent, selectedSubregionIds, activeCountries, continentMetadata, subregionMetadata)
      : [],
    [activeCountries, continentMetadata, selectedContinent, selectedSubregionIds, subregionMetadata],
  )
  const setupScope = useMemo(
    () => createWorldCountriesReciteScope(setupScopeCountries),
    [setupScopeCountries],
  )
  const mapKey = selectedContinent ?? 'world'
  const mapReady = readyMapKey === mapKey && mapState === 'ready'
  const setupColors = useMemo(
    () => createReciteSetupCountryColors(
      selectedContinent ? activeCountries.filter(country => country.continent === selectedContinent) : activeCountries,
      selectedContinent ? setupScope.countryIds : undefined,
      mode,
      progress,
    ),
    [activeCountries, mode, progress, selectedContinent, setupScope.countryIds],
  )
  const setupDescriptions = useMemo(
    () => createReciteSetupCountryDescriptions(
      selectedContinent ? activeCountries.filter(country => country.continent === selectedContinent) : activeCountries,
      selectedContinent ? setupScope.countryIds : undefined,
      mode,
      progress,
    ),
    [activeCountries, mode, progress, selectedContinent, setupScope.countryIds],
  )

  const handleMapStateChange = (nextState: SvgMapLoadState) => {
    setMapState(nextState)
    if (nextState === 'ready') setReadyMapKey(mapKey)
    else setReadyMapKey(current => current === mapKey ? null : current)
  }

  const selectContinent = (continent: Continent) => {
    setSelectedContinent(continent)
    setHoveredGroupId(null)
  }

  const goToWorld = () => {
    setSelectedContinent(null)
    setHoveredGroupId(null)
  }

  const toggleSubregion = (subregionId: SubregionId) => {
    if (!selectedContinent) return
    const next = toggleReciteSubregionSelection(selectedContinent, selectedSubregionIds, subregionId, activeCountries, continentMetadata)
    setSelectedSubregionsByContinent(current => ({ ...current, [selectedContinent]: next }))
  }

  const toggleEntireContinent = () => {
    if (!selectedContinent) return
    const next = toggleEntireContinentReciteSelection(selectedContinent, selectedSubregionIds, activeCountries, continentMetadata)
    setSelectedSubregionsByContinent(current => ({ ...current, [selectedContinent]: next }))
  }

  const startRecite = () => {
    if (!selectedContinent || setupScopeCountries.length === 0 || !mapReady) return
    const sessionCountries = setupScopeCountries.map(country => ({
      id: country.id,
      country: country.country,
      capital: country.capital,
    }))
    const orderedSubregionIds = subregions
      .map(subregion => subregion.id)
      .filter(subregionId => selectedSubregionIds.includes(subregionId))
    setRun({
      continent: selectedContinent,
      subregionIds: orderedSubregionIds,
      mode,
      assistance,
      population: [...activeCountries],
      scopeCountries: [...setupScopeCountries],
      session: createReciteSession(mode, sessionCountries),
    })
    setPhase('session')
    setHoveredGroupId(null)
  }

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

  const activeCountryColors = run
    ? createReciteActiveCountryColors(
      run.population.filter(country => country.continent === run.continent),
      run.session.countries.map(country => country.id),
      new Map(run.session.countries.map((country, index) => [country.id, getReciteCountryOutcomes(run.session)[index] ?? null] as const)),
    )
    : new Map<CountryId, string>()
  const hiddenCountryIds = run && run.assistance === 'reveal' && phase === 'session'
    ? run.session.countries
      .filter(country => !getReciteResolvedCountryIds(run.session).includes(country.id))
      .map(country => country.id)
    : []
  const currentPrompt = run && phase === 'session' ? getCurrentRecitePrompt(run.session) : null
  const currentCountry = currentPrompt ? run?.scopeCountries.find(country => country.id === currentPrompt.countryId) : undefined
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
      selectedSubregionIds={selectedContinent ? selectedSubregionIds : undefined}
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
      level="continent"
      continent={run.continent}
      selectedSubregionIds={run.subregionIds}
      countryColorsById={activeCountryColors}
      countryPopulation={run.population}
      highlightedCountryIds={highlightedCountryIds}
      highlightFill={currentAnswerKind ? getWorldCountriesTaskHighlightFill(currentAnswerKind) : undefined}
      hiddenCountryIds={hiddenCountryIds}
      interactive={false}
      ariaLabel={`${run.continent} map for active Recite session`}
    />
  ) : null

  useRails(
    phase === 'setup'
      ? {
        left: (
          <ReciteSetupGeographyRail
            worldOrder={worldOrder}
            selectedContinent={selectedContinent}
            subregions={subregions}
            selectedSubregionIds={selectedSubregionIds}
            activeCountries={activeCountries}
            hoveredGroupId={hoveredGroupId}
            onHoverGroup={setHoveredGroupId}
            onWorld={goToWorld}
            onSelectContinent={selectContinent}
            onToggleSubregion={toggleSubregion}
            onToggleEntireContinent={toggleEntireContinent}
          />
        ),
        right: (
          <ReciteSetupControls
            mode={mode}
            assistance={assistance}
            onModeChange={setMode}
            onAssistanceChange={setAssistance}
            canStart={Boolean(selectedContinent && setupScopeCountries.length > 0 && mapReady)}
            mapState={mapState}
            selectedContinent={selectedContinent}
            selectedCount={selectedSubregionIds.length}
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
      activeCountries, assistance, hoveredGroupId, mapReady, mapState, mode, phase, progress,
      run, selectedContinent, selectedSubregionIds, setupScopeCountries.length, subregions, worldOrder,
    ],
  )

  if (phase === 'setup') {
    return (
      <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-recite-heading">
        <MapSurface
          context={(
            <div className="px-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Recite</p>
              <h1 id="world-countries-recite-heading" className="mt-1 text-2xl font-black text-zinc-100">Ordered recall</h1>
              <p className="mt-1 text-sm text-zinc-500">Choose a Continent and Subregion scope, then recall it in authored order.</p>
            </div>
          )}
          map={map}
          mapMeta={<span>{selectedContinent ? `${setupScope.totalCountries} Countries in current scope` : 'Choose a Continent to begin'}</span>}
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
              <p className="mt-1 text-sm text-zinc-500">{run.continent} · {run.session.countries.length} Countries</p>
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
      sessionContext: <><span className="text-zinc-300">{run.continent}</span> · {modeLabel(run.mode)}</>,
      progress: { label: 'Country', current: currentPrompt.countryIndex + 1, total: run.session.countries.length },
    }
    : {
      direction: currentPrompt.kind === 'capital' ? 'Country → Capital' : 'Ordered Country recall',
      cue: currentPrompt.kind === 'capital' ? `Capital of ${currentCountry.country}` : 'Next country',
      answerKind: currentAnswerKind,
      sessionContext: <><span className="text-zinc-300">{run.continent}</span> · {modeLabel(run.mode)}</>,
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

function ReciteSetupGeographyRail({
  worldOrder, selectedContinent, subregions, selectedSubregionIds, activeCountries, hoveredGroupId,
  onHoverGroup, onWorld, onSelectContinent, onToggleSubregion, onToggleEntireContinent,
}: {
  worldOrder: readonly Continent[]
  selectedContinent: Continent | null
  subregions: readonly { id: SubregionId; label: string }[]
  selectedSubregionIds: readonly SubregionId[]
  activeCountries: readonly Country[]
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onToggleEntireContinent: () => void
}) {
  if (!selectedContinent) {
    return (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-geography-heading">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p><h2 id="world-countries-recite-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography</h2></div>
        <p className="text-sm leading-relaxed text-zinc-400">Choose a Continent to enter its Recite setup.</p>
        <nav aria-label="Recite Continents"><ol className="space-y-1.5">{worldOrder.map((continent, index) => <GeographyHierarchyRow key={continent} label={continent} sequenceNumber={index + 1} secondary={`${activeCountries.filter(country => country.continent === continent).length} Countries`} groupId={getContinentHoverGroupId(continent)} hoveredGroupId={hoveredGroupId} onClick={() => onSelectContinent(continent)} onHoverGroup={onHoverGroup} />)}</ol></nav>
      </WorldCountriesPanel>
    )
  }

  const entireContinent = isEntireContinentReciteSelection(selectedContinent, selectedSubregionIds, activeCountries, getContinentMetadata(selectedContinent))
  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-geography-heading">
      <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: selectedContinent, current: true }]} />
      <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{selectedContinent}</p><h2 id="world-countries-recite-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography</h2><p className="mt-1 text-sm text-zinc-400">Select one or more Subregions in the rail or map.</p></div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-zinc-500">Scope</span><span className="font-semibold text-zinc-200">{selectedSubregionIds.length} {selectedSubregionIds.length === 1 ? 'Subregion' : 'Subregions'} selected</span></div><button type="button" aria-pressed={entireContinent} onClick={onToggleEntireContinent} className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-sm ${entireContinent ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}`}><span className="block font-semibold">Entire Continent</span><span className="mt-1 block text-xs text-zinc-500">All currently active Subregions</span></button></div>
      <nav aria-label={`${selectedContinent} Recite Subregions`}><ol className="space-y-1.5">{subregions.map((subregion, index) => <GeographyHierarchyRow key={subregion.id} label={subregion.label} sequenceNumber={index + 1} secondary={`${getCountriesForSubregion(selectedContinent, subregion.id, activeCountries).length} Countries`} groupId={getSubregionHoverGroupId(subregion.label)} hoveredGroupId={hoveredGroupId} onClick={() => onToggleSubregion(subregion.id)} onHoverGroup={onHoverGroup} selected={selectedSubregionIds.includes(subregion.id)} />)}</ol></nav>
      {selectedSubregionIds.length === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>}
    </WorldCountriesPanel>
  )
}

function ReciteSetupControls({ mode, assistance, onModeChange, onAssistanceChange, canStart, mapState, selectedContinent, selectedCount, onStart, progress }: {
  mode: ReciteMode
  assistance: ReciteMapAssistance
  onModeChange: (mode: ReciteMode) => void
  onAssistanceChange: (assistance: ReciteMapAssistance) => void
  canStart: boolean
  mapState: SvgMapLoadState
  selectedContinent: Continent | null
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
      {!selectedContinent && <p className="text-sm text-amber-300" role="alert">Choose a Continent first.</p>}
      {selectedContinent && selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion.</p>}
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
  const subregions = run.subregionIds.map(getSubregionDefinition)
  return <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-session-geography-heading"><GeographyBreadcrumbs items={[{ label: 'World' }, { label: run.continent, current: true }]} /><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Selected geography</p><h2 id="world-countries-recite-session-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Recite context</h2></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><p className="text-xs uppercase tracking-wider text-zinc-500">Subregions</p><ul className="mt-2 space-y-1 text-sm text-zinc-300">{subregions.filter(subregion => run.subregionIds.includes(subregion.id)).map(subregion => <li key={subregion.id}>{subregion.label}</li>)}</ul><p className="mt-2 text-xs text-zinc-500">{run.session.countries.length} Countries in this ordered snapshot</p></div><p className="text-xs leading-relaxed text-zinc-500">The map is a geographic scaffold. Answer through the Recite prompt.</p><button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100">Back to setup</button></WorldCountriesPanel>
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
