import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { useWorldCountriesGeographyRevision } from '@/features/world-countries/geography/geographyRefresh'
import { readWorldCountriesGeography } from '@/features/world-countries/geography/worldScope'
import { getAllSubregionLearningStates, useWorldCountriesSubregionLearningRevision } from '@/features/world-countries/learning/subregionLearningStore'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import { isWorldCountriesLearningMode, type WorldCountriesLearningMode } from '@/features/world-countries/learning/learnPracticeModes'
import type { WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { DrillResults } from './DrillResults'
import { PracticeResults } from '@/features/world-countries/practice/PracticeResults'
import { PracticeSession, type PracticeSessionAnswer, type PracticeSessionInteraction } from '@/features/world-countries/practice/PracticeSession'
import { DrillSession } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import type { WorldCountriesDrillMode } from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { clearDrillSelection, getCountriesForDrillSelectionInEffectiveOrder, normalizeDrillSelection, selectAllDrillSubregions, type DrillSelectionMetadata, type WorldCountriesDrillSelection } from './drillSelection'
import {
  createDrillSession,
  isDrillSessionCompatible,
  submitDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'
import { loadDrillPreferences, saveDrillPreferences, type WorldCountriesDrillPreferences } from './drillPreferences'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'
import { getRetryableFailedDrillCountryIds } from './drillResultSummary'
import { resolveDrillSessionLaunch, type WorldCountriesDrillSessionLaunch } from './drillSessionLaunch'
import type { WorldCountriesLearnPracticeMode } from './learnPracticeSetupModes'
import {
  advanceDrillLearningRun,
  deriveDrillLearningScope,
  getDrillLearningRunDoneLabel,
  resolveDrillLearningRunLaunch,
  type DrillLearningRun,
} from './drillLearningRun'

type DrillPhase = 'setup' | 'learning' | 'practice' | 'recall' | 'results'
type ActivityPurpose = 'drill' | 'learn-practise'
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

/** Coordinator for setup, the four Drill modes, durable Learning, and non-recording Practice. */
export function WorldCountriesDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(loadDrillPreferences)
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [purpose, setPurpose] = useState<ActivityPurpose | null>('drill')
  const [learnPracticeMode, setLearnPracticeMode] = useState<WorldCountriesLearnPracticeMode>('learn-countries')
  const [proficiencySelection, setProficiencySelection] = useState<WorldCountriesProficiencySelection>([])
  const [learningRun, setLearningRun] = useState<DrillLearningRun | null>(null)
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveDrillRun | null>(null)
  const geographyRevision = useWorldCountriesGeographyRevision()
  const learningRevision = useWorldCountriesSubregionLearningRevision()
  const selectionMetadata = useMemo<DrillSelectionMetadata>(() => {
    void geographyRevision
    return readWorldCountriesGeography(activeCountries).metadata
  }, [activeCountries, geographyRevision])
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
  const learningScope = useMemo(
    () => deriveDrillLearningScope(learningRun, activeCountries, learningStates, selectionMetadata.subregions ?? []),
    [activeCountries, learningRun, learningStates, selectionMetadata.subregions],
  )

  useEffect(() => {
    if (phase !== 'recall' && phase !== 'practice' || !activeRun || activeRunMatchesPopulation) return
    setActiveRun(null)
    setPhase('setup')
  }, [activeRun, activeRunMatchesPopulation, phase])

  const updatePreferences = useCallback((next: WorldCountriesDrillPreferences) => {
    const normalized = {
      ...normalizeDrillSelection(next, activeCountries, selectionMetadata),
      mode: next.mode,
      order: next.order,
    }
    setPreferences(normalized)
    saveDrillPreferences(normalized)
  }, [activeCountries, selectionMetadata])

  const startSession = useCallback((startPreferences: WorldCountriesDrillPreferences, { persistPreferences = true, interaction = 'recall', activity = 'drill', skills, practiceMode, countryIds }: StartSessionOptions = {}) => {
    const applyLaunch = (launch: WorldCountriesDrillSessionLaunch | null) => {
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
      setLearningRun(null)
      setPhase(launch.activity === 'practice' ? 'practice' : 'recall')
    }

    const launch = resolveDrillSessionLaunch({
      startPreferences,
      activeCountries,
      proficiencySelection,
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
  }, [activeCountries, proficiencySelection, selectionMetadata, setupContinent])

  const startDrill = useCallback(() => startSession(effectivePreferences), [effectivePreferences, startSession])

  const startPractice = useCallback((practiceMode: WorldCountriesPracticeMode) => {
    const skill = practiceMode === 'locate-countries'
      ? 'location-to-country'
      : practiceMode === 'locate-capitals'
        ? 'capital-to-country'
        : 'country-to-capital'
    startSession(effectivePreferences, {
      persistPreferences: false,
      activity: 'practice',
      practiceMode,
      skills: [skill],
      interaction: practiceMode === 'capitals' ? 'recall' : 'location-click',
    })
  }, [effectivePreferences, startSession])

  const startLearning = useCallback((mode: WorldCountriesLearningMode) => {
    const launch = resolveDrillLearningRunLaunch({
      mode,
      selectedSubregionIds: effectivePreferences.subregionIds,
      proficiencySelection,
      proficiencyContinent: setupContinent,
      activeCountries,
      drillMode: effectivePreferences.mode,
      newItemsPerSet: settings.worldCountriesNewItemsPerSet,
      subregionMetadata: selectionMetadata.subregions ?? [],
    })
    const applyLaunch = (run: DrillLearningRun | null) => {
      if (!run) return
      setLearningRun(run)
      setPurpose('learn-practise')
      setPhase('learning')
    }
    if (launch instanceof Promise) void launch.then(applyLaunch)
    else applyLaunch(launch)
  }, [activeCountries, effectivePreferences, proficiencySelection, selectionMetadata.subregions, settings.worldCountriesNewItemsPerSet, setupContinent])

  const completeLearningSubregion = useCallback(() => {
    if (!learningRun) return
    const progression = advanceDrillLearningRun(learningRun)
    if (progression.kind === 'advance') {
      setLearningRun(progression.run)
      return
    }
    setLearningRun(null)
    setSetupContinent(null)
    setPhase('setup')
  }, [learningRun])

  const restart = useCallback(() => {
    if (!activeRunActivity) return
    if (activeRunActivity === 'practice') {
      if (!activePracticeMode) return
      startPractice(activePracticeMode)
    } else startDrill()
  }, [activePracticeMode, activeRunActivity, startDrill, startPractice])

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
    void recordWorldCountriesAttempt(record.countryId, record.skill, { at: record.at, ok: record.correct, ms: record.ms, evidenceKind: record.evidenceKind })
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
    setActiveRun(null)
    setLearningRun(null)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const selectContinent = useCallback((continent: Continent) => {
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [])

  const goToWorld = useCallback(() => { setSetupContinent(null); setHoveredGroupId(null) }, [])
  const handleSelectionChange = useCallback((selection: WorldCountriesDrillSelection) => {
    setProficiencySelection([])
    updatePreferences({ ...selection, mode: preferences.mode, order: preferences.order })
  }, [preferences.mode, preferences.order, updatePreferences])
  const selectAllWorld = useCallback(() => {
    setProficiencySelection([])
    updatePreferences({ ...selectAllDrillSubregions(activeCountries, selectionMetadata), mode: preferences.mode, order: preferences.order })
  }, [activeCountries, preferences.mode, preferences.order, selectionMetadata, updatePreferences])
  const clearWorld = useCallback(() => {
    setProficiencySelection([])
    updatePreferences({ ...clearDrillSelection(), mode: preferences.mode, order: preferences.order })
  }, [preferences.mode, preferences.order, updatePreferences])
  const handleProficiencySelectionChange = useCallback((selection: WorldCountriesProficiencySelection) => {
    setProficiencySelection(selection)
    if (selection.length > 0) updatePreferences({ ...clearDrillSelection(), mode: preferences.mode, order: preferences.order })
  }, [preferences.mode, preferences.order, updatePreferences])
  const handleModeChange = useCallback((mode: WorldCountriesDrillMode) => updatePreferences({ ...preferences, mode }), [preferences, updatePreferences])
  const handleOrderChange = useCallback((order: WorldCountriesDrillOrder) => updatePreferences({ ...preferences, order }), [preferences, updatePreferences])
  const learningContinent = learningScope.continent ?? setupContinent ?? null

  if (phase === 'learning' && learningRun && learningScope.entries.length > 0 && learningContinent) {
    const doneLabel = getDrillLearningRunDoneLabel(learningRun)
    const onDone = completeLearningSubregion
    if (learningRun.mode === 'learn-countries') {
      return <CountryLearningFlow key={learningScope.subregionId ?? learningRun.countryIds?.join(',')} continent={learningContinent} subregion={learningScope.subregionId ?? undefined} scopeLabel={learningRun.scopeLabel} entries={learningScope.entries} activeCountries={activeCountries} newItemsPerSet={learningRun.newItemsPerSet} schedulerSettings={{ masteryLatencyFactor: settings.masteryLatencyFactor, sessionUnmasteredShare: settings.sessionUnmasteredShare }} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} allowIncorrectSpellingPractice recordCompletion={learningRun.recordCompletion} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} />
    }
    return <CapitalLearningFlow key={learningScope.subregionId ?? learningRun.countryIds?.join(',')} continent={learningContinent} subregion={learningScope.subregionId ?? undefined} scopeLabel={learningRun.scopeLabel} entries={learningScope.entries} activeCountries={activeCountries} newItemsPerSet={learningRun.newItemsPerSet} schedulerSettings={{ masteryLatencyFactor: settings.masteryLatencyFactor, sessionUnmasteredShare: settings.sessionUnmasteredShare }} countriesLearned={Boolean(learningScope.state?.countriesLearnedAt)} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} allowIncorrectSpellingPractice recordCompletion={learningRun.recordCompletion} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} />
  }

  if ((phase === 'recall' || phase === 'practice') && activeRun && activeRunMatchesPopulation) {
    if (activeRun.activity === 'practice') {
      return <PracticeSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={activeRun.session} interaction={activeRun.interaction} learningStates={learningStates} proficiencySelection={proficiencySelection} selection={activeRun.selection} scopeLabel={activeRun.scopeLabel} entries={sessionEntries} onAnswer={answerPractice} onContinue={continueSession} onExit={exitToSetup} />
    }
    return <DrillSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={activeRun.session} selection={activeRun.selection} scopeLabel={activeRun.scopeLabel} entries={sessionEntries} proficiencySelection={proficiencySelection} activeCountries={activeCountries} onAnswer={answer} onContinue={continueSession} onExit={exitToSetup} />
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
    purpose={purpose}
    learnPracticeMode={learnPracticeMode}
    proficiencySelection={proficiencySelection}
    learningStates={learningStates}
    hoveredGroupId={hoveredGroupId}
    onHoverGroup={setHoveredGroupId}
    onSelectionChange={handleSelectionChange}
    onProficiencySelectionChange={handleProficiencySelectionChange}
    onModeChange={handleModeChange}
    onOrderChange={handleOrderChange}
    onPurposeChange={setPurpose}
    onLearnPracticeModeChange={setLearnPracticeMode}
    onStart={startDrill}
    onLearnPracticeStart={mode => isWorldCountriesLearningMode(mode) ? startLearning(mode) : startPractice(mode)}
    onWorld={goToWorld}
    onSelectContinent={selectContinent}
    onSelectAllWorld={selectAllWorld}
    onClearWorld={clearWorld}
    selectionMetadata={selectionMetadata}
    entries={activeCountries}
  />
}

function sameSubregionSelection(left: readonly SubregionId[], right: readonly SubregionId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
