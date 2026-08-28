import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent, Country, CountryId } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getAllSubregionMetadata, getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getAllContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForSubregionInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import { isWorldCountriesLearningMode, type WorldCountriesLearnPracticeMode, type WorldCountriesLearningMode, type WorldCountriesPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import { loadWorldCountriesRecallProgress, recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { DrillResults } from './DrillResults'
import { PracticeResults } from './PracticeResults'
import { DrillSession, type DrillSessionInteraction } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
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
import { resolveDrillProficiencyScope, type WorldCountriesProficiencySelection } from './drillProficiencyScope'
import { getRetryableFailedDrillCountryIds } from './drillResultSummary'
import { resolveDrillSessionLaunch, type WorldCountriesDrillSessionLaunch } from './drillSessionLaunch'
import type { LearningSetMaximum } from '@/features/world-countries/learning/stagedLearningPlan'

type DrillPhase = 'setup' | 'learning' | 'practice' | 'recall' | 'results'
type ActivityPurpose = 'drill' | 'learn-practise'
type LearningRun = {
  mode: WorldCountriesLearningMode
  subregionIds: readonly SubregionId[]
  countryIds?: readonly CountryId[]
  index: number
  newItemsPerSet: LearningSetMaximum
  scopeLabel?: string
  recordCompletion: boolean
}
type StartSessionOptions = {
  persistPreferences?: boolean
  interaction?: DrillSessionInteraction
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
  const [learningRun, setLearningRun] = useState<LearningRun | null>(null)
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [sessionSelection, setSessionSelection] = useState<WorldCountriesDrillSelection | null>(null)
  const [sessionScopeLabel, setSessionScopeLabel] = useState<string | null>(null)
  const [sessionActivity, setSessionActivity] = useState<'drill' | 'practice'>('drill')
  const [sessionInteraction, setSessionInteraction] = useState<DrillSessionInteraction>('recall')
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])
  const [geographyVersion, setGeographyVersion] = useState(0)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const selectionMetadata = useMemo<DrillSelectionMetadata>(() => ({
    world: getWorldMetadata(),
    continents: getAllContinentMetadata(),
    subregions: getAllSubregionMetadata(),
  }), [activeCountries, geographyVersion])
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
  const learningStates = useMemo(() => getAllSubregionLearningStates(activeCountries), [activeCountries, phase])
  const learningEntries = useMemo(() => {
    if (!learningRun) return []
    if (learningRun.countryIds) {
      return learningRun.countryIds.map(countryId => activeCountries.find(country => country.id === countryId)).filter((country): country is Country => country !== undefined)
    }
    const subregion = learningRun.subregionIds[learningRun.index]
    return subregion ? getCountriesForSubregionInEffectiveOrder(subregion, activeCountries, getSubregionMetadata(subregion)) : []
  }, [activeCountries, geographyVersion, learningRun])
  const learningSubregion = learningRun?.subregionIds[learningRun.index] ?? null
  const learningState = learningSubregion ? learningStates.find(state => state.subregionId === learningSubregion) : undefined

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

  const orderedSelectedSubregions = effectivePreferences.subregionIds

  const startLearning = useCallback(async (mode: WorldCountriesLearningMode) => {
    if (proficiencySelection.length > 0) {
      if (!setupContinent) return
      const progress = await loadWorldCountriesRecallProgress({ countryIds: activeCountries.map(country => country.id), skills: [...getSkillsForDrillMode(effectivePreferences.mode)] })
      const proficiencyScope = resolveDrillProficiencyScope(
        setupContinent,
        proficiencySelection,
        progress,
        { kind: 'drill', mode: effectivePreferences.mode },
        activeCountries,
        selectionMetadata.subregions ?? [],
      )
      if (proficiencyScope.countryIds.length === 0) return
      setLearningRun({ mode, subregionIds: [], countryIds: proficiencyScope.countryIds, index: 0, newItemsPerSet: settings.worldCountriesNewItemsPerSet, scopeLabel: 'Proficiency scope', recordCompletion: false })
    } else {
      if (orderedSelectedSubregions.length === 0) return
      setLearningRun({ mode, subregionIds: orderedSelectedSubregions, index: 0, newItemsPerSet: settings.worldCountriesNewItemsPerSet, recordCompletion: true })
    }
    setPurpose('learn-practise')
    setPhase('learning')
  }, [activeCountries, effectivePreferences, orderedSelectedSubregions, proficiencySelection, selectionMetadata.subregions, settings.worldCountriesNewItemsPerSet, setupContinent])

  const learningContinent = learningEntries[0]?.continent ?? setupContinent ?? null

  const completeLearningSubregion = useCallback(() => {
    if (!learningRun) return
    if (learningRun.countryIds) {
      setLearningRun(null)
      setSetupContinent(null)
      setPhase('setup')
      return
    }
    if (learningRun.index >= learningRun.subregionIds.length - 1) {
      setLearningRun(null)
      setSetupContinent(null)
      setPhase('setup')
    } else {
      setLearningRun({ ...learningRun, index: learningRun.index + 1 })
    }
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
  const geographyChanged = useCallback(() => setGeographyVersion(version => version + 1), [])
  const mnemonicChanged = useCallback(() => setMnemonicVersion(version => version + 1), [])

  if (phase === 'learning' && learningRun && learningEntries.length > 0 && learningContinent) {
    const doneLabel = learningRun.countryIds || learningRun.index === learningRun.subregionIds.length - 1 ? 'Back to Learn & Practise' : 'Continue to next Subregion'
    const onDone = completeLearningSubregion
    if (learningRun.mode === 'learn-countries') {
      return <CountryLearningFlow key={learningSubregion ?? learningRun.countryIds?.join(',')} continent={learningContinent} subregion={learningSubregion ?? undefined} scopeLabel={learningRun.scopeLabel} entries={learningEntries} activeCountries={activeCountries} newItemsPerSet={learningRun.newItemsPerSet} schedulerSettings={{ masteryLatencyFactor: settings.masteryLatencyFactor, sessionUnmasteredShare: settings.sessionUnmasteredShare }} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} allowIncorrectSpellingPractice recordCompletion={learningRun.recordCompletion} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} mnemonicVersion={mnemonicVersion} onGeographyChanged={geographyChanged} onMnemonicChanged={mnemonicChanged} />
    }
    return <CapitalLearningFlow key={learningSubregion ?? learningRun.countryIds?.join(',')} continent={learningContinent} subregion={learningSubregion ?? undefined} scopeLabel={learningRun.scopeLabel} entries={learningEntries} activeCountries={activeCountries} newItemsPerSet={learningRun.newItemsPerSet} schedulerSettings={{ masteryLatencyFactor: settings.masteryLatencyFactor, sessionUnmasteredShare: settings.sessionUnmasteredShare }} countriesLearned={Boolean(learningState?.countriesLearnedAt)} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} allowIncorrectSpellingPractice recordCompletion={learningRun.recordCompletion} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} mnemonicVersion={mnemonicVersion} onGeographyChanged={geographyChanged} onMnemonicChanged={mnemonicChanged} />
  }

  if ((phase === 'recall' || phase === 'practice') && session && sessionMatchesActivePopulation) {
    return <DrillSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={session} interaction={sessionInteraction} activity={sessionActivity} learningStates={learningStates} proficiencySelection={proficiencySelection} selection={sessionSelection ?? effectivePreferences} scopeLabel={sessionScopeLabel ?? undefined} entries={sessionEntries} activeCountries={activeCountries} onAnswer={answer} onContinue={continueSession} onExit={exitToSetup} mnemonicVersion={mnemonicVersion} onMnemonicChanged={mnemonicChanged} />
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
    onGeographyChanged={geographyChanged}
    entries={activeCountries}
  />
}

function sameSubregionSelection(left: readonly SubregionId[], right: readonly SubregionId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index])
}
