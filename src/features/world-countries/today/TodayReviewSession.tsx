import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import {
  createWorldCountriesTodayReviewQueue,
  getCurrentWorldCountriesTodayReviewPrompt,
  getWorldCountriesTodayReviewStillNeedsWork,
  isWorldCountriesTodayReviewQueueComplete,
  submitWorldCountriesTodayReviewPrompt,
  type WorldCountriesTodayReviewQueueState,
} from './reviewQueue'
import type { WorldCountriesTodayReviewCandidate } from './todayPlan'

export interface WorldCountriesTodayReviewCheckpoint {
  reviewed: number
  correctFirstTry: number
  recoveredOnRetry: number
  stillNeedsWork: number
}

export function TodayReviewSession({
  candidates,
  activeCountries,
  fuzzyMatching,
  onDone,
  onExit,
}: {
  candidates: readonly WorldCountriesTodayReviewCandidate[]
  activeCountries: readonly Country[]
  fuzzyMatching: boolean
  onDone: (checkpoint: WorldCountriesTodayReviewCheckpoint) => void
  onExit: () => void
}) {
  const [queue, setQueue] = useState<WorldCountriesTodayReviewQueueState>(() => createWorldCountriesTodayReviewQueue(candidates))
  const [feedback, setFeedback] = useState<{ correct: boolean; write: Promise<void> } | null>(null)
  const [answer, setAnswer] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const startedAtRef = useRef(Date.now())
  const pendingWritesRef = useRef<Promise<void>[]>([])
  const prompt = getCurrentWorldCountriesTodayReviewPrompt(queue)

  useEffect(() => {
    setFeedback(null)
    setAnswer('')
    startedAtRef.current = Date.now()
    inputRef.current?.focus()
  }, [prompt?.candidate.target.countryId, prompt?.candidate.target.skill, prompt?.kind])

  if (!prompt) return null
  const { candidate } = prompt
  const country = candidate.country
  const skill: WorldCountriesRecallSkill = candidate.target.skill
  const isLocationQuestion = skill === 'location-to-country'
  const expectedAnswer = isLocationQuestion ? country.country : country.capital
  const promptLabel = isLocationQuestion ? 'Which country is this?' : 'What is the capital?'
  const canDelayRetry = prompt.kind === 'initial' && queue.prompts.length - queue.cursor - 1 >= 2

  const finishOrAdvance = async (result: 'correct' | 'incorrect' | 'skip') => {
    if (advancing) return
    setAdvancing(true)
    if (feedback) await feedback.write.catch(() => undefined)
    const nextQueue = submitWorldCountriesTodayReviewPrompt(queue, result)
    setQueue(nextQueue)
    setFeedback(null)
    setAnswer('')
    setAdvancing(false)
    if (isWorldCountriesTodayReviewQueueComplete(nextQueue)) {
      onDone({
        reviewed: nextQueue.reviewed,
        correctFirstTry: nextQueue.correctFirstTry,
        recoveredOnRetry: nextQueue.recoveredOnRetry,
        stillNeedsWork: getWorldCountriesTodayReviewStillNeedsWork(nextQueue),
      })
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (feedback || !answer.trim()) return
    const match = classifyRecallAnswer(skill, answer.trim(), country, {
      fuzzy: fuzzyMatching,
      countryCandidates: activeCountries,
      capitalCandidates: activeCountries.map(entry => entry.capital),
    })
    const correct = match !== 'none'
    const write = recordWorldCountriesAttempt(country.id, skill, {
      at: Date.now(),
      ok: correct,
      ms: Math.max(0, Date.now() - startedAtRef.current),
      evidenceKind: 'recall',
    })
    pendingWritesRef.current.push(write)
    void write.then(() => {
      pendingWritesRef.current = pendingWritesRef.current.filter(candidate => candidate !== write)
    }, () => {
      pendingWritesRef.current = pendingWritesRef.current.filter(candidate => candidate !== write)
    })
    setFeedback({ correct, write })
  }

  const exit = async () => {
    await Promise.all(pendingWritesRef.current)
    onExit()
  }

  const map = (
    <div className="relative">
      <CountryLearningMap
        continent={country.continent}
        scopeCountries={activeCountries}
        highlightedCountryId={country.id}
        namedCountryId={feedback || !isLocationQuestion ? country.id : null}
        showHighlightedNames={Boolean(feedback) || !isLocationQuestion}
        showHoverNames={false}
        ariaLabel={isLocationQuestion && !feedback
          ? 'Map showing the selected location for Today recall without the Country name revealed'
          : `Map with ${country.country} highlighted for Today recall`}
      />
      {feedback && (
        <RecallFeedback
          correct={feedback.correct}
          message={feedback.correct ? 'Correct.' : `The correct answer is ${expectedAnswer}.`}
        />
      )}
    </div>
  )

  const context = (
    <div className="px-1 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today · Review</p>
      <h1 className="mt-1 text-2xl font-black text-zinc-100">{promptLabel}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {isLocationQuestion ? 'Type the Country name.' : `Type the capital of ${country.country}.`}
      </p>
    </div>
  )

  const dock = (
    <TaskDock variant="form" status={<div className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-400">{prompt.kind === 'retry' ? 'Delayed retry' : 'Core review'} · {queue.cursor + 1} / {queue.prompts.length}</div>}>
      {!feedback ? (
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="today-review-answer" className="sr-only">{isLocationQuestion ? 'Type the Country name' : 'Type the capital'}</label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="today-review-answer"
              autoComplete="off"
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              placeholder={isLocationQuestion ? 'Type the Country…' : 'Type the capital…'}
              className="min-w-0 flex-1 rounded-[9px] border border-zinc-600 bg-zinc-800/95 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
            />
            <button type="submit" data-primary-action disabled={!answer.trim() || advancing} className="shrink-0 rounded-[9px] border border-cyan-600 bg-cyan-600 px-3.5 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">Check</button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p role="status" aria-live="polite" className={feedback.correct ? 'text-sm text-green-300' : 'text-sm text-amber-300'}>
            {feedback.correct ? 'Correct.' : `The correct answer is ${expectedAnswer}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-primary-action disabled={advancing} onClick={() => { void finishOrAdvance(feedback.correct ? 'correct' : 'incorrect') }} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40">Continue</button>
            {!feedback.correct && <button type="button" disabled={advancing} onClick={() => { void finishOrAdvance('skip') }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 disabled:opacity-40">Skip for now</button>}
          </div>
          {!feedback.correct && canDelayRetry && <p className="text-xs text-zinc-500">This prompt may return once two other prompts intervene.</p>}
        </div>
      )}
      <button type="button" onClick={() => { void exit() }} className="mt-3 w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">Exit</button>
    </TaskDock>
  )

  return (
    <MapSurface
      context={context}
      map={map}
      mapMeta={<div><div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Today</div><div className="mt-1 text-sm font-semibold text-zinc-100">{candidate.country.subregion}</div></div>}
      dock={dock}
      dockPlacement="stacked"
      className="animate-fade-in"
    />
  )
}
