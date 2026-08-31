import { useId } from 'react'
import type { CountryId } from '@/features/world-countries/data/countries'
import {
  deriveNeighboursTargetProgress,
  type NeighboursTargetState,
} from './neighboursRun'

export type NeighboursQuizMapState = 'loading' | 'ready' | 'error'

export function NeighboursQuizSessionTools({
  target,
  countryById,
  mapState,
  onShowNumber,
  onShowMap,
  onRevealRemaining,
  compact = false,
}: {
  target: NeighboursTargetState
  countryById: ReadonlyMap<CountryId, { country: string }>
  mapState: NeighboursQuizMapState
  onShowNumber: () => void
  onShowMap: () => void
  onRevealRemaining: () => void
  compact?: boolean
}) {
  const progress = deriveNeighboursTargetProgress(target)
  const resolved = target.phase !== 'active'
  const suffix = useId().replace(/:/g, '')
  const foundHeadingId = `world-countries-neighbours-found-heading-${suffix}`
  const toolsHeadingId = `world-countries-neighbours-tools-heading-${suffix}`
  const progressLabel = target.showNumberUsed || resolved
    ? `${progress.foundCount} / ${progress.totalCount} found`
    : `${progress.foundCount} found`

  return (
    <section
      data-neighbours-session-tools
      data-neighbours-session-tools-variant={compact ? 'compact' : 'rail'}
      className={compact ? 'w-full space-y-3' : 'space-y-4'}
      aria-labelledby={toolsHeadingId}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Neighbours Quiz</p>
        <h2 id={toolsHeadingId} className="mt-1 text-lg font-bold text-zinc-100">Session tools</h2>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Progress</p>
          <p data-neighbours-progress className="text-sm font-semibold tabular-nums text-zinc-200">{progressLabel}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, (progress.resolvedCount / Math.max(1, progress.totalCount)) * 100)}%` }} />
        </div>
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" aria-labelledby={foundHeadingId}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 id={foundHeadingId} className="text-xs uppercase tracking-wider text-zinc-500">Found</h3>
          <span className="text-xs tabular-nums text-zinc-500">{progress.foundCount}</span>
        </div>
        {progress.foundIds.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-zinc-200" aria-label="Found neighbours">
            {progress.foundIds.map(countryId => <li key={countryId}>{countryById.get(countryId)?.country ?? countryId}</li>)}
          </ul>
        ) : <p className="mt-2 text-sm text-zinc-500">None yet</p>}
      </section>

      {progress.revealedIds.length > 0 && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" aria-label="Revealed neighbours">
          <p className="text-xs uppercase tracking-wider text-amber-300">Revealed / missed</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100">
            {progress.revealedIds.map(countryId => <li key={countryId}>{countryById.get(countryId)?.country ?? countryId}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-2" aria-label="Neighbours hints">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">Hints</h3>
        <button
          type="button"
          disabled={target.showNumberUsed || resolved}
          onClick={onShowNumber}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm font-semibold text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Show number
        </button>
        <button
          type="button"
          aria-pressed={target.revealMapUsed}
          disabled={mapState !== 'ready' || target.revealMapUsed || resolved}
          onClick={onShowMap}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm font-semibold text-zinc-300 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Show map
        </button>
        <button
          type="button"
          data-neighbours-reveal-remaining
          disabled={progress.remainingCount === 0 || resolved}
          onClick={onRevealRemaining}
          className="w-full rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-left text-sm font-semibold text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reveal remaining
        </button>
      </section>

      <p className="text-xs text-zinc-500">{target.incorrectGuesses.length} incorrect guess{target.incorrectGuesses.length === 1 ? '' : 'es'}</p>
    </section>
  )
}
