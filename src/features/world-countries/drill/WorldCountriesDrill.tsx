import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getAllSubregionMetadata, getSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getCountriesForSubregionInEffectiveOrder, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { CountryLearningFlow } from '@/features/world-countries/learning/flows/CountryLearningFlow'
import { CapitalLearningFlow } from '@/features/world-countries/learning/flows/CapitalLearningFlow'
import { isWorldCountriesLearningMode, type WorldCountriesLearnPracticeMode, type WorldCountriesLearningMode, type WorldCountriesPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { DrillResults } from './DrillResults'
import { PracticeResults } from './PracticeResults'
import { DrillSession, type DrillSessionInteraction } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import type { WorldCountriesDrillMode } from './drillModes'
import { createDrillCountryOrder, getWorldCountriesSessionOrder, type WorldCountriesDrillOrder } from './drillOrder'
import { createDrillSelection, getCountriesForDrillSelectionInEffectiveOrder, normalizeDrillSelection, type WorldCountriesDrillSelection } from './drillSelection'
import {
  createDrillSession,
  isDrillSessionCompatible,
  submitDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'
import { loadDrillPreferences, saveDrillPreferences, type WorldCountriesDrillPreferences } from './drillPreferences'

type DrillPhase = 'setup' | 'learning' | 'practice' | 'recall' | 'results'
type ActivityPurpose = 'drill' | 'learn-practise'
type LearningRun = { mode: WorldCountriesLearningMode; subregionIds: readonly SubregionId[]; index: number }
type StartSessionOptions = {
  persistPreferences?: boolean
  interaction?: DrillSessionInteraction
  activity?: 'drill' | 'practice'
  skills?: DrillAnswerRecord['skill'][]
}

/** Coordinator for setup, the three Drill modes, durable Learning, and non-recording Practice. */
export function WorldCountriesDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(loadDrillPreferences)
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [purpose, setPurpose] = useState<ActivityPurpose | null>(null)
  const [learnPracticeMode, setLearnPracticeMode] = useState<WorldCountriesLearnPracticeMode>('learn-countries')
  const [learningRun, setLearningRun] = useState<LearningRun | null>(null)
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [sessionActivity, setSessionActivity] = useState<'drill' | 'practice'>('drill')
  const [sessionInteraction, setSessionInteraction] = useState<DrillSessionInteraction>('recall')
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])
  const [geographyVersion, setGeographyVersion] = useState(0)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const effectivePreferences = useMemo(
    () => ({ ...normalizeDrillSelection(preferences, activeCountries), mode: preferences.mode, order: preferences.order }),
    [activeCountries, preferences],
  )
  const entries = useMemo(
    () => getCountriesForDrillSelectionInEffectiveOrder(effectivePreferences, activeCountries, getContinentMetadata(effectivePreferences.continent), getAllSubregionMetadata()),
    [activeCountries, effectivePreferences],
  )
  const sessionMatchesActivePopulation = session ? isDrillSessionCompatible(session, entries) : false
  const learningStates = useMemo(() => getAllSubregionLearningStates(activeCountries), [activeCountries, phase])
  const learningEntries = useMemo(() => {
    if (!learningRun) return []
    const subregion = learningRun.subregionIds[learningRun.index]
    return subregion ? getCountriesForSubregionInEffectiveOrder(subregion, activeCountries, getSubregionMetadata(subregion)) : []
  }, [activeCountries, geographyVersion, learningRun])
  const learningSubregion = learningRun?.subregionIds[learningRun.index] ?? null
  const learningState = learningSubregion ? learningStates.find(state => state.subregionId === learningSubregion) : undefined

  useEffect(() => {
    if (phase !== 'recall' && phase !== 'practice' || !session || sessionMatchesActivePopulation) return
    setSession(null)
    setAnswers([])
    setPhase('setup')
  }, [phase, session, sessionMatchesActivePopulation])

  const updatePreferences = useCallback((next: WorldCountriesDrillPreferences) => {
    setPreferences(next)
    saveDrillPreferences(next)
  }, [])

  const startSession = useCallback((startPreferences: WorldCountriesDrillPreferences, { persistPreferences = true, interaction = 'recall', activity = 'drill', skills }: StartSessionOptions = {}) => {
    const startEntries = getCountriesForDrillSelectionInEffectiveOrder(startPreferences, activeCountries, getContinentMetadata(startPreferences.continent), getAllSubregionMetadata())
    if (startEntries.length === 0) return
    if (persistPreferences) saveDrillPreferences(startPreferences)
    setAnswers([])
    setSessionActivity(activity)
    setSessionInteraction(interaction)
    setSession(createDrillSession({
      mode: startPreferences.mode,
      ...(skills ? { skills } : {}),
      countryIds: startEntries.map(entry => entry.id),
      countryOrder: createDrillCountryOrder(startEntries.map(entry => entry.id), getWorldCountriesSessionOrder(activity, startPreferences.order)),
    }))
    setLearningRun(null)
    setPhase(activity === 'practice' ? 'practice' : 'recall')
  }, [activeCountries])

  const startDrill = useCallback(() => startSession(effectivePreferences), [effectivePreferences, startSession])

  const startPractice = useCallback((practiceMode: WorldCountriesPracticeMode) => {
    const skill = practiceMode === 'locate-countries' ? 'location-to-country' : 'country-to-capital'
    startSession(effectivePreferences, { persistPreferences: false, activity: 'practice', skills: [skill], interaction: practiceMode === 'locate-countries' ? 'location-click' : 'recall' })
  }, [effectivePreferences, startSession])

  const orderedSelectedSubregions = useMemo(() => {
    const selected = new Set(effectivePreferences.subregionIds)
    return getSubregionsForContinentInEffectiveOrder(effectivePreferences.continent, activeCountries, getContinentMetadata(effectivePreferences.continent))
      .map(item => item.id)
      .filter(id => selected.has(id))
  }, [activeCountries, effectivePreferences.continent, effectivePreferences.subregionIds, geographyVersion])

  const startLearning = useCallback((mode: WorldCountriesLearningMode) => {
    if (orderedSelectedSubregions.length === 0) return
    setLearningRun({ mode, subregionIds: orderedSelectedSubregions, index: 0 })
    setPurpose('learn-practise')
    setPhase('learning')
  }, [orderedSelectedSubregions])

  const completeLearningSubregion = useCallback(() => {
    if (!learningRun) return
    if (learningRun.index >= learningRun.subregionIds.length - 1) {
      setLearningRun(null)
      setSetupContinent(effectivePreferences.continent)
      setPhase('setup')
    } else {
      setLearningRun({ ...learningRun, index: learningRun.index + 1 })
    }
  }, [effectivePreferences.continent, learningRun])

  const restart = useCallback(() => {
    if (!session) return
    if (sessionActivity === 'practice') {
      const mode: WorldCountriesPracticeMode = sessionInteraction === 'location-click' ? 'locate-countries' : 'capitals'
      startPractice(mode)
    } else startDrill()
  }, [session, sessionActivity, sessionInteraction, startDrill, startPractice])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    if (sessionActivity === 'practice') return
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
    setLearningRun(null)
    setSessionInteraction('recall')
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const selectContinent = useCallback((continent: Continent) => {
    updatePreferences({ ...createDrillSelection(continent, [], activeCountries), mode: preferences.mode, order: preferences.order })
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [activeCountries, preferences.mode, preferences.order, updatePreferences])

  const goToWorld = useCallback(() => { setSetupContinent(null); setHoveredGroupId(null) }, [])
  const handleSelectionChange = useCallback((selection: WorldCountriesDrillSelection) => updatePreferences({ ...selection, mode: preferences.mode, order: preferences.order }), [preferences.mode, preferences.order, updatePreferences])
  const handleModeChange = useCallback((mode: WorldCountriesDrillMode) => updatePreferences({ ...preferences, mode }), [preferences, updatePreferences])
  const handleOrderChange = useCallback((order: WorldCountriesDrillOrder) => updatePreferences({ ...preferences, order }), [preferences, updatePreferences])
  const geographyChanged = useCallback(() => setGeographyVersion(version => version + 1), [])
  const mnemonicChanged = useCallback(() => setMnemonicVersion(version => version + 1), [])

  if (phase === 'learning' && learningRun && learningSubregion) {
    const doneLabel = learningRun.index === learningRun.subregionIds.length - 1 ? 'Back to Learn & Practise' : 'Continue to next Subregion'
    const onDone = completeLearningSubregion
    if (learningRun.mode === 'learn-countries') {
      return <CountryLearningFlow key={learningSubregion} continent={effectivePreferences.continent} subregion={learningSubregion} entries={learningEntries} activeCountries={activeCountries} locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} mnemonicVersion={mnemonicVersion} onGeographyChanged={geographyChanged} onMnemonicChanged={mnemonicChanged} />
    }
    return <CapitalLearningFlow key={learningSubregion} continent={effectivePreferences.continent} subregion={learningSubregion} entries={learningEntries} activeCountries={activeCountries} countriesLearned={Boolean(learningState?.countriesLearnedAt)} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} onPhaseChange={() => undefined} onExit={exitToSetup} onDone={onDone} doneLabel={doneLabel} mnemonicVersion={mnemonicVersion} onGeographyChanged={geographyChanged} onMnemonicChanged={mnemonicChanged} />
  }

  if ((phase === 'recall' || phase === 'practice') && session && sessionMatchesActivePopulation) {
    return <DrillSession answerMode={answerMode} fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching} state={session} interaction={sessionInteraction} activity={sessionActivity} learningStates={learningStates} selection={effectivePreferences} entries={entries} onAnswer={answer} onContinue={continueSession} onExit={exitToSetup} />
  }

  if (phase === 'results') {
    if (sessionActivity === 'practice') return <PracticeResults continent={effectivePreferences.continent} scopeCountries={entries} answers={answers} onAgain={restart} onChangeSetup={exitToSetup} />
    return <DrillResults mode={session?.mode ?? effectivePreferences.mode} continent={effectivePreferences.continent} scopeCountries={entries} answers={answers} onAgain={restart} onChangeSetup={exitToSetup} />
  }

  return <DrillSetup
    key={setupContinent ?? 'world'}
    level={setupContinent ? 'continent' : 'world'}
    selection={effectivePreferences}
    mode={effectivePreferences.mode}
    order={effectivePreferences.order}
    purpose={purpose}
    learnPracticeMode={learnPracticeMode}
    learningStates={learningStates}
    hoveredGroupId={hoveredGroupId}
    onHoverGroup={setHoveredGroupId}
    onSelectionChange={handleSelectionChange}
    onModeChange={handleModeChange}
    onOrderChange={handleOrderChange}
    onPurposeChange={setPurpose}
    onLearnPracticeModeChange={setLearnPracticeMode}
    onStart={startDrill}
    onLearnPracticeStart={mode => isWorldCountriesLearningMode(mode) ? startLearning(mode) : startPractice(mode)}
    onWorld={goToWorld}
    onSelectContinent={selectContinent}
    onGeographyChanged={geographyChanged}
    entries={activeCountries}
  />
}
