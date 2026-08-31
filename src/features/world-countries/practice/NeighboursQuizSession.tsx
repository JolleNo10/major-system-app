import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { resolveCountryName } from '@/features/world-countries/learning/answerMatching'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'
import { getWorldCountriesTaskHighlightFill } from '@/features/world-countries/ui/WorldCountriesAnswerSemantics'
import { WorldCountriesMapActivitySurface, type WorldCountriesActivityTask } from '@/features/world-countries/ui/WorldCountriesActivity'
import {
  applyNeighboursGuess,
  deriveNeighboursTargetProgress,
  getCurrentNeighboursTarget,
  revealNeighboursRemaining,
  revealNeighboursMap,
  showNeighboursNumber,
  type NeighboursQuizRun,
  type NeighboursQuizSessionState,
} from './neighboursRun'
import { NeighboursQuizSessionTools, type NeighboursQuizMapState } from './NeighboursQuizSessionTools'

const FEEDBACK_DWELL_MS = 1800

export function NeighboursQuizSession({ run, session, onSessionChange, onAdvance }: {
  run: NeighboursQuizRun
  session: NeighboursQuizSessionState
  onSessionChange: (session: NeighboursQuizSessionState) => void
  onAdvance: () => void
}) {
  const target = getCurrentNeighboursTarget(session)
  const countryById = useMemo(() => new Map(run.countries.map(country => [country.id, country])), [run.countries])
  const targetCountry = target ? countryById.get(target.targetId) : undefined
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [mapState, setMapState] = useState<NeighboursQuizMapState>('loading')
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

  const showNumber = useCallback(() => {
    onSessionChange(showNeighboursNumber(session))
  }, [onSessionChange, session])
  const showMap = useCallback(() => {
    onSessionChange(revealNeighboursMap(session))
  }, [onSessionChange, session])
  const revealRemaining = useCallback(() => {
    onSessionChange(revealNeighboursRemaining(session))
  }, [onSessionChange, session])
  const advanceTarget = useCallback(() => {
    onAdvance()
  }, [onAdvance])

  const nextTargetLabel = session.targetIndex + 1 >= run.questions.length ? 'See results →' : 'Next Country →'
  const sessionTools = useMemo(() => target ? (
    <NeighboursQuizSessionTools
      target={target}
      countryById={countryById}
      mapState={mapState}
      onShowNumber={showNumber}
      onShowMap={showMap}
      onRevealRemaining={revealRemaining}
    />
  ) : null, [countryById, mapState, revealRemaining, showMap, showNumber, target])
  const rails = useMemo(() => target && session.phase === 'active' ? {
    right: sessionTools,
    rightLabel: 'Session',
  } : {}, [session.phase, sessionTools, target])
  useRails(rails)

  if (!target || !targetCountry) return null

  const progress = deriveNeighboursTargetProgress(target)
  const visibleIds = new Set([target.targetId, ...progress.resolvedIds])
  const hiddenCountryIds = target.revealMapUsed
    ? []
    : run.countries.map(country => country.id).filter(countryId => !visibleIds.has(countryId))
  const countryColorsById = new Map([
    ...progress.foundIds.map(countryId => [countryId, '#22c55e'] as const),
    ...progress.revealedIds.map(countryId => [countryId, '#f97316'] as const),
  ])
  const namedCountryIds = [...new Set([target.targetId, ...progress.resolvedIds])]
  const isCheckpoint = target.phase !== 'active'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedAnswer = answer.trim()
    if (!submittedAnswer || isCheckpoint || session.phase === 'complete') return
    const resolution = resolveCountryName(submittedAnswer, run.countries, { fuzzy: run.fuzzyMatching })
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

  const task: WorldCountriesActivityTask = {
    direction: 'World Countries / Neighbours Quiz',
    cue: <span id="world-countries-neighbours-quiz-question">Name the countries that border {targetCountry.country}</span>,
    sessionContext: `Question ${session.targetIndex + 1} / ${run.questions.length}`,
    answerKind: 'country',
    progress: {
      label: 'Target',
      current: session.targetIndex + 1,
      total: run.questions.length,
    },
  }
  const checkpointDock = (
    <TaskDock variant="checkpoint" tone={target.phase === 'complete' ? 'ready' : 'neutral'}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{target.phase === 'complete' ? 'All neighbours found.' : 'Review this target.'}</p>
          <p className="mt-1 text-xs text-zinc-400">{progress.foundCount} / {progress.totalCount} named · {progress.revealedCount} revealed · {target.incorrectGuesses.length} incorrect guess{target.incorrectGuesses.length === 1 ? '' : 'es'}{progress.hintUses > 0 ? ` · ${progress.hintUses} hint${progress.hintUses === 1 ? '' : 's'} used` : ''}</p>
          {feedback && <p role="status" className="mt-2 text-sm font-semibold text-zinc-300">{feedback}</p>}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Resolved neighbours">
          {target.requiredNeighbourIds.map(countryId => {
            const named = progress.foundIds.includes(countryId)
            return <li key={countryId} className={`rounded-lg border px-3 py-2 text-sm ${named ? 'border-green-500/30 bg-green-500/10 text-green-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
              <span className="block">{countryById.get(countryId)?.country ?? countryId}</span>
              <span className="text-xs opacity-75">{named ? 'Named' : 'Revealed / missed'}</span>
            </li>
          })}
        </ul>
        <button type="button" data-primary-action autoFocus onClick={advanceTarget} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">{nextTargetLabel}</button>
      </div>
    </TaskDock>
  )
  const answerDock = (
    <TaskDock variant="form">
      <div className="space-y-3">
        <form onSubmit={submit} className="flex gap-2">
          <label className="sr-only" htmlFor="world-countries-neighbours-answer">Type a neighbouring Country</label>
          <input ref={inputRef} id="world-countries-neighbours-answer" value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" placeholder="Type a Country..." disabled={isCheckpoint} className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-50" />
          <button type="submit" disabled={!answer.trim() || isCheckpoint} className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">Check</button>
        </form>
        {feedback && <p role="status" className="text-sm font-semibold text-zinc-300">{feedback}</p>}
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
            countryPopulation={run.countries}
            highlightedCountryIds={[target.targetId]}
            highlightFill={getWorldCountriesTaskHighlightFill('country')}
            countryColorsById={countryColorsById}
            hiddenCountryIds={hiddenCountryIds}
            hideCountriesOutsidePopulation
            namedCountryIds={namedCountryIds}
            zoomCountryIds={[target.targetId, ...target.requiredNeighbourIds]}
            interactive={false}
            onMapStateChange={setMapState}
            ariaLabel={`World map with ${targetCountry.country} highlighted for Neighbours Quiz`}
          />
          {mapState === 'error' && <p className="mt-2 text-center text-xs text-amber-300">The map is unavailable; continue with the typed Country prompt.</p>}
          <div className="sr-only" aria-live="polite">{progress.foundCount} neighbours named. {progress.revealedCount} neighbours revealed.</div>
        </>
      }
      mapMeta={<div className="space-y-1"><p>Question {session.targetIndex + 1} / {run.questions.length}</p><p>Type every Country that shares a land border with the target.</p></div>}
      dock={isCheckpoint ? checkpointDock : answerDock}
      expandedCompanion={target ? <NeighboursQuizSessionTools target={target} countryById={countryById} mapState={mapState} onShowNumber={showNumber} onShowMap={showMap} onRevealRemaining={revealRemaining} compact /> : undefined}
      dockPlacement="stacked"
    />
  )
}
