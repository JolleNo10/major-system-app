import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { WorldCountriesTodayReviewPromptKind } from './reviewQueue'
import type { WorldCountriesTodayReviewReasonSummary } from './reviewReason'
import type { WorldCountriesTodayLearningTrack } from './todayPlan'

interface TodayCheckpointSummary {
  reviewed: number
  correctFirstTry: number
  recoveredOnRetry: number
  stillNeedsWork: number
}

function learningTrackLabel(track: WorldCountriesTodayLearningTrack): string {
  return track === 'learn-countries' ? 'Countries' : 'Capitals'
}

export function TodayHomeRails({
  activeCountryCount,
  evidenceStatus,
  dueCount,
  dueCountryCount,
  reviewReasonSummary,
  nextLearning,
  checkpoint,
  refreshing,
  caughtUp,
  onNavigate,
}: {
  activeCountryCount: number
  evidenceStatus: 'loading' | 'ready' | 'error'
  dueCount: number
  dueCountryCount: number
  reviewReasonSummary: WorldCountriesTodayReviewReasonSummary
  nextLearning: { track: WorldCountriesTodayLearningTrack; subregionLabel: string } | null
  checkpoint: TodayCheckpointSummary | null
  refreshing: boolean
  caughtUp: boolean
  onNavigate: (area: 'drill' | 'recite') => void
}) {
  const whyTodayItems = [
    reviewReasonSummary.mistakes > 0 && `${reviewReasonSummary.mistakes} ${reviewReasonSummary.mistakes === 1 ? 'mistake' : 'mistakes'}`,
    reviewReasonSummary.firstRecall > 0 && `${reviewReasonSummary.firstRecall} first recall`,
    reviewReasonSummary.firstReviewAfterLearning > 0 && `${reviewReasonSummary.firstReviewAfterLearning} first review after Learning`,
    reviewReasonSummary.spaced > 0 && `${reviewReasonSummary.spaced} spaced`,
  ].filter((item): item is string => Boolean(item))
  const whyTodayText = whyTodayItems.join(' · ')
  const statusHeading = activeCountryCount === 0
    ? '0 Countries active'
    : evidenceStatus === 'error'
      ? 'Review status unavailable'
      : evidenceStatus === 'loading'
        ? 'Today status loading'
        : dueCount > 0
          ? `${dueCount} core reviews due`
          : caughtUp
            ? 'All caught up'
            : 'All reviews caught up'

  const statusExplanation = activeCountryCount === 0
    ? 'No active Countries are available for Today.'
    : evidenceStatus === 'loading'
      ? 'Review status is loading…'
      : evidenceStatus === 'error'
        ? 'Today could not load retained review evidence. Drill and Recite remain available.'
        : dueCount > 0
          ? nextLearning
            ? `Next after review: Learn ${learningTrackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}`
            : 'Complete the due review before introducing more core material.'
          : nextLearning
            ? `Next: Learn ${learningTrackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}`
            : 'No core review is due and no new guided Learning remains.'
  const showSecondaryActions = evidenceStatus === 'error' || caughtUp || activeCountryCount === 0

  const rails = useMemo(() => ({
      left: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-today-geography-heading">
          <GeographyBreadcrumbs items={[{ label: 'World', current: true }]} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World geography</p>
            <h2 id="world-countries-today-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Active World</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">The map shows mastery across the active Country population.</p>
          </div>
          <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
            <span className="block text-xs uppercase tracking-wider text-zinc-500">Population</span>
            <span className="mt-1 block font-semibold tabular-nums text-zinc-100">{activeCountryCount} active {activeCountryCount === 1 ? 'Country' : 'Countries'}</span>
          </p>
        </WorldCountriesPanel>
      ),
      right: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-today-status-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today</p>
            <h2 id="world-countries-today-status-heading" className="mt-1 text-lg font-bold text-zinc-100">{statusHeading}</h2>
            <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">{statusExplanation}</p>
          </div>

          {evidenceStatus === 'ready' && activeCountryCount > 0 && (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">Due reviews</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCount}</dd>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">Due Countries</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCountryCount}</dd>
                </div>
              </dl>
              {dueCount > 0 && whyTodayText.length > 0 && (
                <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" aria-labelledby="world-countries-today-why-heading">
                  <p id="world-countries-today-why-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why today</p>
                  <p className="mt-1 leading-relaxed text-zinc-300">{whyTodayText}</p>
                  {reviewReasonSummary.repeated > 0 && <p className="mt-1 text-xs font-semibold text-amber-300">{reviewReasonSummary.repeated} repeated difficulty</p>}
                </section>
              )}
            </>
          )}

          {nextLearning && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm">
              <p className="text-xs uppercase tracking-wider text-cyan-300">Next Learning</p>
              <p className="mt-1 font-semibold text-zinc-100">{learningTrackLabel(nextLearning.track)} · {nextLearning.subregionLabel}</p>
            </div>
          )}

          {checkpoint && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" aria-live="polite">
              <p className="font-semibold text-zinc-100">Review checkpoint</p>
              <p className="mt-1 text-xs text-zinc-400">{checkpoint.reviewed} reviewed · {checkpoint.correctFirstTry} correct first try · {checkpoint.recoveredOnRetry} recovered on retry · {checkpoint.stillNeedsWork} still needs work</p>
              {!refreshing && dueCount > 0 && <p className="mt-2 text-xs font-semibold text-cyan-300">{dueCount} core reviews still due</p>}
              {refreshing && <p className="mt-2 text-xs text-zinc-500">Refreshing Today…</p>}
            </div>
          )}

          {showSecondaryActions && (
            <div className="space-y-2" aria-label="Today secondary actions">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Other activities</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => onNavigate('drill')} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Drill</button>
                <button type="button" onClick={() => onNavigate('recite')} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Recite</button>
              </div>
            </div>
          )}
        </WorldCountriesPanel>
      ),
      leftLabel: 'Geography',
      rightLabel: 'Today',
    }), [activeCountryCount, checkpoint, dueCount, dueCountryCount, evidenceStatus, nextLearning, onNavigate, refreshing, reviewReasonSummary, showSecondaryActions, statusExplanation, statusHeading, whyTodayText])
  useRails(rails)

  return null
}

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
    }), [blockSize, continent, onExit, promptCount, promptKind, reviewed, reviewReason, subregion, currentPrompt, progressPercent])
  useRails(rails)

  return null
}
