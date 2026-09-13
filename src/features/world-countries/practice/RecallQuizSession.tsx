import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { classifyRecallAnswer, getRecallAnswerKindMistakeMessage } from '@/features/world-countries/learning/recallAnswerMatching'
import { deriveRecallTaskPresentation } from '@/features/world-countries/learning/recallTaskPresentation'
import { getCurrentRecallStep, getRecallSessionTotalSteps, type WorldCountriesRecallSessionState } from '@/features/world-countries/learning/recallSession'
import { WorldCountriesTypedAnswer, type WorldCountriesTypedAnswerEvaluation, type WorldCountriesTypedAnswerResult } from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { PracticeRecallAnswer, PracticeQuizRun } from './practiceRun'

export function RecallQuizSession({ run, session, fuzzyMatching, correctCount, onAnswer, onAdvance, onExit }: {
  run: PracticeQuizRun
  session: WorldCountriesRecallSessionState
  fuzzyMatching: boolean
  correctCount: number
  onAnswer: (answer: PracticeRecallAnswer) => void
  onAdvance: (result: WorldCountriesTypedAnswerResult) => void
  onExit?: () => void
}) {
  const rails = useMemo(() => onExit ? ({ right: <WorldCountriesPanel><button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Exit Quiz</button></WorldCountriesPanel>, rightLabel: 'Quiz' }) : ({}), [onExit])
  useRails(rails)

  const step = getCurrentRecallStep(session)
  const country = step ? run.countries.find(candidate => candidate.id === step.countryId) : undefined
  if (!step || !country) return null

  const skill = step.skill
  if (skill !== 'country-to-capital' && skill !== 'capital-to-country') return null
  if (skill !== run.skill) return null
  const task = deriveRecallTaskPresentation(skill, country)
  const expectedAnswer = task.answerKind === 'capital' ? country.capital : country.country
  const question = skill === 'country-to-capital'
    ? `What is the capital of ${country.country}?`
    : `What country is ${country.capital} the capital of?`
  const totalQuestions = getRecallSessionTotalSteps(session)
  const questionNumber = session.countryIndex + 1
  return (
    <WorldCountriesTypedAnswer
      promptKey={`${step.countryId}-${skill}`}
      answerKind={task.answerKind}
      answerLabel={task.typedAnswerLabel}
      placeholder={task.typedPlaceholder}
      correctAnswer={expectedAnswer}
      evaluate={(answer): WorldCountriesTypedAnswerEvaluation => {
        const match = classifyRecallAnswer(skill, answer, country, {
          fuzzy: fuzzyMatching,
          countryCandidates: run.countries,
          capitalCandidates: run.countries.map(candidate => candidate.capital),
        })
        const outcome = match === 'wrong-kind' ? 'wrong-kind' : match === 'exact' ? 'exact' : match === 'fuzzy' ? 'fuzzy' : 'incorrect'
        return {
          outcome,
          canonicalAnswer: expectedAnswer,
          answerKind: task.answerKind,
          message: outcome === 'wrong-kind'
            ? getRecallAnswerKindMistakeMessage(skill)
            : outcome === 'incorrect'
            ? `The correct ${task.answerKind} is ${expectedAnswer}.`
            : outcome === 'fuzzy'
              ? `Correct. The canonical answer is ${expectedAnswer}.`
              : 'Correct.',
        }
      }}
      onAnswer={(answer, evaluation) => {
        if (evaluation.outcome === 'wrong-kind') return
        onAnswer({ countryId: country.id, skill, outcome: evaluation.outcome, submittedAnswer: answer })
      }}
      reveal={{ canonicalAnswer: expectedAnswer, answerKind: task.answerKind, message: `The ${task.answerKind} is ${expectedAnswer}.` }}
      onTransition={onAdvance}
    >
      {typed => (
        <section className="mx-auto w-full max-w-2xl space-y-6 py-8" aria-labelledby="world-countries-recall-quiz-question">
          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold tabular-nums text-zinc-500">Question {questionNumber} / {totalQuestions}</p>
            <h1 id="world-countries-recall-quiz-question" className="text-3xl font-black text-zinc-100">{question}</h1>
          </div>
          <div className="space-y-3">
            {typed.input}
            <p className="text-sm font-semibold text-zinc-400">{correctCount} correct</p>
            <button type="button" disabled={!typed.isAnswerable} onClick={() => {
              if (!typed.reveal()) return
              onAnswer({ countryId: country.id, skill, outcome: 'revealed' })
            }} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40">Don&apos;t know</button>
            {typed.feedbackOverlay}
          </div>
        </section>
      )}
    </WorldCountriesTypedAnswer>
  )
}
