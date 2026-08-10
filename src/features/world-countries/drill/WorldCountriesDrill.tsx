import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { getCountriesForDrillSelection, withAllDrillSubregions, type WorldCountriesDrillSelection } from './drillSelection'
import { DrillResults } from './DrillResults'
import { DrillSession } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import { type WorldCountriesDrillMode } from './drillModes'
import {
  createDrillSession,
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
  const [preferences, setPreferences] = useState<WorldCountriesDrillPreferences>(loadDrillPreferences)
  const [phase, setPhase] = useState<DrillPhase>('setup')
  const [setupContinent, setSetupContinent] = useState<Continent | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])

  const entries = useMemo(
    () => getCountriesForDrillSelection(preferences),
    [preferences],
  )

  const updatePreferences = useCallback((next: WorldCountriesDrillPreferences) => {
    setPreferences(next)
    saveDrillPreferences(next)
  }, [])

  const start = useCallback(() => {
    if (entries.length === 0) return
    saveDrillPreferences(preferences)
    setAnswers([])
    setSession(createDrillSession({
      mode: preferences.mode,
      countryIds: entries.map(entry => entry.id),
    }))
    setPhase('recall')
  }, [entries, preferences])

  const answer = useCallback((record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    void recordWorldCountriesAttempt(record.countryId, record.skill, {
      at: record.at,
      ok: record.correct,
      ms: record.ms,
    })
  }, [])

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
      ...withAllDrillSubregions(continent),
      mode: preferences.mode,
    })
    setSetupContinent(continent)
    setHoveredGroupId(null)
  }, [preferences.mode, updatePreferences])

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

  if (phase === 'recall' && session) {
    return (
      <DrillSession
        answerMode={answerMode}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        state={session}
        selection={preferences}
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
        mode={preferences.mode}
        continent={preferences.continent}
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
      selection={preferences}
      mode={preferences.mode}
      hoveredGroupId={hoveredGroupId}
      onHoverGroup={setHoveredGroupId}
      onSelectionChange={handleSelectionChange}
      onModeChange={handleModeChange}
      onStart={start}
      onWorld={goToWorld}
      onSelectContinent={selectContinent}
    />
  )
}
