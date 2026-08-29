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
import { isWorldCountriesLearningMode, type WorldCountriesLearnPracticeMode, type WorldCountriesLearningMode } from '@/features/world-countries/learning/learnPracticeModes'
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
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [sessionSelection, setSessionSelection] = useState<WorldCountriesDrillSelection | null>(null)
  const [sessionScopeLabel, setSessionScopeLabel] = useState<string | null>(null)
  const [sessionActivity, setSessionActivity] = useState<'drill' | 'practice'>('drill')
  const [sessionInteraction, setSessionInteraction] = useState<PracticeSessionInteraction>('recall')
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])
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
    () => session
      ? session.countryIds.map(countryId => activeCountries.find(country => country.id === countryId)).filter((country): country is typeof activeCountries[number] => country !== undefined)
      : geographicEntries,
    [activeCountries, geographicEntries, session],
  )
  const sessionMatchesActivePopulation = session ? isDrillSessionCompatible(session, activeCountries) : false
  const learningStates = useMemo(() => {
    void learningRevision
    return getAllSubregionLearningStates(activeCountries)
  }, [activeCountries, learningRevision])
  const learningScope = useMemo(
    () => deriveDrillLearningScope(learningRun, activeCountries, learningStates, selectionMetadata.subregions ?? []),
    [activeCountries, learningRun, learningStates, selectionMetadata.subregions],
  )

  useEffect(() => {
    if (phase !== 'recall' && phase !== 'practice' || !session || sessionMatchesActivePopulation) return
    setSession(null)
    setSessionSelection(null)
    setSessionScopeLabel(null)
    setAnswers([])
    setPhase('setup')
  }, [phase, session, sessionMatchesActivePopulation])

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
      if (!launch) return
      if (persistPreferences) saveDrillPreferences(startPreferences)
      setAnswers([])
      setSessionActivity(launch.activity)
      setSessionInteraction(launch.interaction)
      setSessionSelection(launch.selection)
      setSessionScopeLabel(launch.scopeLabel)
      setSession(createDrillSession({
        mode: startPreferences.mode,
        ...(launch.skills ? { skills: launch.skills } : {}),
        countryIds: launch.countryIds,
        countryOrder: launch.countryOrder,
      }))
      setLearningRun(null)
      setPhase(activity === 'practice' ? 'practice' : 'recall')
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
    if (!session) return
    if (sessionActivity === 'practice') {
      const mode: WorldCountriesPracticeMode = sessionInteraction === 'location-click'
        ? session.skills?.[0] === 'capital-to-country' ? 'locate-capitals' : 'locate-countries'
        : 'capitals'
      startPractice(mode)
    } else startDrill()
  }, [session, sessionActivity, sessionInteraction, startDrill, startPractice])

  const retryFailedCountryIds = useMemo(() => {
    if (phase !== 'results' || sessionActivity !== 'drill' || !session) return []
    return getRetryableFailedDrillCountryIds(answers, session.countryIds, activeCountries.map(country => country.id))
  }, [activeCountries, answers, phase, session, sessionActivity])

  const retryFailedCountries = useCallback(() => {
    if (!session || retryFailedCountryIds.length === 0) return
    void startSession(
      { ...effectivePreferences, mode: session.mode },
      { persistPreferences: false, countryIds: retryFailedCountryIds },
    )
  }, [effectivePreferences, retryFailedCountryIds, session, startSession])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    if (sessionActivity === 'practice' || record.assisted) return
    void recordWorldCountriesAttempt(record.countryId, record.skill, { at: record.at, ok: record.correct, ms: record.ms, evidenceKind: record.evidenceKind })
  }, [sessionActivity])

  const answerPractice = useCallback((record: PracticeSessionAnswer) => {
    answer({
      ...record,
      at: Date.now(),
      ms: 0,
      evidenceKind: sessionInteraction === 'location-click' ? 'recognition' : 'recall',
    })
  }, [answer, sessionInteraction])

  const continueSession = useCallback((correct: boolean) => {
    if (!session) return
    const result = submitDrillStep(session, correct)
    setSession(result.state)
    if (result.completedNow) setPhase('results')
  }, [session])

  const exitToSetup = useCallback(() => {
    setSession(null)
    setSessionSelection(null)
    setSessionScopeLabel(null)
    setLearningRun(null)
    setSessionInteraction('recall')
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

  if ((phase === 'recall' || phase === 'practice') && session && sessionMatchesActivePopulation) {
    if (sessionActivity === 'practice') {
      return <PracticeSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={session} interaction={sessionInteraction} learningStates={learningStates} proficiencySelection={proficiencySelection} selection={sessionSelection ?? effectivePreferences} scopeLabel={sessionScopeLabel ?? undefined} entries={sessionEntries} onAnswer={answerPractice} onContinue={continueSession} onExit={exitToSetup} />
    }
    return <DrillSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={session} selection={sessionSelection ?? effectivePreferences} scopeLabel={sessionScopeLabel ?? undefined} entries={sessionEntries} proficiencySelection={proficiencySelection} activeCountries={activeCountries} onAnswer={answer} onContinue={continueSession} onExit={exitToSetup} />
  }

  if (phase === 'results') {
    if (sessionActivity === 'practice') return <PracticeResults scopeCountries={sessionEntries} answers={answers} onAgain={restart} onChangeSetup={exitToSetup} />
    return <DrillResults mode={session?.mode ?? effectivePreferences.mode} scopeCountries={sessionEntries} answers={answers} retryFailedCountryCount={retryFailedCountryIds.length} onRetryFailedCountries={retryFailedCountries} onAgain={restart} onChangeSetup={exitToSetup} />
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
