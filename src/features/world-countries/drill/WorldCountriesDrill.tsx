import { useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import { getCountriesForDrillSelection } from './drillSelection'
import { DrillResults } from './DrillResults'
import { DrillSession } from './DrillSession'
import { DrillSetup } from './DrillSetup'
import { getSkillsForDrillMode, type WorldCountriesDrillMode } from './drillModes'
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
  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [answers, setAnswers] = useState<DrillAnswerRecord[]>([])

  const entries = useMemo(
    () => getCountriesForDrillSelection(preferences),
    [preferences],
  )

  const updatePreferences = (next: WorldCountriesDrillPreferences) => {
    setPreferences(next)
    saveDrillPreferences(next)
  }

  const start = () => {
    if (entries.length === 0) return
    saveDrillPreferences(preferences)
    setAnswers([])
    setSession(createDrillSession({
      mode: preferences.mode,
      countryIds: entries.map(entry => entry.id),
    }))
    setPhase('recall')
  }

  const answer = (record: DrillAnswerRecord) => {
    setAnswers(previous => [...previous, record])
    void recordWorldCountriesAttempt(record.countryId, record.skill, {
      at: record.at,
      ok: record.correct,
      ms: record.ms,
    })
  }

  const continueSession = (correct: boolean) => {
    if (!session) return
    const result = submitDrillStep(session, correct)
    setSession(result.state)
    if (result.completedNow) setPhase('results')
  }

  const exitToSetup = () => {
    setSession(null)
    setPhase('setup')
  }

  if (phase === 'recall' && session) {
    return (
      <DrillSession
        answerMode={answerMode}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        state={session}
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
        entries={entries}
        answers={answers}
        onAgain={start}
        onChangeSetup={exitToSetup}
      />
    )
  }

  return (
    <DrillSetup
      selection={preferences}
      mode={preferences.mode}
      onSelectionChange={selection => updatePreferences({ ...selection, mode: preferences.mode })}
      onModeChange={(mode: WorldCountriesDrillMode) => updatePreferences({ ...preferences, mode })}
      onStart={start}
    />
  )
}
