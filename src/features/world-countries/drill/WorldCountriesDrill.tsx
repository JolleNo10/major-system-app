import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { useWorldCountriesPopulation } from '@/features/world-countries/worldCountriesPopulation'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { getCountriesForDrillSelection, normalizeDrillSelection, withAllDrillSubregions, type WorldCountriesDrillSelection } from './drillSelection'
import { DrillResults } from './DrillResults'
import { DrillSession } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import { isDrillPracticeMode, type WorldCountriesDrillMode } from './drillModes'
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

type DrillPhase = 'setup' | 'recall' | 'results'

/** Thin coordinator for Drill setup, active recall, evidence, and results. */
export function WorldCountriesDrill({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(loadDrillPreferences)
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])
  const effectivePreferences = useMemo(
    () => ({ ...normalizeDrillSelection(preferences, activeCountries), mode: preferences.mode }),
    [activeCountries, preferences],
  )

  const entries = useMemo(
    () => getCountriesForDrillSelection(effectivePreferences, activeCountries),
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

  const start = useCallback(() => {
    if (entries.length === 0) return
    saveDrillPreferences(preferences)
    setAnswers([])
    setSession(createDrillSession({
      mode: effectivePreferences.mode,
      countryIds: entries.map(entry => entry.id),
    }))
    setPhase('recall')
  }, [entries, effectivePreferences, preferences])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    if (isDrillPracticeMode(effectivePreferences.mode)) return
    void recordWorldCountriesAttempt(record.countryId, record.skill, {
      at: record.at,
      ok: record.correct,
      ms: record.ms,
      evidenceKind: record.evidenceKind,
    })
  }, [effectivePreferences.mode])

  const continueSession = useCallback((correct: boolean) => {
    if (!session) return
    const result = submitDrillStep(session, correct)
    setSession(result.state)
    if (result.completedNow) setPhase('results')
  }, [session])

  const exitToSetup = useCallback(() => {
    setSession(null)
    setPhase('setup')
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const selectContinent = useCallback((continent: Continent) => {
    updatePreferences({
      ...withAllDrillSubregions(continent, activeCountries),
      mode: preferences.mode,
    })
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [activeCountries, preferences.mode, updatePreferences])

  const goToWorld = useCallback(() => {
    setSetupContinent(null)
    setHoveredGroupId(null)
  }, [])

  const handleSelectionChange = useCallback((selection: WorldCountriesDrillSelection) => {
    updatePreferences({ ...selection, mode: preferences.mode })
  }, [preferences.mode, updatePreferences])

  const handleModeChange = useCallback((mode: WorldCountriesDrillMode) => {
    updatePreferences({ ...preferences, mode })
  }, [preferences, updatePreferences])

  if (phase === 'recall' && session && sessionMatchesActivePopulation) {
    return (
      <DrillSession
        answerMode={answerMode}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        state={session}
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
        mode={effectivePreferences.mode}
        continent={effectivePreferences.continent}
        scopeCountries={entries}
        answers={answers}
        onAgain={start}
        onChangeSetup={exitToSetup}
      />
    )
  }

  return (
    <DrillSetup
      level={setupContinent ? 'continent' : 'world'}
      selection={effectivePreferences}
      mode={effectivePreferences.mode}
      hoveredGroupId={hoveredGroupId}
      onHoverGroup={setHoveredGroupId}
      onSelectionChange={handleSelectionChange}
      onModeChange={handleModeChange}
      onStart={start}
      onWorld={goToWorld}
      onSelectContinent={selectContinent}
      entries={activeCountries}
    />
  )
}
