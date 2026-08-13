import { useEffect, useRef, useState } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SchedulerLearningSession } from '@/features/world-countries/learning/schedulerLearningSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { useLearningMapPresentation } from './LearningMapSurface'
import { LearningHeader } from './MemoryPreviewStep'

export interface SchedulerAnswerEvaluation {
  correct: boolean
  fuzzyMatch: boolean
  canonicalAnswer: string
}

export function SchedulerPracticeStep({
  continent,
  entries,
  session,
  stepLabel,
  questionLabel,
  questionTitle,
  answerLabel,
  placeholder,
  showCountryName,
  showMap = true,
  promptText = 'Identify the highlighted location',
  evaluateAnswer,
  formatFeedback,
  onSubmit,
  onBack,
  onExit,
  surface = false,
}: {
  continent: Continent
  entries: readonly Country[]
  session: SchedulerLearningSession
  stepLabel: string
  questionLabel: string
  questionTitle: string
  answerLabel: string
  placeholder: string
  showCountryName: boolean
  showMap?: boolean
  promptText?: string
  evaluateAnswer: (answer: string, country: Country) => SchedulerAnswerEvaluation
  formatFeedback: (evaluation: SchedulerAnswerEvaluation, country: Country) => string
  onSubmit: (correct: boolean, latencyMs: number) => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ evaluation: SchedulerAnswerEvaluation; expectedId: string; latencyMs: number } | null>(null)
  const startedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const currentId = session.currentKey
  useEffect(() => { startedAt.current = Date.now() }, [currentId])
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      const answerResult = feedback
      setFeedback(null)
      setAnswer('')
      onSubmit(answerResult.evaluation.correct, answerResult.latencyMs)
    }, feedback.evaluation.correct ? 500 : 1800)
    return () => window.clearTimeout(timer)
  }, [feedback, onSubmit])
  useEffect(() => { if (!feedback) inputRef.current?.focus() }, [currentId, feedback])

  const current = entries.find(entry => entry.id === currentId)
  if (!current) return null
  const expected = entries.find(entry => entry.id === feedback?.expectedId) ?? current
  const submit = () => {
    if (feedback || !answer.trim()) return
    const evaluation = evaluateAnswer(answer, current)
    setFeedback({ evaluation, expectedId: current.id, latencyMs: Date.now() - startedAt.current })
  }
  const ariaLabel = showCountryName
    ? `Map showing ${current.country} for practice`
    : 'Map for typed Country practice without the Country name revealed'
  useLearningMapPresentation({
    highlightedCountryId: expected.id,
    namedCountryId: showCountryName ? expected.id : null,
    showHighlightedNames: showCountryName,
    ariaLabel,
  }, [expected.id, showCountryName, ariaLabel])

  const feedbackNode = feedback && <RecallFeedback correct={feedback.evaluation.correct} message={formatFeedback(feedback.evaluation, expected)} />
  const form = (
    <form onSubmit={event => { event.preventDefault(); submit() }} className="space-y-3">
      <label htmlFor="staged-learning-answer" className="block text-sm text-zinc-400">{answerLabel}</label>
      <div className="flex gap-2">
        <input ref={inputRef} id="staged-learning-answer" autoComplete="off" value={answer} onChange={event => setAnswer(event.target.value)} disabled={feedback !== null} autoFocus placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-cyan-500 disabled:opacity-60" />
        {!feedback && <button type="submit" data-primary-action className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Check</button>}
      </div>
    </form>
  )
  const dock = (
    <TaskDock status={<><span className="block text-xs font-semibold uppercase tracking-wider text-cyan-400">{questionLabel}</span><span className="mt-1 block text-2xl font-black text-zinc-100">{showCountryName ? current.country : promptText}</span></>}>
      {feedbackNode}
      {form}
      {!surface && <button type="button" onClick={onBack} className="mt-3 w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>}
    </TaskDock>
  )
  if (surface) return dock

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label={stepLabel} title={questionTitle} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"><span className="text-zinc-500">Spaced practice</span><span className="font-semibold text-cyan-300">{questionLabel}</span></div>
      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-center"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{questionLabel}</p><h2 className="mt-2 text-3xl font-black text-zinc-100">{showCountryName ? current.country : promptText}</h2></section>
      {showMap && <div className="relative"><CountryLearningMap continent={continent} scopeCountries={entries} highlightedCountryId={expected.id} namedCountryId={showCountryName ? expected.id : null} showHighlightedNames={showCountryName} ariaLabel={ariaLabel} />{feedbackNode}</div>}
      {!showMap && feedbackNode}
      {form}
      <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>
    </div>
  )
}
