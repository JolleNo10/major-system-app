import { useMemo } from 'react'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  deriveNeighboursTargetProgress,
  isNeighboursTargetPerfect,
  summarizeNeighboursRun,
  type NeighboursQuizRun,
  type NeighboursQuizSessionState,
  type NeighboursTargetState,
} from './neighboursRun'

export function NeighboursQuizResults({ run, session, onRetryMissed, onNewQuiz, onChangeSetup }: {
  run: NeighboursQuizRun
  session: NeighboursQuizSessionState
  onRetryMissed: () => void
  onNewQuiz: () => void
  onChangeSetup: () => void
}) {
  const summary = summarizeNeighboursRun(run, session)
  const countryById = useMemo(() => new Map(run.countries.map(country => [country.id, country])), [run.countries])
  const targetById = useMemo(() => new Map(session.targets.map(target => [target.targetId, target])), [session.targets])

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 py-8" aria-labelledby="world-countries-neighbours-quiz-results-heading">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">Neighbours quiz complete</p>
        <h1 id="world-countries-neighbours-quiz-results-heading" className="text-3xl font-black text-zinc-100">Neighbours results</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-4" aria-label="Neighbours quiz score">
        <ResultStat label="Neighbours named" value={`${summary.named} / ${summary.totalRequired}`} />
        <ResultStat label="Perfect Countries" value={`${summary.perfectTargets} / ${summary.totalTargets}`} />
        <ResultStat label="Wrong guesses" value={String(summary.incorrectGuesses)} />
        <ResultStat label="Hint uses" value={String(summary.hintUses)} />
      </div>
      {summary.imperfectTargetIds.length > 0 && (
        <section className="space-y-3" aria-labelledby="world-countries-neighbours-quiz-review-heading">
          <div>
            <h2 id="world-countries-neighbours-quiz-review-heading" className="text-lg font-bold text-zinc-100">Review imperfect Countries</h2>
            <p className="mt-1 text-sm text-zinc-500">Retry missed repeats each imperfect target once.</p>
          </div>
          <ol className="space-y-3">
            {summary.imperfectTargetIds.map(targetId => {
              const target = targetById.get(targetId)
              const country = countryById.get(targetId)
              if (!target || !country) return null
              return <NeighboursReview key={targetId} target={target} targetName={country.country} countryById={countryById} />
            })}
          </ol>
        </section>
      )}
      <div className="space-y-2">
        <button type="button" autoFocus={summary.imperfectTargetIds.length > 0} hidden={summary.imperfectTargetIds.length === 0} onClick={onRetryMissed} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Retry missed</button>
        <button type="button" autoFocus={summary.imperfectTargetIds.length === 0} onClick={onNewQuiz} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">New quiz</button>
        <button type="button" onClick={onChangeSetup} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Change setup</button>
      </div>
    </section>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center"><p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p></div>
}

function NeighboursReview({ target, targetName, countryById }: { target: NeighboursTargetState; targetName: string; countryById: ReadonlyMap<CountryId, { country: string }> }) {
  const progress = deriveNeighboursTargetProgress(target)
  const names = (ids: readonly CountryId[]) => ids.map(countryId => countryById.get(countryId)?.country ?? countryId)
  return <li className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><span className="font-semibold text-zinc-100">{targetName}</span><span className="text-sm text-zinc-500">{progress.foundCount} / {progress.totalCount} named</span></div>
    {!isNeighboursTargetPerfect(target) && <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
      <ReviewList label="Named" values={names(progress.foundIds)} />
      <ReviewList label="Revealed / missed" values={names([...progress.revealedIds, ...progress.remainingIds])} />
      <ReviewList label="Wrong guesses" values={target.incorrectGuesses} />
    </div>}
  </li>
}

function ReviewList({ label, values }: { label: string; values: readonly string[] }) {
  return <div><p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 text-zinc-300">{values.length ? values.join(', ') : 'None'}</p></div>
}
