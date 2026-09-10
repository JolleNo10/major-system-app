import { useCallback, useMemo, useRef } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { WorldCountriesJourneyPresentation } from './journeyPresentation'
import type { WorldCountriesTodayReviewOpportunity } from './todayPlan'
import type { WorldCountriesTodayReviewCompletion } from './TodayReviewSession'

export interface GuidedHomeScopeSummary {
  id: string
  label: string
  progress: {
    completeCountries: number
    totalCountries: number
    completionRatio: number
  }
  onSelect?: () => void
  status?: string
}

export function GuidedHomeRails({
  level,
  continent,
  activeCountryCount,
  evidenceStatus,
  reviewOpportunity,
  reviewCompletion,
  onStartReview,
  focusReviewActionRequest = 0,
  journey,
  guidedSubregionId,
  curriculumRecommendationAvailable = true,
  onFocusGuidedSubregion,
  refreshing,
  scopeSummaries,
  onWorld,
  onOpenPlay,
  onOpenProgress,
}: {
  level: 'world' | 'continent'
  continent?: Continent
  activeCountryCount: number
  evidenceStatus: 'loading' | 'ready' | 'error'
  reviewOpportunity: WorldCountriesTodayReviewOpportunity
  reviewCompletion?: WorldCountriesTodayReviewCompletion | null
  onStartReview: () => void
  focusReviewActionRequest?: number
  journey: WorldCountriesJourneyPresentation | null
  guidedSubregionId?: SubregionId | null
  curriculumRecommendationAvailable?: boolean
  onFocusGuidedSubregion?: () => void
  refreshing: boolean
  scopeSummaries: readonly GuidedHomeScopeSummary[]
  onWorld: () => void
  onOpenPlay: () => void
  onOpenProgress: () => void
}) {
  const scopeName = continent ?? 'World'
  const lastFocusedReviewRequest = useRef(0)
  const reviewActionRef = useCallback((button: HTMLButtonElement | null) => {
    if (!button || focusReviewActionRequest <= lastFocusedReviewRequest.current) return
    lastFocusedReviewRequest.current = focusReviewActionRequest
    button.focus()
  }, [focusReviewActionRequest])
  const inspectedSubregionLabel = journey ? getSubregionDefinition(journey.subregionId).label : null
  const guidedSubregionLabel = guidedSubregionId ? getSubregionDefinition(guidedSubregionId).label : null
  const isInspectingOtherSubregion = Boolean(journey && (!guidedSubregionId || journey.subregionId !== guidedSubregionId))
  const opportunityCount = reviewOpportunity?.candidates.length ?? 0
  const reviewResultText = reviewCompletion ? formatReviewCompletion(reviewCompletion) : null

  const reviewPanel = useMemo(() => (
    <WorldCountriesPanel className="space-y-3" aria-labelledby="world-countries-review-opportunity-heading">
      {activeCountryCount === 0 ? (
        <div>
          <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reviews caught up</h2>
          <p className="mt-1 text-lg font-bold text-zinc-100">No countries in this scope</p>
          <p className="mt-2 text-sm text-zinc-400">There are no countries to review here.</p>
        </div>
      ) : evidenceStatus === 'loading' ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today</p>
          <h2 id="world-countries-review-opportunity-heading" className="mt-1 text-lg font-bold text-zinc-100">Loading your progress</h2>
          <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">Your saved progress is loading; the map will stay visible.</p>
        </div>
      ) : evidenceStatus === 'error' ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Today</p>
          <h2 id="world-countries-review-opportunity-heading" className="mt-1 text-lg font-bold text-zinc-100">Progress unavailable</h2>
          <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">We couldn&apos;t load your progress. Play remains available.</p>
        </div>
      ) : reviewOpportunity?.kind === 'review' ? (
        <>
          <div>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-sm leading-none text-green-300">✦</span>
              <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-green-300">Review ready</h2>
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums text-zinc-100">{opportunityCount} {opportunityCount === 1 ? 'item' : 'items'}</p>
            <p className="mt-1 text-sm text-zinc-400">See what stuck.</p>
          </div>
          <button ref={reviewActionRef} type="button" data-review-action onClick={onStartReview} disabled={refreshing} className="w-full rounded-lg border border-green-500/45 bg-green-500/10 px-3 py-2.5 text-sm font-bold text-green-200 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40">Review now</button>
        </>
      ) : reviewOpportunity?.kind === 'consolidate' ? (
        <>
          <div>
            <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reviews caught up</h2>
            <p className="mt-1 text-lg font-bold text-zinc-100">{opportunityCount} weak {opportunityCount === 1 ? 'spot' : 'spots'} available</p>
          </div>
          {reviewResultText && <p data-review-completion className="text-xs leading-relaxed text-zinc-300">{reviewResultText}</p>}
          <button ref={reviewActionRef} type="button" data-review-action onClick={onStartReview} disabled={refreshing} className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-bold text-green-200 hover:border-green-500/60 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40">Strengthen weak spots</button>
        </>
      ) : (
        <div>
          <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reviews caught up</h2>
          {reviewResultText && <p data-review-completion className="mt-2 text-xs leading-relaxed text-zinc-300">{reviewResultText}</p>}
          <p className={`${reviewResultText ? 'mt-1 text-xs text-zinc-500' : 'mt-1 text-lg font-bold text-zinc-100'} leading-relaxed`}>{reviewResultText ? 'Nothing else is ready right now.' : 'Nothing needs your attention right now.'}</p>
        </div>
      )}
    </WorldCountriesPanel>
  ), [activeCountryCount, evidenceStatus, onStartReview, opportunityCount, refreshing, reviewActionRef, reviewOpportunity, reviewResultText])

  const rails = useMemo(() => ({
    left: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-geography-heading">
        <GeographyBreadcrumbs items={level === 'world'
          ? [{ label: 'World', current: true }]
          : [{ label: 'World', onSelect: onWorld }, { label: continent ?? 'Continent', current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{scopeName} geography</p>
          <h2 id="world-countries-guided-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">{level === 'world' ? 'Explore the world' : 'Learning regions'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{level === 'world' ? 'Choose a continent to inspect your progress.' : 'Choose a region to inspect its learning journey.'}</p>
        </div>
        {scopeSummaries.length > 0 && (
          <div className="space-y-2" aria-label={level === 'world' ? 'Continents' : 'Subregions'}>
            {scopeSummaries.map(summary => (
              <button
                key={summary.id}
                type="button"
                onClick={summary.onSelect}
                disabled={!summary.onSelect}
                className="w-full rounded-lg border border-transparent px-2 py-2 text-left text-zinc-300 transition-colors enabled:hover:border-zinc-700 enabled:hover:bg-zinc-800 disabled:cursor-default"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{summary.label}</span>
                  <span className="text-xs tabular-nums text-zinc-500">{Math.round(summary.progress.completionRatio * 100)}%</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                  <span className="block h-full rounded-full bg-cyan-500" style={{ width: `${Math.round(summary.progress.completionRatio * 100)}%` }} />
                </span>
                <span className="mt-1 block text-xs text-zinc-500">{summary.status ?? `${summary.progress.completeCountries} of ${summary.progress.totalCountries} countries complete`}</span>
              </button>
            ))}
          </div>
        )}
      </WorldCountriesPanel>
    ),
    right: (
      <div className="space-y-4">
        {reviewPanel}
        {journey && (
          <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-journey-heading">
            {isInspectingOtherSubregion && (
              <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">You&apos;re viewing {inspectedSubregionLabel}</p>
                <p className="mt-1 text-zinc-300">{guidedSubregionLabel
                  ? `Your journey is still focused on ${guidedSubregionLabel}.`
                  : 'Your journey focus stays the same.'}</p>
                {onFocusGuidedSubregion && <button type="button" onClick={onFocusGuidedSubregion} className="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200">{guidedSubregionLabel ? `Back to ${guidedSubregionLabel}` : 'Back to the guided view'}</button>}
              </section>
            )}
            <CompactJourneyPath journey={journey} curriculumRecommendationAvailable={curriculumRecommendationAvailable} />
          </WorldCountriesPanel>
        )}
        <WorldCountriesPanel className="space-y-2" aria-label="World Countries secondary actions">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Play and progress</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onOpenPlay} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Play</button>
            <button type="button" onClick={onOpenProgress} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">View progress</button>
          </div>
          {level === 'continent' && <button type="button" onClick={onWorld} className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-semibold text-zinc-400 hover:border-zinc-600 hover:text-zinc-100">Back to World</button>}
          {refreshing && <p className="text-xs text-zinc-500">Updating your progress…</p>}
        </WorldCountriesPanel>
      </div>
    ),
    leftLabel: 'Geography',
    rightLabel: 'Review and journey',
  }), [continent, curriculumRecommendationAvailable, guidedSubregionLabel, inspectedSubregionLabel, isInspectingOtherSubregion, journey, level, onFocusGuidedSubregion, onOpenPlay, onOpenProgress, onWorld, refreshing, reviewPanel, scopeName, scopeSummaries])
  useRails(rails)
  return null
}

function CompactJourneyPath({ journey, curriculumRecommendationAvailable }: { journey: WorldCountriesJourneyPresentation; curriculumRecommendationAvailable: boolean }) {
  const subregionLabel = getSubregionDefinition(journey.subregionId).label
  return (
    <section className="space-y-2" aria-labelledby="world-countries-journey-heading">
      <p id="world-countries-journey-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{curriculumRecommendationAvailable ? 'Your journey' : 'Learning complete'} · {subregionLabel}</p>
      <ol className="space-y-2">
        {journey.stages.map(stage => (
          <li key={stage.id} className="flex items-start gap-2" data-journey-milestone={stage.id} data-journey-status={stage.status}>
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${stage.status === 'complete' ? 'border-green-500/40 bg-green-500/10 text-green-300' : stage.status === 'current' ? 'border-violet-400 bg-violet-600 text-white' : 'border-zinc-700 text-zinc-500'}`} aria-hidden="true">{stage.status === 'complete' ? '✓' : stage.status === 'current' ? '•' : '○'}</span>
            <span className="min-w-0"><span className={`block text-xs font-semibold ${stage.status === 'current' ? 'text-violet-100' : 'text-zinc-300'}`}>{stage.label}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{stage.status === 'complete' ? 'Complete' : stage.status === 'current' ? 'Current' : 'Upcoming'}</span></span>
          </li>
        ))}
      </ol>
      <div className="border-t border-zinc-800 pt-3" aria-label="Mastery status">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Mastery</p>
        <p className="mt-1 text-xs text-zinc-400">{journey.masteryStatus === 'mastered' ? '✓ Mastered' : journey.regionLearned ? 'Building through Review' : 'Builds through Review'}</p>
      </div>
    </section>
  )
}

function formatReviewCompletion(completion: WorldCountriesTodayReviewCompletion): string {
  const prefix = completion.mode === 'consolidation' ? 'Last practice' : 'Last review'
  return `${prefix}: ${formatReviewCompletionCounters(completion)}`
}

function formatReviewCompletionCounters(completion: WorldCountriesTodayReviewCompletion): string {
  const checkpoint = completion.checkpoint
  const parts = [
    `${checkpoint.reviewed} ${completion.mode === 'consolidation' ? 'practised' : 'reviewed'}`,
    `${checkpoint.correctFirstTry} first try`,
    `${checkpoint.recoveredOnRetry} recovered`,
  ]
  if (checkpoint.stillNeedsWork > 0) parts.push(`${checkpoint.stillNeedsWork} still needs work`)
  return parts.join(' · ')
}
