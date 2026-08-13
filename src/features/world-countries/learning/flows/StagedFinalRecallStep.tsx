import { useEffect, useRef, useState } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { OrderedRecallState } from '@/features/world-countries/learning/orderedRecallSession'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { useLearningMapPresentation } from './LearningMapSurface'
import { LearningHeader } from './MemoryPreviewStep'
import type { SchedulerAnswerEvaluation } from './SchedulerPracticeStep'

export function StagedFinalRecallStep({
  continent,
  entries,
  ordered,
  stepLabel,
  answerLabel,
  placeholder,
  showCountryName,
  evaluateAnswer,
  formatFeedback,
  onSubmit,
  onBack,
  onExit,
  surface = false,
}: {
  continent: Continent
  entries: readonly Country[]
  ordered: OrderedRecallState<string>
  stepLabel: string
  answerLabel: string
  placeholder: string
  showCountryName: boolean
  evaluateAnswer: (answer: string, country: Country) => SchedulerAnswerEvaluation
  formatFeedback: (evaluation: SchedulerAnswerEvaluation, country: Country) => string
  onSubmit: (correct: boolean) => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ evaluation: SchedulerAnswerEvaluation; expectedId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = entries.find(entry => entry.id === ordered.order[ordered.currentIndex])
  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => {
      const answerResult = feedback
      setFeedback(null)
      setAnswer('')
      onSubmit(answerResult.evaluation.correct)
    }, feedback.evaluation.correct ? 500 : 1800)
    return () => window.clearTimeout(timer)
  }, [feedback, onSubmit])
  useEffect(() => { if (!feedback) inputRef.current?.focus() }, [feedback, ordered.currentIndex])
  const display = entries.find(entry => entry.id === feedback?.expectedId) ?? current
  useLearningMapPresentation({
    highlightedCountryId: display?.id ?? null,
    namedCountryId: display && (showCountryName || Boolean(feedback?.evaluation.correct)) ? display.id : null,
    showHighlightedNames: showCountryName,
    showHoverNames: true,
    ariaLabel: 'Highlighted Country for final recall',
  }, [display?.id, showCountryName, feedback?.evaluation.correct])
  if (!current || !display) return null

  const submit = () => {
    if (feedback || !answer.trim()) return
    setFeedback({ evaluation: evaluateAnswer(answer, current), expectedId: current.id })
  }
  const feedbackNode = feedback && <RecallFeedback variant="inline" correct={feedback.evaluation.correct} message={formatFeedback(feedback.evaluation, display)} detail={!feedback.evaluation.correct ? 'The ordered repair traversal rewinds before the next clean pass.' : undefined} />
  const form = (
    <form onSubmit={event => { event.preventDefault(); submit() }} className="space-y-3">
      <label htmlFor="staged-final-answer" className="block text-sm text-zinc-400">{answerLabel}</label>
      <div className="flex gap-2">
        <input ref={inputRef} id="staged-final-answer" autoComplete="off" value={answer} onChange={event => setAnswer(event.target.value)} disabled={feedback !== null} autoFocus placeholder={placeholder} className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-cyan-500 disabled:opacity-60" />
        {!feedback && <button type="submit" data-primary-action className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Check</button>}
      </div>
    </form>
  )
  const dock = (
    <TaskDock variant="form" status={<span className="text-sm text-zinc-400">{ordered.mode === 'repair' ? 'Repair traversal' : 'Effective Country order'} · {ordered.currentIndex + 1} / {ordered.order.length}</span>}>
      {feedbackNode}
      {form}
      {!surface && <button type="button" onClick={onBack} className="mt-3 w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back to Final recall</button>}
    </TaskDock>
  )
  if (surface) return dock

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label={stepLabel} title={`${ordered.currentIndex + 1} / ${ordered.order.length}`} onExit={onExit} />
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"><span className="text-zinc-500">{ordered.mode === 'repair' ? 'Repair traversal' : 'Effective Country order'}</span><span className="font-semibold text-cyan-300">{answerLabel}</span></div>
      <div className="relative"><CountryLearningMap continent={continent} scopeCountries={entries} highlightedCountryId={display.id} namedCountryId={showCountryName || Boolean(feedback?.evaluation.correct) ? display.id : null} showHighlightedNames={showCountryName} showHoverNames ariaLabel="Highlighted Country for final recall" />{feedbackNode}</div>
      {form}
      <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back to Final recall</button>
    </div>
  )
}
