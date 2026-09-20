import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, CountryId } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { readWorldCountriesGeography } from '@/features/world-countries/geography/worldScope'
import { getAllSubregionLearningStates, useWorldCountriesSubregionLearningRevision } from '@/features/world-countries/learning/subregionLearningStore'
import { getDefaultPracticeInteraction, getPracticeModeSkill, resolvePracticeInteraction, type WorldCountriesPracticeInteraction, type WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { DrillResults } from './DrillResults'
import { PracticeResults } from '@/features/world-countries/practice/PracticeResults'
import { PracticeSession, type PracticeSessionAnswer, type PracticeSessionInteraction } from '@/features/world-countries/practice/PracticeSession'
import { DrillSession } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import type { WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { getCountriesForDrillSelectionInEffectiveOrder, normalizeDrillSelection, selectAllDrillSubregions, type DrillSelectionMetadata, type WorldCountriesDrillSelection } from './drillSelection'
import { toggleWorldScope } from '@/features/world-countries/geography/subregionScope'
import {
  createDrillSession,
  isDrillSessionCompatible,
  submitDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'
import { loadDrillPreferences, saveDrillPreferences, type WorldCountriesDrillPreferences } from './drillPreferences'
import type { WorldCountriesDrillScopeSource, WorldCountriesProficiencySelection } from './drillProficiencyScope'
import { getRetryableFailedDrillCountryIds } from './drillResultSummary'
import { resolveDrillSessionLaunch, type WorldCountriesDrillSessionLaunch } from './drillSessionLaunch'
import type { WorldCountriesSetupActivity } from './setupActivity'

type DrillPhase = 'setup' | 'practice' | 'recall' | 'results'
type StartSessionOptions = {
  persistPreferences?: boolean
  interaction?: PracticeSessionInteraction
  activity?: 'drill' | 'practice'
  skills?: DrillAnswerRecord['skill'][]
  practiceMode?: WorldCountriesPracticeMode
  /** A transient Country subset for a retry; it never changes preferences. */
  countryIds?: readonly CountryId[]
}

type ActiveDrillRun = {
  session: DrillSessionState
  selection: WorldCountriesDrillSelection
  scopeLabel: string
  activity: 'drill' | 'practice'
  interaction: PracticeSessionInteraction
  practiceMode?: WorldCountriesPracticeMode
  answers: DrillAnswerRecord[]
}

export type WorldCountriesDrillInitialScope =
  | { kind: 'world' }
  | { kind: 'subregion'; subregionId: SubregionId }

/** Coordinator for shared geography setup, recorded Drill, and non-recording Practice. */
export function WorldCountriesDrill({ answerMode, onExit, initialActivity = { kind: 'drill' }, initialScope, onOpenPlayground }: { answerMode: AnswerMode; onExit?: () => void; initialActivity?: WorldCountriesSetupActivity; initialScope?: WorldCountriesDrillInitialScope; onOpenPlayground?: () => void }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const geographyRevision = useWorldCountriesGeographyRevision()
  const learningRevision = useWorldCountriesSubregionLearningRevision()
  const selectionMetadata = useMemo<DrillSelectionMetadata>(() => {
    void geographyRevision
    return readWorldCountriesGeography(activeCountries).metadata
  }, [activeCountries, geographyRevision])
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(() => {
    const loaded = loadDrillPreferences()
    if (initialScope?.kind === 'world') {
      return { ...loaded, subregionIds: selectAllDrillSubregions(activeCountries, selectionMetadata).subregionIds }
    }
    return initialScope?.kind === 'subregion'
      ? { ...loaded, subregionIds: [initialScope.subregionId] }
      : loaded
  })
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [scopeSource, setScopeSource] = useState<WorldCountriesDrillScopeSource>('geography')
  const [proficiencySelection, setProficiencySelection] = useState<WorldCountriesProficiencySelection>([])
  /**
   * Geography and proficiency are alternative scope sources, so only the
   * active one contributes. Each keeps its own selection across a switch:
   * the explicit source control already says which one counts, and clearing
   * the other threw away work the learner had done.
   */
  const effectiveProficiencySelection = scopeSource === 'proficiency' ? proficiencySelection : []
  const [practiceInteraction, setPracticeInteraction] = useState<WorldCountriesPracticeInteraction>(
    () => initialActivity.kind === 'practice' ? getDefaultPracticeInteraction(initialActivity.mode) : 'recall',
  )
  const [setupContinent, setSetupContinent] = useState<Continent | null>(() => initialScope?.kind === 'subregion' ? getSubregionDefinition(initialScope.subregionId).continent : null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveDrillRun | null>(null)
  const launchGeneration = useRef(0)
  const effectivePreferences = useMemo(
    () => ({ ...normalizeDrillSelection(preferences, activeCountries, selectionMetadata), mode: preferences.mode, order: preferences.order }),
    [activeCountries, preferences, selectionMetadata],
  )
  useEffect(() => {
    if (sameSubregionSelection(preferences.subregionIds, effectivePreferences.subregionIds)) return
    setPreferences(effectivePreferences)
    saveDrillPreferences(effectivePreferences)
  }, [effectivePreferences, preferences.subregionIds])
  const geographicEntries = useMemo(
    () => getCountriesForDrillSelectionInEffectiveOrder(effectivePreferences, activeCountries, selectionMetadata),
    [activeCountries, effectivePreferences, selectionMetadata],
  )
  const sessionEntries = useMemo(
    () => activeRun
      ? activeRun.session.countryIds.map(countryId => activeCountries.find(country => country.id === countryId)).filter((country): country is typeof activeCountries[number] => country !== undefined)
      : geographicEntries,
    [activeCountries, activeRun, geographicEntries],
  )
  const activeRunMatchesPopulation = activeRun ? isDrillSessionCompatible(activeRun.session, activeCountries) : false
  const activeSession = activeRun?.session
  const activeRunActivity = activeRun?.activity
  const activeRunInteraction = activeRun?.interaction
  const activeRunMode = activeRun?.session.mode
  const activePracticeMode = activeRun?.practiceMode
  const learningStates = useMemo(() => {
    void learningRevision
    return getAllSubregionLearningStates(activeCountries)
  }, [activeCountries, learningRevision])
  useEffect(() => {
    if (phase !== 'recall' && phase !== 'practice' || !activeRun || activeRunMatchesPopulation) return
    setActiveRun(null)
    setPhase('setup')
  }, [activeRun, activeRunMatchesPopulation, phase])

  const updatePreferences = useCallback((next: WorldCountriesDrillPreferences) => {
    launchGeneration.current += 1
    const normalized = {
      ...normalizeDrillSelection(next, activeCountries, selectionMetadata),
      mode: next.mode,
      order: next.order,
    }
    setPreferences(normalized)
    saveDrillPreferences(normalized)
  }, [activeCountries, selectionMetadata])

  const startSession = useCallback((startPreferences: WorldCountriesDrillPreferences, { persistPreferences = true, interaction = 'recall', activity = 'drill', skills, practiceMode, countryIds }: StartSessionOptions = {}) => {
    const generation = ++launchGeneration.current
    const applyLaunch = (launch: WorldCountriesDrillSessionLaunch | null) => {
      if (launchGeneration.current !== generation) return
      if (!launch || launch.activity === 'practice' && !launch.practiceMode) return
      if (persistPreferences) saveDrillPreferences(startPreferences)
      setActiveRun({
        session: createDrillSession({
          mode: startPreferences.mode,
          ...(launch.skills ? { skills: launch.skills } : {}),
          countryIds: launch.countryIds,
          countryOrder: launch.countryOrder,
        }),
        selection: launch.selection,
        scopeLabel: launch.scopeLabel,
        activity: launch.activity,
        interaction: launch.interaction,
        ...(launch.practiceMode ? { practiceMode: launch.practiceMode } : {}),
        answers: [],
      })
      setPhase(launch.activity === 'practice' ? 'practice' : 'recall')
    }

    const launch = resolveDrillSessionLaunch({
      startPreferences,
      activeCountries,
      proficiencySelection: effectiveProficiencySelection,
      interaction,
      activity,
      skills,
      practiceMode,
      countryIds,
      proficiencyContinent: setupContinent,
      selectionMetadata,
    })
    if (launch instanceof Promise) void launch.then(applyLaunch)
    else applyLaunch(launch)
  }, [activeCountries, effectiveProficiencySelection, selectionMetadata, setupContinent])

  const startDrill = useCallback(() => startSession(effectivePreferences), [effectivePreferences, startSession])

  const startPractice = useCallback(() => {
    if (initialActivity.kind !== 'practice') return
    const practiceMode = initialActivity.mode
    startSession(effectivePreferences, {
      persistPreferences: false,
      activity: 'practice',
      practiceMode,
      skills: [getPracticeModeSkill(practiceMode)],
      interaction: resolvePracticeInteraction(practiceMode, practiceInteraction),
    })
  }, [effectivePreferences, initialActivity, practiceInteraction, startSession])

  const restart = useCallback(() => {
    if (!activeRunActivity) return
    if (activeRunActivity === 'practice') {
      if (!activePracticeMode) return
      if (initialActivity.kind !== 'practice' || initialActivity.mode !== activePracticeMode) return
      startPractice()
    } else startDrill()
  }, [activePracticeMode, activeRunActivity, initialActivity, startDrill, startPractice])

  const retryFailedCountryIds = useMemo(() => {
    if (phase !== 'results' || activeRunActivity !== 'drill' || !activeRun) return []
    return getRetryableFailedDrillCountryIds(activeRun.answers, activeRun.session.countryIds, activeCountries.map(country => country.id))
  }, [activeCountries, activeRun, activeRunActivity, phase])

  const retryFailedCountries = useCallback(() => {
    if (!activeRunMode || retryFailedCountryIds.length === 0) return
    void startSession(
      { ...effectivePreferences, mode: activeRunMode },
      { persistPreferences: false, countryIds: retryFailedCountryIds },
    )
  }, [activeRunMode, effectivePreferences, retryFailedCountryIds, startSession])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setActiveRun(previous => previous ? { ...previous, answers: [...previous.answers, record] } : previous)
    if (!activeRunActivity || activeRunActivity === 'practice' || record.assisted) return
    void recordWorldCountriesAttempt(record.countryId, record.skill, { at: record.at, ok: record.correct, ms: record.ms, evidenceKind: record.evidenceKind, attemptType: 'drill' })
  }, [activeRunActivity])

  const answerPractice = useCallback((record: PracticeSessionAnswer) => {
    answer({
      ...record,
      at: Date.now(),
      ms: 0,
      evidenceKind: activeRunInteraction === 'location-click' ? 'recognition' : 'recall',
    })
  }, [activeRunInteraction, answer])

  const continueSession = useCallback((correct: boolean) => {
    if (!activeSession) return
    const result = submitDrillStep(activeSession, correct)
    setActiveRun(previous => previous ? { ...previous, session: result.state } : previous)
    if (result.completedNow) setPhase('results')
  }, [activeSession])

  const exitToSetup = useCallback(() => {
    launchGeneration.current += 1
    if (onExit) {
      onExit()
      return
    }
    setActiveRun(null)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [onExit])

  const selectContinent = useCallback((continent: Continent) => {
    launchGeneration.current += 1
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [])

  const goToWorld = useCallback(() => {
    launchGeneration.current += 1
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])
  const handleScopeSourceChange = useCallback((source: WorldCountriesDrillScopeSource) => {
    launchGeneration.current += 1
    setScopeSource(source)
  }, [])
  const handleSelectionChange = useCallback((selection: WorldCountriesDrillSelection) => {
    updatePreferences({ ...selection, mode: preferences.mode, order: preferences.order })
  }, [preferences.mode, preferences.order, updatePreferences])
  const toggleWorld = useCallback(() => {
    updatePreferences({ ...toggleWorldScope(effectivePreferences, activeCountries, selectionMetadata), mode: preferences.mode, order: preferences.order })
  }, [activeCountries, effectivePreferences, preferences.mode, preferences.order, selectionMetadata, updatePreferences])
  const handleProficiencySelectionChange = useCallback((selection: WorldCountriesProficiencySelection) => {
    launchGeneration.current += 1
    setProficiencySelection(selection)
  }, [])
  const handleModeChange = useCallback((mode: WorldCountriesDrillMode) => updatePreferences({ ...preferences, mode }), [preferences, updatePreferences])
  const handleOrderChange = useCallback((order: WorldCountriesDrillOrder) => updatePreferences({ ...preferences, order }), [preferences, updatePreferences])
  if ((phase === 'recall' || phase === 'practice') && activeRun && activeRunMatchesPopulation) {
    if (activeRun.activity === 'practice') {
      return <PracticeSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={activeRun.session} interaction={activeRun.interaction} learningStates={learningStates} proficiencySelection={effectiveProficiencySelection} selection={activeRun.selection} scopeLabel={activeRun.scopeLabel} entries={sessionEntries} activeCountries={activeCountries} onAnswer={answerPractice} onContinue={continueSession} onExit={exitToSetup} />
    }
    return <DrillSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={activeRun.session} selection={activeRun.selection} scopeLabel={activeRun.scopeLabel} entries={sessionEntries} proficiencySelection={effectiveProficiencySelection} onAnswer={answer} onContinue={continueSession} onExit={exitToSetup} />
  }

  if (phase === 'results' && activeRun) {
    if (activeRun.activity === 'practice') return <PracticeResults scopeCountries={sessionEntries} answers={activeRun.answers} onAgain={restart} onChangeSetup={exitToSetup} />
    return <DrillResults mode={activeRun.session.mode} scopeCountries={sessionEntries} answers={activeRun.answers} retryFailedCountryCount={retryFailedCountryIds.length} onRetryFailedCountries={retryFailedCountries} onAgain={restart} onChangeSetup={exitToSetup} />
  }

  return <DrillSetup
    key={setupContinent ?? 'world'}
    level={setupContinent ? 'continent' : 'world'}
    setupContinent={setupContinent}
    selection={effectivePreferences}
    mode={effectivePreferences.mode}
    order={effectivePreferences.order}
    activity={initialActivity}
    practiceInteraction={practiceInteraction}
    onPracticeInteractionChange={setPracticeInteraction}
    scopeSource={scopeSource}
    onScopeSourceChange={handleScopeSourceChange}
    proficiencySelection={proficiencySelection}
    learningStates={learningStates}
    hoveredGroupId={hoveredGroupId}
    onHoverGroup={setHoveredGroupId}
    onSelectionChange={handleSelectionChange}
    onProficiencySelectionChange={handleProficiencySelectionChange}
    onModeChange={handleModeChange}
    onOrderChange={handleOrderChange}
    onStart={initialActivity.kind === 'drill' ? startDrill : startPractice}
    onWorld={goToWorld}
    onExit={onExit}
    onOpenPlayground={onOpenPlayground}
    onSelectContinent={selectContinent}
    onToggleWorld={toggleWorld}
    selectionMetadata={selectionMetadata}
    entries={activeCountries}
  />
}

function sameSubregionSelection(left: readonly SubregionId[], right: readonly SubregionId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
