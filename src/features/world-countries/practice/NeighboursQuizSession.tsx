import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { countries } from '@/features/world-countries/data/countries'
import { resolveCountryName } from '@/features/world-countries/learning/answerMatching'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import {
  advanceNeighboursTarget,
  applyNeighboursGuess,
  getCurrentNeighboursTarget,
  revealNeighboursRemaining,
  revealNeighboursMap,
  showNeighboursNumber,
  type NeighboursQuizRun,
  type NeighboursQuizSessionState,
} from './neighboursRun'

const COMPLETION_DWELL_MS = 500
const FEEDBACK_DWELL_MS = 1800

type MapState = 'loading' | 'ready' | 'error'

export function NeighboursQuizSession({ run, session, fuzzyMatching, onSessionChange, onAdvance }: {
  run: NeighboursQuizRun
  session: NeighboursQuizSessionState
  fuzzyMatching: boolean
  onSessionChange: (session: NeighboursQuizSessionState) => void
  onAdvance: () => void
}) {
  const target = getCurrentNeighboursTarget(session)
  const targetCountry = target ? run.countries.find(country => country.id === target.targetId) : undefined
  const countryById = useMemo(() => new Map(run.countries.map(country => [country.id, country])), [run.countries])
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mapState, setMapState] = useState<MapState>('loading')
  const inputRef = useRef<HTMLInputElement>(null)
  const targetKey = target ? `${session.targetIndex}-${target.targetId}` : null

  useEffect(() => {
    setAnswer('')
    setFeedback(null)
    inputRef.current?.focus()
  }, [targetKey])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (!target || target.phase !== 'complete') return
    const timer = window.setTimeout(onAdvance, COMPLETION_DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [onAdvance, target])

  if (!target || !targetCountry) return null

  const foundIds = new Set(target.foundNeighbourIds)
  const revealedIds = new Set(target.revealedNeighbourIds)
  const visibleIds = new Set([target.targetId, ...target.foundNeighbourIds, ...target.revealedNeighbourIds])
  const hiddenCountryIds = target.revealMapUsed
    ? []
    : countries.map(country => country.id).filter(countryId => !visibleIds.has(countryId))
  const countryColorsById = new Map([
    ...target.foundNeighbourIds.map(countryId => [countryId, '#22c55e'] as const),
    ...target.revealedNeighbourIds.map(countryId => [countryId, '#f97316'] as const),
  ])
  const namedCountryIds = target.phase === 'review'
    ? [...new Set([...target.foundNeighbourIds, ...target.revealedNeighbourIds])]
    : []
  const unresolvedCount = target.requiredNeighbourIds.length - target.foundNeighbourIds.length - target.revealedNeighbourIds.length
  const isReview = target.phase === 'review'
  const isComplete = target.phase === 'complete'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedAnswer = answer.trim()
    if (!submittedAnswer || isReview || isComplete) return
    const resolution = resolveCountryName(submittedAnswer, run.countries, { fuzzy: fuzzyMatching })
    const result = applyNeighboursGuess(session, {
      countryId: resolution.country?.id,
      submittedAnswer,
    })
    const message = result.outcome === 'found'
      ? resolution.kind === 'fuzzy' ? `Correct. The canonical name is ${resolution.country?.country}.` : 'Correct.'
      : result.outcome === 'already-found'
        ? 'Already found.'
        : resolution.country
          ? `Incorrect. ${resolution.country.country} is not a neighbour.`
          : resolution.kind === 'ambiguous' ? 'That Country answer is ambiguous.' : 'Country not recognized.'
    setFeedback(message)
    setAnswer('')
    onSessionChange(result.state)
    inputRef.current?.focus()
  }

  const revealRemaining = () => onSessionChange(revealNeighboursRemaining(session))
  const continueReview = () => onSessionChange(advanceNeighboursTarget(session))
  const task: WorldCountriesActivityTask = {
    direction: 'World Countries / Neighbours Quiz',
    cue: <span id="world-countries-neighbours-quiz-question">Name the countries that border {targetCountry.country}</span>,
    sessionContext: `Question ${session.targetIndex + 1} / ${run.questions.length}`,
    progress: {
      label: 'Target',
      current: session.targetIndex + 1,
      total: run.questions.length,
    },
  }
  const taskDock = isReview ? (
    <TaskDock variant="completion">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-amber-200">Review the revealed neighbours, then continue.</p>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Revealed neighbours">
          {target.revealedNeighbourIds.map(countryId => <li key={countryId} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">{countryById.get(countryId)?.country ?? countryId}</li>)}
        </ul>
        <button type="button" autoFocus onClick={continueReview} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Continue</button>
      </div>
    </TaskDock>
  ) : (
    <TaskDock variant="form">
      <div className="space-y-3">
        <form onSubmit={submit} className="flex gap-2">
          <label className="sr-only" htmlFor="world-countries-neighbours-answer">Type a neighbouring Country</label>
          <input ref={inputRef} id="world-countries-neighbours-answer" value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" placeholder="Type a Country..." disabled={isComplete} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50" />
          <button type="submit" disabled={!answer.trim() || isComplete} className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">Check</button>
        </form>
        {feedback && <p role="status" className="text-sm font-semibold text-zinc-300">{feedback}</p>}
        {isComplete && <p role="status" className="text-sm font-semibold text-green-300">All neighbours found.</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" disabled={target.showNumberUsed || isComplete} onClick={() => onSessionChange(showNeighboursNumber(session))} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40">{target.showNumberUsed ? `Neighbours found: ${target.foundNeighbourIds.length} / ${target.requiredNeighbourIds.length}` : 'Show number'}</button>
          <button type="button" disabled={target.revealMapUsed || isComplete} onClick={() => onSessionChange(revealNeighboursMap(session))} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-semibold text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40">{target.revealMapUsed ? 'Map revealed' : 'Reveal map'}</button>
        </div>
        <button type="button" disabled={unresolvedCount <= 0 || isComplete} onClick={revealRemaining} className="w-full rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40">Reveal remaining</button>
        <p className="text-xs text-zinc-500">{target.showNumberUsed ? `Neighbours found: ${target.foundNeighbourIds.length} / ${target.requiredNeighbourIds.length}` : 'The total neighbour count is hidden.'} · {target.incorrectGuesses.length} incorrect guess{target.incorrectGuesses.length === 1 ? '' : 'es'}</p>
      </div>
    </TaskDock>
  )

  return (
    <WorldCountriesMapActivitySurface
      task={task}
      map={
        <>
          <GeographyOverviewMap
            level="world"
            countryPopulation={countries}
            highlightedCountryIds={[target.targetId]}
            highlightFill="#0891b2"
            countryColorsById={countryColorsById}
            hiddenCountryIds={hiddenCountryIds}
            namedCountryIds={namedCountryIds}
            zoomCountryIds={[target.targetId, ...target.requiredNeighbourIds]}
            interactive={false}
            onMapStateChange={setMapState}
            ariaLabel={`World map with ${targetCountry.country} highlighted for Neighbours Quiz`}
          />
          {mapState === 'error' && <p className="mt-2 text-center text-xs text-amber-300">The map is unavailable; continue with the typed Country prompt.</p>}
          <div className="sr-only" aria-live="polite">{foundIds.size} neighbours named. {revealedIds.size} neighbours revealed.</div>
        </>
      }
      mapMeta={<p>Type every Country that shares a land border with the target.</p>}
      dock={taskDock}
      dockPlacement="stacked"
    />
  )
}
