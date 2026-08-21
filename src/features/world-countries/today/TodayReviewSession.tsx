import { useRef, useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer } from '@/features/world-countries/learning/recallAnswerMatching'
import { recordWorldCountriesAttempt } from '@/features/world-countries/learning/recallProgress'
import type { WorldCountriesRecallSkill } from '@/features/world-countries/learning/recallTargets'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { MapSurface, TaskDock } from '@/features/world-countries/ui/MapSurface'
import {
  WorldCountriesTypedAnswer,
  type WorldCountriesTypedAnswerEvaluation,
} from '@/features/world-countries/ui/WorldCountriesTypedAnswer'
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
  const [advancing, setAdvancing] = useState(false)
  const advancingRef = useRef(false)
  const exitingRef = useRef(false)
  const latestWriteRef = useRef<Promise<void> | null>(null)
  const pendingWritesRef = useRef<Promise<void>[]>([])
  const prompt = getCurrentWorldCountriesTodayReviewPrompt(queue)

  if (!prompt) return null
  const { candidate } = prompt
  const country = candidate.country
  const skill: WorldCountriesRecallSkill = candidate.target.skill
  const isLocationQuestion = skill === 'location-to-country'
  const expectedAnswer = isLocationQuestion ? country.country : country.capital
  const promptLabel = isLocationQuestion ? 'Which country is this?' : 'What is the capital?'
  const canDelayRetry = prompt.kind === 'initial' && queue.prompts.length - queue.cursor - 1 >= 2

  const finishOrAdvance = async (result: 'correct' | 'incorrect' | 'skip') => {
    if (advancingRef.current || exitingRef.current) return
    advancingRef.current = true
    setAdvancing(true)
    await latestWriteRef.current?.catch(() => undefined)
    const nextQueue = submitWorldCountriesTodayReviewPrompt(queue, result)
    latestWriteRef.current = null
    setQueue(nextQueue)
    setAdvancing(false)
    advancingRef.current = false
    if (isWorldCountriesTodayReviewQueueComplete(nextQueue)) {
      onDone({
        reviewed: nextQueue.reviewed,
        correctFirstTry: nextQueue.correctFirstTry,
        recoveredOnRetry: nextQueue.recoveredOnRetry,
        stillNeedsWork: getWorldCountriesTodayReviewStillNeedsWork(nextQueue),
      })
    }
  }

  const exit = async () => {
    exitingRef.current = true
    await Promise.all(pendingWritesRef.current)
    onExit()
  }

  return (
    <WorldCountriesTypedAnswer
      promptKey={`${country.id}-${skill}-${prompt.kind}`}
      answerLabel={isLocationQuestion ? 'Type the Country name' : 'Type the capital'}
      placeholder={isLocationQuestion ? 'Type the Country…' : 'Type the capital…'}
      correctAnswer={expectedAnswer}
      evaluate={answer => {
        const match = classifyRecallAnswer(skill, answer, country, {
          fuzzy: fuzzyMatching,
          countryCandidates: activeCountries,
          capitalCandidates: activeCountries.map(entry => entry.capital),
        })
        const outcome = match === 'fuzzy' ? 'fuzzy' : match === 'exact' ? 'exact' : 'incorrect'
        return {
          outcome,
          canonicalAnswer: expectedAnswer,
          answerKind: isLocationQuestion ? 'country' : 'capital',
          message: outcome === 'incorrect'
            ? `The correct answer is ${expectedAnswer}.`
            : outcome === 'fuzzy'
              ? `Correct. The canonical answer is ${expectedAnswer}.`
              : 'Correct.',
        } satisfies WorldCountriesTypedAnswerEvaluation
      }}
      onAnswer={(_answer, evaluation, latencyMs) => {
        const write = recordWorldCountriesAttempt(country.id, skill, {
          at: Date.now(),
          ok: evaluation.outcome !== 'incorrect',
          ms: latencyMs,
          evidenceKind: 'recall',
        })
        latestWriteRef.current = write
        pendingWritesRef.current.push(write)
        void write.then(() => {
          pendingWritesRef.current = pendingWritesRef.current.filter(candidate => candidate !== write)
        }, () => {
          pendingWritesRef.current = pendingWritesRef.current.filter(candidate => candidate !== write)
        })
      }}
      onTransition={result => exitingRef.current
        ? undefined
        : finishOrAdvance(result.outcome === 'incorrect' ? 'incorrect' : 'correct')}
    >
      {typed => {
        const map = (
          <div className="relative">
            <CountryLearningMap
              continent={country.continent}
              scopeCountries={activeCountries}
              highlightedCountryId={country.id}
              namedCountryId={typed.outcome && typed.outcome !== 'incorrect' || !isLocationQuestion ? country.id : null}
              showHighlightedNames={Boolean(typed.outcome && typed.outcome !== 'incorrect' || !isLocationQuestion)}
              showHoverNames={false}
              ariaLabel={isLocationQuestion && !typed.feedbackActive
                ? 'Map showing the selected location for Today recall without the Country name revealed'
                : `Map with ${country.country} highlighted for Today recall`}
            />
          </div>
        )
        const dock = (
          <TaskDock variant="form" status={<div className="text-[11px] font-bold uppercase tracking-[0.08em] text-cyan-400">{prompt.kind === 'retry' ? 'Delayed retry' : 'Core review'} · {queue.cursor + 1} / {queue.prompts.length}</div>}>
            {typed.feedback}
            {typed.input}
            {typed.fuzzyControls}
            {typed.isAnswerable && prompt.kind === 'retry' && <button type="button" disabled={advancing} onClick={() => { void finishOrAdvance('skip') }} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 disabled:opacity-40">Skip for now</button>}
            {!typed.feedbackActive && canDelayRetry && <p className="text-xs text-zinc-500">This prompt may return once two other prompts intervene.</p>}
            <button type="button" onClick={() => { void exit() }} className="mt-3 w-full rounded-[9px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">Exit</button>
          </TaskDock>
        )
        return (
          <MapSurface
            context={(
              <div className="px-1 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today · Review</p>
                <h1 className="mt-1 text-2xl font-black text-zinc-100">{promptLabel}</h1>
                <p className="mt-1 text-sm text-zinc-500">{isLocationQuestion ? 'Type the Country name.' : `Type the capital of ${country.country}.`}</p>
              </div>
            )}
            map={map}
            mapMeta={<div><div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Today</div><div className="mt-1 text-sm font-semibold text-zinc-100">{candidate.country.subregion}</div></div>}
            dock={dock}
            dockPlacement="stacked"
            className="animate-fade-in"
          />
        )
      }}
    </WorldCountriesTypedAnswer>
  )
}
