import { useCallback, useMemo, useRef } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
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
    /** Current derived atomic mastery; optional for legacy test/caller fixtures. */
    coreMasteredSkills?: number
    coreSkillCount?: number
    coreMasteryRatio?: number
  }
  onSelect?: () => void
  selected?: boolean
  status?: string
}

export function GuidedHomeRails({
  level,
  continent,
  activeCountryCount,
  evidenceStatus,
  reviewOpportunity,
  reviewAvailableCount,
  reviewCompletion,
  onStartReview,
  focusReviewActionRequest = 0,
  journey,
  activeLearningAvailable = true,
  refreshing,
  scopeSummaries,
  scopeProgress,
  onWorld,
  onOpenProgress,
}: {
  level: 'world' | 'continent'
  continent?: Continent
  activeCountryCount: number
  evidenceStatus: 'loading' | 'ready' | 'error'
  reviewOpportunity: WorldCountriesTodayReviewOpportunity
  reviewAvailableCount: number
  reviewCompletion?: WorldCountriesTodayReviewCompletion | null
  onStartReview: () => void
  focusReviewActionRequest?: number
  journey: WorldCountriesJourneyPresentation | null
  activeLearningAvailable?: boolean
  refreshing: boolean
  scopeSummaries: readonly GuidedHomeScopeSummary[]
  scopeProgress: GuidedHomeScopeSummary['progress'] | null
  onWorld: () => void
  onOpenProgress: () => void
}) {
  const scopeName = continent ?? 'World'
  const lastFocusedReviewRequest = useRef(0)
  const reviewActionRef = useCallback((button: HTMLButtonElement | null) => {
    if (!button || focusReviewActionRequest <= lastFocusedReviewRequest.current) return
    lastFocusedReviewRequest.current = focusReviewActionRequest
    button.focus()
  }, [focusReviewActionRequest])
  const reviewResultText = reviewCompletion ? formatReviewCompletion(reviewCompletion) : null
  const nextSessionCount = reviewOpportunity?.candidates.length ?? 0
  const hasMoreAvailable = reviewAvailableCount > nextSessionCount

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
          <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">We couldn&apos;t load your progress. Playground remains available from the feature header.</p>
        </div>
      ) : reviewOpportunity?.kind === 'review' ? (
        <>
          <div>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-sm leading-none text-green-300">✦</span>
              <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-green-300">Review ready</h2>
            </div>
            <p className="mt-1 text-2xl font-black tabular-nums text-zinc-100">{reviewAvailableCount} {reviewAvailableCount === 1 ? 'item' : 'items'} ready</p>
            {hasMoreAvailable
              ? <p className="mt-1 text-sm text-zinc-400">Next review: {nextSessionCount} {nextSessionCount === 1 ? 'item' : 'items'}</p>
              : <p className="mt-1 text-sm text-zinc-400">See what stuck.</p>}
          </div>
          <button ref={reviewActionRef} type="button" data-review-action onClick={onStartReview} disabled={refreshing} className="w-full rounded-lg border border-green-500/45 bg-green-500/10 px-3 py-2.5 text-sm font-bold text-green-200 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40">Review {nextSessionCount} now</button>
        </>
      ) : reviewOpportunity?.kind === 'consolidate' ? (
        <>
          <div>
            <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reviews caught up</h2>
            <p className="mt-1 text-lg font-bold text-zinc-100">{reviewAvailableCount} weak {reviewAvailableCount === 1 ? 'spot' : 'spots'} available</p>
            {hasMoreAvailable && <p className="mt-1 text-sm text-zinc-400">Next practice: {nextSessionCount} {nextSessionCount === 1 ? 'item' : 'items'}</p>}
          </div>
          {reviewResultText && <p data-review-completion className="text-xs leading-relaxed text-zinc-300">{reviewResultText}</p>}
          <button ref={reviewActionRef} type="button" data-review-action onClick={onStartReview} disabled={refreshing} className="w-full rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-bold text-green-200 hover:border-green-500/60 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-40">Strengthen {nextSessionCount} now</button>
        </>
      ) : (
        <div>
          <h2 id="world-countries-review-opportunity-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reviews caught up</h2>
          {reviewResultText && <p data-review-completion className="mt-2 text-xs leading-relaxed text-zinc-300">{reviewResultText}</p>}
          <p className={`${reviewResultText ? 'mt-1 text-xs text-zinc-500' : 'mt-1 text-lg font-bold text-zinc-100'} leading-relaxed`}>{reviewResultText ? 'Nothing else is ready right now.' : 'Nothing needs your attention right now.'}</p>
        </div>
      )}
    </WorldCountriesPanel>
  ), [activeCountryCount, evidenceStatus, hasMoreAvailable, nextSessionCount, onStartReview, refreshing, reviewActionRef, reviewAvailableCount, reviewOpportunity, reviewResultText])

  const rails = useMemo(() => ({
    left: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-geography-heading">
        <GeographyBreadcrumbs items={level === 'world'
          ? [{ label: 'World', current: true }]
          : [{ label: 'World', onSelect: onWorld }, { label: continent ?? 'Continent', current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{scopeName} geography</p>
          <h2 id="world-countries-guided-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">{level === 'world' ? 'Explore the world' : 'Learning regions'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{level === 'world' ? 'Choose a continent to explore.' : 'Choose a region to set your learning focus.'}</p>
        </div>
        {scopeSummaries.length > 0 && (
          <div className="space-y-2" aria-label={level === 'world' ? 'Continents' : 'Subregions'}>
            {scopeSummaries.map(summary => (
              <button
                key={summary.id}
                type="button"
                onClick={summary.onSelect}
                disabled={!summary.onSelect}
                aria-current={summary.selected ? 'true' : undefined}
                data-active-focus={summary.selected ? 'true' : undefined}
                className={`w-full rounded-lg border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 disabled:cursor-default ${summary.selected ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100' : 'border-transparent text-zinc-300 enabled:hover:border-zinc-700 enabled:hover:bg-zinc-800'}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  <span>{summary.label}</span>
                  <span className="text-xs tabular-nums text-zinc-500">Mastery {Math.round(getMasteryRatio(summary.progress) * 100)}%</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                  <span className="block h-full rounded-full bg-cyan-500" style={{ width: `${Math.round(getMasteryRatio(summary.progress) * 100)}%` }} />
                </span>
                <span className="mt-1 block text-xs text-zinc-500">{summary.status ?? `${summary.progress.completeCountries} / ${summary.progress.totalCountries} Countries fully mastered`}</span>
              </button>
            ))}
          </div>
        )}
        <div data-progress-entry className="border-t border-zinc-800 pt-4" aria-labelledby="world-countries-scope-progress-heading">
          <p id="world-countries-scope-progress-heading" className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{scopeName} progress</p>
          {scopeProgress ? (
            <p className="mt-1 flex items-baseline justify-between gap-2 text-sm text-zinc-300">
              <span className="font-semibold tabular-nums">{scopeProgress.completeCountries} / {scopeProgress.totalCountries} Countries fully mastered</span>
              <span className="text-xs tabular-nums text-zinc-500">Mastery {Math.round(getMasteryRatio(scopeProgress) * 100)}%</span>
            </p>
          ) : (
            <p role="status" aria-live="polite" className="mt-2 text-xs text-zinc-500">{evidenceStatus === 'loading' ? 'Progress is loading.' : 'Progress is unavailable right now.'}</p>
          )}
          <button type="button" data-progress-action onClick={onOpenProgress} disabled={evidenceStatus !== 'ready' || !scopeProgress} className="mt-3 w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">View progress</button>
        </div>
      </WorldCountriesPanel>
    ),
    right: (
      <div className="space-y-4">
        {reviewPanel}
        {journey && (
          <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-journey-heading" data-active-subregion={journey.subregionId}>
            <CompactJourneyPath journey={journey} learningAvailable={activeLearningAvailable} />
          </WorldCountriesPanel>
        )}
        {refreshing && <p role="status" aria-live="polite" className="text-xs text-zinc-500">Updating your progress…</p>}
      </div>
    ),
    leftLabel: 'Geography',
    rightLabel: 'Review and journey',
  }), [activeLearningAvailable, continent, evidenceStatus, journey, level, onOpenProgress, onWorld, refreshing, reviewPanel, scopeName, scopeProgress, scopeSummaries])
  useRails(rails)
  return null
}

function getMasteryRatio(progress: GuidedHomeScopeSummary['progress']): number {
  return progress.coreMasteryRatio ?? progress.completionRatio
}

function CompactJourneyPath({ journey, learningAvailable }: { journey: WorldCountriesJourneyPresentation; learningAvailable: boolean }) {
  const subregionLabel = getSubregionDefinition(journey.subregionId).label
  return (
    <section className="space-y-2" aria-labelledby="world-countries-journey-heading">
      <p id="world-countries-journey-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{learningAvailable ? 'Your journey' : 'Learning complete'} · {subregionLabel}</p>
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
