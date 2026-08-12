import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { getAllSubregionMetadata } from '@/features/world-countries/geography/subregionMetadataStore'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { createDrillSelection, getCountriesForDrillSelectionInEffectiveOrder, normalizeDrillSelection, type WorldCountriesDrillSelection } from './drillSelection'
import { DrillResults } from './DrillResults'
import { DrillSession, type DrillSessionInteraction } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import { isDrillPracticeMode, type WorldCountriesDrillMode } from './drillModes'
import { createDrillCountryOrder, type WorldCountriesDrillOrder } from './drillOrder'
import {
  createDrillSession,
  isDrillSessionCompatible,
  submitDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'
import {
  loadDrillPreferences,
  saveDrillPreferences,
  type WorldCountriesDrillPreferences,
} from './drillPreferences'
import { DrillGuidedLearning } from './DrillGuidedLearning'

type DrillPhase = 'setup' | 'guided' | 'recall' | 'results'
type StartSessionOptions = { persistPreferences?: boolean; interaction?: DrillSessionInteraction }

/** Thin coordinator for Drill setup, active recall, evidence, and results. */
export function WorldCountriesDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(loadDrillPreferences)
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [guidedLearning, setGuidedLearning] = useState(false)
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])
  const effectivePreferences = useMemo(
    () => ({ ...normalizeDrillSelection(preferences, activeCountries), mode: preferences.mode, order: preferences.order }),
    [activeCountries, preferences],
  )

  const entries = useMemo(
    () => getCountriesForDrillSelectionInEffectiveOrder(
      effectivePreferences,
      activeCountries,
      getContinentMetadata(effectivePreferences.continent),
      getAllSubregionMetadata(),
    ),
    [activeCountries, effectivePreferences],
  )
  const sessionMatchesActivePopulation = session
    ? isDrillSessionCompatible(session, entries)
    : false

  useEffect(() => {
    if (phase !== 'recall' || !session || sessionMatchesActivePopulation) return
    setSession(null)
    setAnswers([])
    setPhase('setup')
  }, [phase, session, sessionMatchesActivePopulation])

  const updatePreferences = useCallback((next: WorldCountriesDrillPreferences) => {
    setPreferences(next)
    saveDrillPreferences(next)
  }, [])

  const [sessionInteraction, setSessionInteraction] = useState<DrillSessionInteraction>('recall')

  const startSession = useCallback((startPreferences: WorldCountriesDrillPreferences, { persistPreferences = true, interaction = 'recall' }: StartSessionOptions = {}) => {
    const startEntries = getCountriesForDrillSelectionInEffectiveOrder(
      startPreferences,
      activeCountries,
      getContinentMetadata(startPreferences.continent),
      getAllSubregionMetadata(),
    )
    if (startEntries.length === 0) return
    if (persistPreferences) saveDrillPreferences(startPreferences)
    setAnswers([])
    setSessionInteraction(interaction)
    setSession(createDrillSession({
      mode: startPreferences.mode,
      countryIds: startEntries.map(entry => entry.id),
      countryOrder: createDrillCountryOrder(
        startEntries.map(entry => entry.id),
        startPreferences.order,
      ),
    }))
    setGuidedLearning(false)
    setPhase('recall')
  }, [activeCountries])

  const start = useCallback(() => startSession(effectivePreferences), [effectivePreferences, startSession])

  const startPractice = useCallback((practiceMode: WorldCountriesDrillMode) => {
    startSession(
      { ...effectivePreferences, mode: practiceMode },
      { persistPreferences: false, interaction: practiceMode === 'countries' ? 'location-click' : 'recall' },
    )
  }, [effectivePreferences, startSession])

  const restart = useCallback(() => {
    if (session && (sessionInteraction === 'location-click' || isDrillPracticeMode(session.mode))) {
      startSession(
        { ...effectivePreferences, mode: session.mode },
        { persistPreferences: false, interaction: sessionInteraction },
      )
      return
    }
    start()
  }, [effectivePreferences, session, start, startSession])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    if (sessionInteraction === 'location-click' || isDrillPracticeMode(session?.mode ?? effectivePreferences.mode)) return
    void recordWorldCountriesAttempt(record.countryId, record.skill, {
      at: record.at,
      ok: record.correct,
      ms: record.ms,
      evidenceKind: record.evidenceKind,
    })
  }, [effectivePreferences.mode, session?.mode, sessionInteraction])

  const continueSession = useCallback((correct: boolean) => {
    if (!session) return
    const result = submitDrillStep(session, correct)
    setSession(result.state)
    if (result.completedNow) setPhase('results')
  }, [session])

  const exitToSetup = useCallback(() => {
    setSession(null)
    setSessionInteraction('recall')
    setGuidedLearning(false)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const selectContinent = useCallback((continent: Continent) => {
    updatePreferences({
      ...createDrillSelection(continent, [], activeCountries),
      mode: preferences.mode,
      order: preferences.order,
    })
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [activeCountries, preferences.mode, preferences.order, updatePreferences])

  const goToWorld = useCallback(() => {
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const handleSelectionChange = useCallback((selection: WorldCountriesDrillSelection) => {
    updatePreferences({ ...selection, mode: preferences.mode, order: preferences.order })
  }, [preferences.mode, preferences.order, updatePreferences])

  const handleModeChange = useCallback((mode: WorldCountriesDrillMode) => {
    updatePreferences({ ...preferences, mode })
  }, [preferences, updatePreferences])

  const handleOrderChange = useCallback((order: WorldCountriesDrillOrder) => {
    updatePreferences({ ...preferences, order })
  }, [preferences, updatePreferences])

  const handleLearnCountries = useCallback(() => {
    setGuidedLearning(true)
    setPhase('guided')
  }, [])

  if (phase === 'guided' && guidedLearning && effectivePreferences.subregionIds.length === 1) {
    const subregion = effectivePreferences.subregionIds[0]
    return (
      <DrillGuidedLearning
        key={`${activeCountries.map(country => country.id).join('|')}:${entries.map(country => country.id).join('|')}`}
        continent={effectivePreferences.continent}
        subregion={subregion}
        entries={entries}
        activeCountries={activeCountries}
        locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onExit={exitToSetup}
      />
    )
  }

  if (phase === 'recall' && session && sessionMatchesActivePopulation) {
    return (
      <DrillSession
        answerMode={answerMode}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        state={session}
        interaction={sessionInteraction}
        selection={effectivePreferences}
        entries={entries}
        onAnswer={answer}
        onContinue={continueSession}
        onExit={exitToSetup}
      />
    )
  }

  if (phase === 'results') {
    return (
      <DrillResults
        mode={session?.mode ?? effectivePreferences.mode}
        continent={effectivePreferences.continent}
        scopeCountries={entries}
        answers={answers}
        onAgain={restart}
        onChangeSetup={exitToSetup}
      />
    )
  }

  return (
    <DrillSetup
      level={setupContinent ? 'continent' : 'world'}
      selection={effectivePreferences}
      mode={effectivePreferences.mode}
      order={effectivePreferences.order}
      hoveredGroupId={hoveredGroupId}
      onHoverGroup={setHoveredGroupId}
      onSelectionChange={handleSelectionChange}
      onModeChange={handleModeChange}
      onOrderChange={handleOrderChange}
      onStart={start}
      onPracticeStart={startPractice}
      onWorld={goToWorld}
      onSelectContinent={selectContinent}
      onLearnCountries={handleLearnCountries}
      entries={activeCountries}
    />
  )
}
