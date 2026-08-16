import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import { TypingInput } from '@/core/ui/TypingInput'
import { shuffle } from '@/core/scoring/quiz'
import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import { FuzzySpellingPracticeControls } from '@/features/world-countries/ui/MiniSpellingPractice'
import type { WorldCountriesDrillSelection } from './drillSelection'
import { DrillSessionRails } from './DrillSessionRails'
import { PracticeSessionRails } from './PracticeSessionRails'
import { getDrillSkillLabel } from './drillModes'
import type { WorldCountriesProficiencySelection } from './drillProficiencyScope'
import {
  getCurrentDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'

const SUCCESS_FEEDBACK_DURATION_MS = 500
const CORRECTION_FEEDBACK_DURATION_MS = 1800

interface StepFeedback {
  answer: string
  correct: boolean
  match: 'none' | 'exact' | 'fuzzy'
  expectedAnswer: string
  answerKind: 'country' | 'capital'
}

export type DrillSessionInteraction = 'recall' | 'location-click'

function answerValues(skill: WorldCountriesRecallSkill, entries: readonly Country[]): string[] {
  return entries.map(entry => skill === 'country-to-capital' ? entry.capital : entry.country)
}

function buildChoiceOptions(expected: string, values: readonly string[]): string[] {
  const alternatives = [...new Set(values.filter(value => value !== expected))]
  return shuffle([expected, ...shuffle(alternatives).slice(0, 3)])
}

export function DrillSession({
  answerMode,
  fuzzyMatching,
  state,
  selection,
  entries,
  onAnswer,
  onContinue,
  onExit,
  interaction = 'recall',
  activity = 'drill',
  learningStates = [],
  proficiencySelection = [],
}: {
  answerMode: AnswerMode
  fuzzyMatching: boolean
  state: DrillSessionState
  selection: WorldCountriesDrillSelection
  entries: readonly Country[]
  onAnswer: (record: DrillAnswerRecord) => void
  onContinue: (correct: boolean) => void
  onExit: () => void
  interaction?: DrillSessionInteraction
  activity?: 'drill' | 'practice'
  learningStates?: LearningStates
  proficiencySelection?: WorldCountriesProficiencySelection
}) {
  const step = getCurrentDrillStep(state)
  const [feedback, setFeedback] = useState<StepFeedback | null>(null)
  const startedAtRef = useRef(typeof performance === 'undefined' ? Date.now() : performance.now())

  useEffect(() => {
    setFeedback(null)
    startedAtRef.current = typeof performance === 'undefined' ? Date.now() : performance.now()
  }, [step?.countryId, step?.skill])

  useEffect(() => {
    if (!feedback || feedback.match === 'fuzzy') return
    const timer = window.setTimeout(() => {
      setFeedback(null)
      onContinue(feedback.correct)
    }, feedback.correct ? SUCCESS_FEEDBACK_DURATION_MS : CORRECTION_FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [feedback, onContinue, step?.countryId, step?.skill])

  const country = step ? entries.find(entry => entry.id === step.countryId) : undefined
  const countryById = useMemo(() => new Map(entries.map(entry => [entry.id, entry])), [entries])
  const answerOptions = useMemo(() => {
    if (!step) return []
    const expected = country && step.skill === 'country-to-capital' ? country.capital : country?.country
    return expected ? buildChoiceOptions(expected, answerValues(step.skill, entries)) : []
  }, [country, entries, step])

  if (!step || !country) return null

  const expectedAnswer = step.skill === 'country-to-capital' ? country.capital : country.country
  const isLocationQuestion = step.skill === 'location-to-country'
  const isCapitalQuestion = step.skill === 'capital-to-country'
  const isLocationPractice = interaction === 'location-click' && isLocationQuestion
  const isCapitalLocationPractice = interaction === 'location-click' && isCapitalQuestion
  const isMapClickPractice = isLocationPractice || isCapitalLocationPractice
  const scopeCountries = state.countryIds
    .map(countryId => countryById.get(countryId))
    .filter((entry): entry is Country => entry !== undefined)
  const now = () => typeof performance === 'undefined' ? Date.now() : performance.now()

  const submit = (answer: string) => {
    if (feedback) return
    const match = classifyRecallAnswer(step.skill, answer, country, {
      fuzzy: fuzzyMatching,
      countryCandidates: scopeCountries,
      capitalCandidates: scopeCountries.map(entry => entry.capital),
    })
    const correct = match !== 'none'
    const elapsed = Math.max(0, now() - startedAtRef.current)
    setFeedback({ answer, correct, match, expectedAnswer, answerKind: step.skill === 'country-to-capital' ? 'capital' : 'country' })
    onAnswer({
      countryId: step.countryId,
      skill: step.skill,
      answer,
      correct,
      at: Date.now(),
      ms: elapsed,
      evidenceKind: answerMode === 'typing' ? 'recall' : 'recognition',
    })
  }

  const submitLocation = (countryId: string) => {
    if (feedback) return
    const selectedCountry = scopeCountries.find(entry => entry.id === countryId)
    if (!selectedCountry) return
    const correct = selectedCountry.id === country.id
    const elapsed = Math.max(0, now() - startedAtRef.current)
    setFeedback({ answer: selectedCountry.country, correct, match: 'exact', expectedAnswer: country.country, answerKind: 'country' })
    onAnswer({
      countryId: country.id,
      skill: isCapitalLocationPractice ? 'capital-to-country' : 'location-to-country',
      answer: selectedCountry.country,
      correct,
      at: Date.now(),
      ms: elapsed,
      evidenceKind: 'recognition',
    })
  }

  const prompt = isLocationQuestion
    ? 'Which country is this?'
    : isCapitalQuestion
      ? 'Which country has this capital?'
      : 'What is the capital?'
  const feedbackText = feedback
    ? feedback.correct
      ? feedback.match === 'fuzzy'
        ? `Correct. The canonical answer is ${feedback.expectedAnswer}.`
        : 'Correct.'
      : `The correct ${feedback.answerKind} is ${feedback.expectedAnswer}.`
    : null
  const displayedFeedback = feedback
  const highlightedCountryId = isMapClickPractice
    ? feedback ? country.id : null
    : isCapitalQuestion ? (feedback ? country.id : null) : country.id
  const namedCountryId = isLocationQuestion || isCapitalQuestion
    ? feedback ? country.id : null
    : country.id
  const practiceNamedCountryId = isMapClickPractice ? (feedback ? country.id : null) : namedCountryId
  const practiceFeedbackText = displayedFeedback
    ? displayedFeedback.correct
      ? 'Correct location.'
      : `That was ${displayedFeedback.answer} — ${country.country} is highlighted.`
    : null

  const continueAfterFuzzyFeedback = () => {
    if (feedback?.match !== 'fuzzy') return
    setFeedback(null)
    onContinue(true)
  }

  const context = (
    <div className="px-1 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{activity === 'practice' ? 'Practice · ' : ''}{getDrillSkillLabel(step.skill)}</p>
      {isLocationPractice ? (
        <h1 className="mt-1 text-2xl font-black text-zinc-100">Find {country.country}</h1>
      ) : isCapitalLocationPractice ? (
        <>
          <h1 className="mt-1 text-3xl font-black text-zinc-100">{country.capital}</h1>
          <p className="mt-1 text-sm text-zinc-500">{prompt}</p>
        </>
      ) : isLocationQuestion ? (
        <>
          <h1 className="mt-1 text-2xl font-black text-zinc-100">{prompt}</h1>
          <p className="mt-1 text-sm text-zinc-500">The highlighted location remains the same Country used for any following Capital question.</p>
        </>
      ) : (
        <>
          <h1 className="mt-1 text-3xl font-black text-zinc-100">{isCapitalQuestion ? country.capital : country.country}</h1>
          <p className="mt-1 text-sm text-zinc-500">{prompt}</p>
        </>
      )}
    </div>
  )

  return (
    <>
      {activity === 'practice' ? (
        <PracticeSessionRails selection={selection} proficiencySelection={proficiencySelection} state={state} onExit={onExit} entries={entries} learningStates={learningStates} />
      ) : (
        <DrillSessionRails selection={selection} proficiencySelection={proficiencySelection} mode={state.mode} state={state} onExit={onExit} entries={entries} />
      )}
      <MapSurface
        context={context}
        map={(
          <div className="relative">
          <CountryLearningMap
            continent={selection.continent}
            scopeCountries={scopeCountries}
            highlightedCountryId={highlightedCountryId}
            namedCountryId={isMapClickPractice ? practiceNamedCountryId : namedCountryId}
            showHighlightedNames={isMapClickPractice ? Boolean(practiceNamedCountryId) : Boolean(namedCountryId)}
            onCountryClick={isMapClickPractice ? submitLocation : undefined}
            ariaLabel={isMapClickPractice && !feedback
              ? isCapitalLocationPractice
                ? 'Map for clicking the Country whose Capital is shown'
                : 'Map for clicking the target Country'
              : isLocationQuestion && !feedback
                ? 'Map showing the selected location for recall without the Country name revealed'
              : isCapitalQuestion && !feedback
                ? 'Map of the selected geographic scope without the target Country revealed'
              : `Map with ${country.country} highlighted for ${activity === 'practice' ? 'Practice' : 'Drill'} recall`}
          />
          {displayedFeedback && <RecallFeedback correct={displayedFeedback.correct} message={isMapClickPractice ? practiceFeedbackText : feedbackText} />}
          </div>
        )}
        dockPlacement={answerMode === 'typing' && !isMapClickPractice ? 'stacked' : 'attached'}
        dock={isMapClickPractice ? (
          <p className="text-center text-sm text-zinc-400">Click the country on the map.</p>
        ) : (
          <TaskDock variant={answerMode === 'typing' ? 'form' : 'navigation'} status={answerMode === 'typing' ? <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-400">{activity === 'practice' ? 'Practice' : 'Drill'} · {getDrillSkillLabel(step.skill)}</div> : undefined}>
            <section className="space-y-3">
            {answerMode === 'multiple-choice' ? (
              <MultipleChoice
                key={`${step.countryId}-${step.skill}`}
                options={answerOptions}
                correctAnswer={expectedAnswer}
                onAnswer={submit}
                answered={feedback?.answer ?? null}
              />
            ) : (
              <TypingInput
                key={`${step.countryId}-${step.skill}`}
                onAnswer={submit}
                answeredCorrect={feedback?.correct ?? null}
                correctAnswer={expectedAnswer}
                showCorrectAnswer={false}
                compact
                placeholder={isCapitalQuestion ? 'Type the country…' : isLocationQuestion ? 'Type the country…' : 'Type the capital…'}
              />
            )}
            {feedback?.match === 'fuzzy' && (
              <FuzzySpellingPracticeControls answer={feedback.expectedAnswer} answerKind={feedback.answerKind} onContinue={continueAfterFuzzyFeedback} />
            )}
            </section>
          </TaskDock>
        )}
      />
    </>
  )
}
