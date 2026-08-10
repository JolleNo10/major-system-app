import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { MultipleChoice } from '@/core/ui/MultipleChoice'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import { TypingInput } from '@/core/ui/TypingInput'
import { shuffle } from '@/core/scoring/quiz'
import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import type { WorldCountriesDrillSelection } from './drillSelection'
import { DrillSessionRails } from './DrillRails'
import { getDrillSkillLabel } from './drillModes'
import {
  getCurrentDrillStep,
  type DrillAnswerRecord,
  type DrillSessionState,
} from './drillSessionState'

interface StepFeedback {
  answer: string
  correct: boolean
  match: 'none' | 'exact' | 'fuzzy'
}

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
}: {
  answerMode: AnswerMode
  fuzzyMatching: boolean
  state: DrillSessionState
  selection: WorldCountriesDrillSelection
  entries: readonly Country[]
  onAnswer: (record: DrillAnswerRecord) => void
  onContinue: (correct: boolean) => void
  onExit: () => void
}) {
  const step = getCurrentDrillStep(state)
  const [feedback, setFeedback] = useState<StepFeedback | null>(null)
  const startedAtRef = useRef(typeof performance === 'undefined' ? Date.now() : performance.now())

  useEffect(() => {
    setFeedback(null)
    startedAtRef.current = typeof performance === 'undefined' ? Date.now() : performance.now()
  }, [step?.countryId, step?.skill])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      onContinue(feedback.correct)
    }, feedback.correct ? 500 : 1800)
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
    setFeedback({ answer, correct, match })
    onAnswer({
      countryId: step.countryId,
      skill: step.skill,
      answer,
      correct,
      at: Date.now(),
      ms: elapsed,
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
        ? `Correct. The canonical answer is ${expectedAnswer}.`
        : 'Correct.'
      : `The correct ${isCapitalQuestion || isLocationQuestion ? 'country' : 'capital'} is ${expectedAnswer}.`
    : null
  const highlightedCountryId = isCapitalQuestion ? (feedback ? country.id : null) : country.id
  const namedCountryId = isLocationQuestion || isCapitalQuestion
    ? feedback ? country.id : null
    : country.id

  return (
    <>
      <DrillSessionRails selection={selection} mode={state.mode} state={state} onExit={onExit} />
      <div className="space-y-4 animate-fade-in">
        <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{getDrillSkillLabel(step.skill)}</p>
          {isLocationQuestion ? (
            <h1 className="mt-1 text-2xl font-black text-zinc-100">{prompt}</h1>
          ) : (
            <>
              <h1 className="mt-1 text-3xl font-black text-zinc-100">{isCapitalQuestion ? country.capital : country.country}</h1>
              <p className="mt-1 text-sm text-zinc-500">{prompt}</p>
            </>
          )}
          {isLocationQuestion && <p className="mt-1 text-xs text-zinc-500">The highlighted location remains the same Country used for any following Capital question.</p>}
        </section>

        <div className="relative">
          <CountryLearningMap
            continent={selection.continent}
            scopeCountries={scopeCountries}
            highlightedCountryId={highlightedCountryId}
            namedCountryId={namedCountryId}
            showHighlightedNames={Boolean(namedCountryId)}
            ariaLabel={isCapitalQuestion && !feedback
              ? 'Map of the selected geographic scope without the target Country revealed'
              : `Map with ${country.country} highlighted for Drill recall`}
          />
          {feedback && <RecallFeedback correct={feedback.correct} message={feedbackText} />}
        </div>

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
              placeholder={isCapitalQuestion ? 'Type the country…' : isLocationQuestion ? 'Type the country…' : 'Type the capital…'}
            />
          )}

        </section>
      </div>
    </>
  )
}
