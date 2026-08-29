import { useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import { shuffle } from '@/core/scoring/quiz'
import type { Country, CountryId } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { deriveRecallTaskPresentation } from '@/features/world-countries/learning/recallTaskPresentation'
import { getCurrentRecallStep, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { WorldCountriesSubregionScope } from '@/features/world-countries/geography/subregionScope'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { PracticeSessionRails } from './PracticeSessionRails'
import type { PracticeRecallOutcome } from './practiceRun'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesTypedAnswer } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'

const SUCCESS_FEEDBACK_DURATION_MS = 500
const CORRECTION_FEEDBACK_DURATION_MS = 1800

export interface PracticeSessionAnswer {
  countryId: CountryId
  skill: WorldCountriesRecallSkill
  answer: string
  correct: boolean
}

export type PracticeSessionInteraction = 'recall' | 'location-click'

interface StepFeedback {
  answer: string
  correct: boolean
  match: 'none' | 'exact' | 'fuzzy'
  expectedAnswer: string
  answerKind: 'country' | 'capital'
}

export function PracticeSession({ answerMode, fuzzyMatching, state, selection, scopeLabel, entries, onAnswer, onContinue, onExit, interaction = 'recall', proficiencySelection = [], learningStates }: {
  answerMode: AnswerMode
  fuzzyMatching: boolean
  state: WorldCountriesRecallSessionState
  selection: WorldCountriesSubregionScope
  scopeLabel?: string
  entries: readonly Country[]
  onAnswer: (record: PracticeSessionAnswer) => void
  onContinue: (correct: boolean) => void
  onExit: () => void
  interaction?: PracticeSessionInteraction
  proficiencySelection?: readonly string[]
  learningStates: LearningStates
}) {
  const step = getCurrentRecallStep(state)
  const [feedback, setFeedback] = useState<StepFeedback | null>(null)
  const stepKey = step ? `${step.countryId}-${step.skill}` : null

  useEffect(() => {
    setFeedback(null)
  }, [stepKey])

  useEffect(() => {
    if (!feedback || feedback.match === 'fuzzy') return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      onContinue(feedback.correct)
    }, feedback.correct ? SUCCESS_FEEDBACK_DURATION_MS : CORRECTION_FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [feedback, onContinue])

  const country = step ? entries.find(entry => entry.id === step.countryId) : undefined
  const scopeCountries = useMemo(() => state.countryIds.map(countryId => entries.find(entry => entry.id === countryId)).filter((entry): entry is Country => entry !== undefined), [entries, state.countryIds])
  const answerOptions = useMemo(() => {
    if (!step || !country) return []
    const expected = step.skill === 'country-to-capital' ? country.capital : country.country
    const values = entries.map(entry => step.skill === 'country-to-capital' ? entry.capital : entry.country)
    return shuffle([expected, ...shuffle([...new Set(values.filter(value => value !== expected))]).slice(0, 3)])
  }, [country, entries, step])

  if (!step || !country) return null

  const expectedAnswer = step.skill === 'country-to-capital' ? country.capital : country.country
  const task = deriveRecallTaskPresentation(step.skill, country)
  const isLocationQuestion = step.skill === 'location-to-country'
  const isCapitalQuestion = step.skill === 'capital-to-country'
  const isMapClickPractice = interaction === 'location-click'
  const isTypedRecall = answerMode === 'typing' && !isMapClickPractice
  const resolvedScopeLabel = scopeLabel ?? 'World'

  const submit = (answer: string) => {
    if (feedback) return
    const match = classifyRecallAnswer(step.skill, answer, country, { fuzzy: fuzzyMatching, countryCandidates: scopeCountries, capitalCandidates: scopeCountries.map(entry => entry.capital) })
    const correct = match !== 'none'
    setFeedback({ answer, correct, match, expectedAnswer, answerKind: task.answerKind })
    onAnswer({ countryId: step.countryId, skill: step.skill, answer, correct })
  }

  const submitLocation = (countryId: string) => {
    if (feedback) return
    const selectedCountry = scopeCountries.find(entry => entry.id === countryId)
    if (!selectedCountry) return
    const correct = selectedCountry.id === country.id
    setFeedback({ answer: selectedCountry.country, correct, match: 'exact', expectedAnswer: country.country, answerKind: 'country' })
    onAnswer({ countryId: country.id, skill: isCapitalQuestion ? 'capital-to-country' : 'location-to-country', answer: selectedCountry.country, correct })
  }

  const activityTask: WorldCountriesActivityTask = {
    direction: task.direction,
    cue: task.cue,
    sessionContext: <><span className="text-zinc-300">{resolvedScopeLabel}</span> · Practice</>,
    answerKind: task.answerKind,
    progress: { label: 'Country', current: Math.min(state.countryIndex + 1, state.countryOrder.length), total: state.countryOrder.length, percent: state.countryOrder.length ? Math.round((state.countryIndex / state.countryOrder.length) * 100) : 0 },
  }
  const highlightedCountryId = isMapClickPractice ? (feedback ? country.id : null) : country.id
  const namedCountryId = isMapClickPractice ? (feedback ? country.id : null) : country.id
  const feedbackText = feedback ? feedback.correct ? feedback.match === 'fuzzy' ? `Correct. The canonical answer is ${feedback.expectedAnswer}.` : 'Correct.' : `The correct ${feedback.answerKind} is ${feedback.expectedAnswer}.` : null
  const practiceFeedbackText = feedback ? feedback.correct ? 'Correct location.' : `That was ${feedback.answer} — ${country.country} is highlighted.` : null
  const map = <div className="relative"><CountryLearningMap continent={country.continent} scopeCountries={scopeCountries.filter(entry => entry.continent === country.continent)} highlightFill={getWorldCountriesTaskHighlightFill(task.answerKind)} answerSelectionCountryIds={isMapClickPractice ? scopeCountries.map(entry => entry.id) : undefined} taskTargetCountryId={(!isMapClickPractice && isLocationQuestion) || (isMapClickPractice && Boolean(feedback)) ? country.id : null} highlightedCountryId={highlightedCountryId} namedCountryId={namedCountryId} showHighlightedNames={Boolean(namedCountryId)} onCountryClick={isMapClickPractice ? submitLocation : undefined} ariaLabel={isMapClickPractice ? isCapitalQuestion ? 'Map for clicking the Country whose Capital is shown' : 'Map for clicking the target Country' : `Map with ${country.country} highlighted for Practice recall`} />{feedback && <RecallFeedback correct={feedback.correct} message={isMapClickPractice ? practiceFeedbackText : feedbackText} />}</div>
  const dock = isMapClickPractice ? <p className="sr-only">Click a Country on the map to answer.</p> : <TaskDock variant={answerMode === 'typing' ? 'form' : 'navigation'}><section className="space-y-3">{answerMode === 'multiple-choice' ? <MultipleChoice key={stepKey} options={answerOptions} correctAnswer={expectedAnswer} onAnswer={submit} answered={feedback?.answer ?? null} /> : null}</section></TaskDock>

  if (isTypedRecall) {
    return <WorldCountriesTypedAnswer promptKey={`${step.countryId}-${step.skill}`} answerLabel={task.typedAnswerLabel} placeholder={task.typedPlaceholder} correctAnswer={expectedAnswer} allowIncorrectSpellingPractice evaluate={answer => { const match = classifyRecallAnswer(step.skill, answer, country, { fuzzy: fuzzyMatching, countryCandidates: scopeCountries, capitalCandidates: scopeCountries.map(entry => entry.capital) }); const outcome: PracticeRecallOutcome = match === 'exact' ? 'exact' : match === 'fuzzy' ? 'fuzzy' : 'incorrect'; return { outcome, canonicalAnswer: expectedAnswer, answerKind: task.answerKind, message: outcome === 'incorrect' ? `The correct ${task.answerKind} is ${expectedAnswer}.` : outcome === 'fuzzy' ? `Correct. The canonical answer is ${expectedAnswer}.` : 'Correct.' } }} onAnswer={(answer, evaluation) => onAnswer({ countryId: step.countryId, skill: step.skill, answer, correct: evaluation.outcome !== 'incorrect' })} onTransition={result => onContinue(result.outcome !== 'incorrect')}>
      {typed => <><PracticeSessionRails selection={selection} scopeLabel={resolvedScopeLabel} proficiencySelection={proficiencySelection} state={state} onExit={onExit} entries={entries} learningStates={learningStates} /><WorldCountriesMapActivitySurface task={activityTask} map={map} feedbackOverlay={typed.feedbackOverlay} dockPlacement="stacked" dock={<TaskDock variant="form"><section className="space-y-3">{typed.input}</section></TaskDock>} /></>}
    </WorldCountriesTypedAnswer>
  }

  return <><PracticeSessionRails selection={selection} scopeLabel={resolvedScopeLabel} proficiencySelection={proficiencySelection} state={state} onExit={onExit} entries={entries} learningStates={learningStates} /><WorldCountriesMapActivitySurface task={activityTask} map={map} dockPlacement={answerMode === 'typing' && !isMapClickPractice ? 'stacked' : 'attached'} dock={dock} /></>
}
