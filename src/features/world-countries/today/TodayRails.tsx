import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { WorldCountriesTodayReviewPromptKind } from './reviewQueue'

export function TodayReviewRails({
  continent,
  subregion,
  promptKind,
  cursor,
  promptCount,
  blockSize,
  reviewed,
  reviewReason,
  onExit,
}: {
  continent: Continent
  subregion: string
  promptKind: WorldCountriesTodayReviewPromptKind
  cursor: number
  promptCount: number
  blockSize: number
  reviewed: number
  reviewReason: string
  onExit: () => void
}) {
  const currentPrompt = Math.min(cursor + 1, promptCount)
  const progressPercent = promptCount > 0 ? Math.round((currentPrompt / promptCount) * 100) : 0

  const rails = useMemo(() => ({
    left: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-today-review-geography-heading">
        <GeographyBreadcrumbs items={[{ label: 'World' }, { label: continent }, { label: subregion, current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today · Review</p>
          <h2 id="world-countries-today-review-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Review geography</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Current prompt is within this Subregion.</p>
        </div>
      </WorldCountriesPanel>
    ),
    right: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-today-review-session-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Today</p>
          <h2 id="world-countries-today-review-session-heading" className="mt-1 text-lg font-bold text-zinc-100">Review</h2>
        </div>
        <section aria-labelledby="world-countries-today-review-progress-heading" aria-live="polite" className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p id="world-countries-today-review-progress-heading" className="text-xs uppercase tracking-wider text-zinc-500">Review progress</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-200">Prompt {currentPrompt} / {promptCount}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, progressPercent)}%` }} />
          </div>
          <p className="mt-2 text-xs tabular-nums text-zinc-500">Initial reviews {Math.min(reviewed, blockSize)} / {blockSize}</p>
          {promptKind === 'retry' && <p className="mt-2 text-xs font-semibold text-amber-300">Delayed retry · answerable now</p>}
        </section>
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" aria-labelledby="world-countries-today-review-why-heading">
          <p id="world-countries-today-review-why-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why now</p>
          <p className="mt-1 font-semibold text-zinc-200">{reviewReason}</p>
        </section>
        <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Exit Review</button>
      </WorldCountriesPanel>
    ),
    leftLabel: 'Geography',
    rightLabel: 'Today · Review',
  }), [blockSize, continent, currentPrompt, onExit, promptCount, promptKind, progressPercent, reviewed, reviewReason, subregion])
  useRails(rails)

  return null
}
