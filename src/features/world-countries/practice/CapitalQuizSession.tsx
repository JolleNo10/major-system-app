import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { getCurrentRecallStep, getRecallSessionTotalSteps, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import { WorldCountriesTypedAnswer, type WorldCountriesTypedAnswerEvaluation, type WorldCountriesTypedAnswerResult } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import type { PracticeRecallAnswer, PracticeQuizRun } from './practiceRun'

export function CapitalQuizSession({ run, session, fuzzyMatching, correctCount, onAnswer, onAdvance }: {
  run: PracticeQuizRun
  session: WorldCountriesRecallSessionState
  fuzzyMatching: boolean
  correctCount: number
  onAnswer: (answer: PracticeRecallAnswer) => void
  onAdvance: (result: WorldCountriesTypedAnswerResult) => void
}) {
  const emptyRails = useMemo(() => ({}), [])
  useRails(emptyRails)

  const step = getCurrentRecallStep(session)
  const country = step ? run.countries.find(candidate => candidate.id === step.countryId) : undefined
  if (!step || !country) return null

  const totalQuestions = getRecallSessionTotalSteps(session)
  const questionNumber = session.countryIndex + 1
  return (
    <WorldCountriesTypedAnswer
      promptKey={`${step.countryId}-${step.skill}`}
      answerLabel="Type the capital"
      placeholder="Type the capital…"
      correctAnswer={country.capital}
      evaluate={(answer): WorldCountriesTypedAnswerEvaluation => {
        const match = classifyRecallAnswer(step.skill, answer, country, {
          fuzzy: fuzzyMatching,
          countryCandidates: run.countries,
          capitalCandidates: run.countries.map(candidate => candidate.capital),
        })
        const outcome = match === 'exact' ? 'exact' : match === 'fuzzy' ? 'fuzzy' : 'incorrect'
        return {
          outcome,
          canonicalAnswer: country.capital,
          answerKind: 'capital',
          message: outcome === 'incorrect'
            ? `The correct capital is ${country.capital}.`
            : outcome === 'fuzzy'
              ? `Correct. The canonical answer is ${country.capital}.`
              : 'Correct.',
        }
      }}
      onAnswer={(answer, evaluation) => {
        onAnswer({ countryId: country.id, skill: 'country-to-capital', outcome: evaluation.outcome, submittedAnswer: answer })
      }}
      reveal={{ canonicalAnswer: country.capital, answerKind: 'capital', message: `The capital is ${country.capital}.` }}
      onTransition={onAdvance}
    >
      {typed => (
        <section className="mx-auto w-full max-w-2xl space-y-6 py-8" aria-labelledby="world-countries-capitals-quiz-question">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold tabular-nums text-zinc-500">Question {questionNumber} / {totalQuestions}</p>
            <h1 id="world-countries-capitals-quiz-question" className="text-3xl font-black text-zinc-100">What is the capital of {country.country}?</h1>
          </div>
          <div className="space-y-3">
            {typed.input}
            <p className="text-sm font-semibold text-zinc-400">{correctCount} correct</p>
            <button type="button" disabled={!typed.isAnswerable} onClick={() => {
              if (!typed.reveal()) return
              onAnswer({ countryId: country.id, skill: 'country-to-capital', outcome: 'revealed' })
            }} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">Don&apos;t know</button>
            {typed.feedbackOverlay}
          </div>
        </section>
      )}
    </WorldCountriesTypedAnswer>
  )
}
