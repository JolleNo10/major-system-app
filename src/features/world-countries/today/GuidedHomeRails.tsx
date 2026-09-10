import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { WorldCountriesJourneyPresentation } from './journeyPresentation'
import type { WorldCountriesTodayLearningTrack } from './todayPlan'
import type { WorldCountriesTodayReviewReasonSummary } from './reviewReason'
import type { WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'

export interface GuidedHomeScopeSummary {
  id: string
  label: string
  progress: WorldCountriesScopeProgress
  onSelect?: () => void
  status?: string
}

export function GuidedHomeRails({
  level,
  continent,
  activeCountryCount,
  evidenceStatus,
  dueCount,
  dueCountryCount,
  reviewReasonSummary,
  nextLearning,
  journey,
  guidedSubregionId,
  onFocusGuidedSubregion,
  refreshing,
  caughtUp,
  scopeComplete = false,
  scopeProgress,
  incompleteSubregionLabels = [],
  consolidationAvailable = false,
  scopeSummaries,
  onWorld,
  onOpenPlay,
  onOpenProgress,
}: {
  level: 'world' | 'continent'
  continent?: Continent
  activeCountryCount: number
  evidenceStatus: 'loading' | 'ready' | 'error'
  dueCount: number
  dueCountryCount: number
  reviewReasonSummary: WorldCountriesTodayReviewReasonSummary
  nextLearning: { track: WorldCountriesTodayLearningTrack; subregionLabel: string } | null
  journey: WorldCountriesJourneyPresentation | null
  guidedSubregionId?: SubregionId | null
  onFocusGuidedSubregion?: () => void
  refreshing: boolean
  caughtUp: boolean
  scopeComplete?: boolean
  scopeProgress?: WorldCountriesScopeProgress | null
  incompleteSubregionLabels?: readonly string[]
  consolidationAvailable?: boolean
  scopeSummaries: readonly GuidedHomeScopeSummary[]
  onWorld: () => void
  onOpenPlay: () => void
  onOpenProgress: () => void
}) {
  const whyTodayItems = [
    reviewReasonSummary.mistakes > 0 && `${reviewReasonSummary.mistakes} recent ${reviewReasonSummary.mistakes === 1 ? 'mistake' : 'mistakes'}`,
    reviewReasonSummary.firstRecall > 0 && `${reviewReasonSummary.firstRecall} first recall`,
    reviewReasonSummary.firstReviewAfterLearning > 0 && `${reviewReasonSummary.firstReviewAfterLearning} first ${reviewReasonSummary.firstReviewAfterLearning === 1 ? 'review' : 'reviews'}`,
    reviewReasonSummary.spaced > 0 && `${reviewReasonSummary.spaced} ready to revisit`,
  ].filter((item): item is string => Boolean(item))
  const whyTodayText = whyTodayItems.join(' · ')
  const scopeName = continent ?? 'World'
  const inspectedSubregionLabel = journey ? getSubregionDefinition(journey.subregionId).label : null
  const guidedSubregionLabel = guidedSubregionId ? getSubregionDefinition(guidedSubregionId).label : null
  const isInspectingOtherSubregion = Boolean(journey && (!guidedSubregionId || journey.subregionId !== guidedSubregionId))
  const scopeIsComplete = scopeComplete || scopeProgress?.complete === true
  const completionSummary = scopeProgress
    ? `${scopeProgress.completeCountries} of ${scopeProgress.totalCountries} countries complete`
    : 'Some countries still need practice'
  const unfinishedGeography = incompleteSubregionLabels.length > 0
    ? `${incompleteSubregionLabels.slice(0, 3).join(', ')}${incompleteSubregionLabels.length > 3 ? '…' : ''} ${incompleteSubregionLabels.length === 1 ? 'remains' : 'remain'}.`
    : null
  const statusHeading = activeCountryCount === 0
    ? 'No countries in this scope'
    : evidenceStatus === 'error'
      ? 'Progress unavailable'
      : evidenceStatus === 'loading'
        ? 'Loading your progress'
        : dueCount > 0
          ? `${dueCount} ${dueCount === 1 ? 'review' : 'reviews'} ready`
          : caughtUp
            ? scopeIsComplete ? 'Complete' : 'Caught up for today'
            : 'Ready for the next step'
  const statusExplanation = activeCountryCount === 0
    ? `There are no countries to learn in ${scopeName}.`
    : evidenceStatus === 'loading'
      ? 'Your saved progress is loading; the map will stay visible.'
      : evidenceStatus === 'error'
        ? "We couldn't load your progress. Play remains available."
        : dueCount > 0
          ? nextLearning
            ? `Review first. Then ${learningStepDescription(nextLearning.track, nextLearning.subregionLabel)}.`
            : "Review what you've learned before adding something new."
          : nextLearning
            ? `Next: ${learningStepDescription(nextLearning.track, nextLearning.subregionLabel)}.`
            : scopeIsComplete
              ? "You've completed the guided Country and Capital recall for this scope. Play and progress remain available."
              : `Nothing needs reviewing right now. ${scopeName} is still in progress.`

  const rails = useMemo(() => ({
    left: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-geography-heading">
        <GeographyBreadcrumbs items={level === 'world'
          ? [{ label: 'World', current: true }]
          : [{ label: 'World', onSelect: onWorld }, { label: continent ?? 'Continent', current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{scopeName} geography</p>
          <h2 id="world-countries-guided-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">{level === 'world' ? 'Explore the world' : 'Learning regions'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{level === 'world' ? 'Choose a continent to see your progress.' : 'Choose a region to see where you are in the journey.'}</p>
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
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-status-heading">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Continue</p>
          <h2 id="world-countries-guided-status-heading" className="mt-1 text-lg font-bold text-zinc-100">{statusHeading}</h2>
          <p role="status" aria-live="polite" className="mt-2 text-sm text-zinc-400">{statusExplanation}</p>
        </div>
        {evidenceStatus === 'ready' && activeCountryCount > 0 && dueCount > 0 && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><dt className="text-xs uppercase tracking-wider text-zinc-500">Reviews</dt><dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCount}</dd></div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><dt className="text-xs uppercase tracking-wider text-zinc-500">Countries</dt><dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCountryCount}</dd></div>
          </dl>
        )}
        {dueCount > 0 && whyTodayText.length > 0 && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" aria-labelledby="world-countries-guided-why-heading">
            <p id="world-countries-guided-why-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why now</p>
            <p className="mt-1 leading-relaxed text-zinc-300">{whyTodayText}</p>
            {reviewReasonSummary.repeated > 0 && <p className="mt-1 text-xs font-semibold text-amber-300">{reviewReasonSummary.repeated} {reviewReasonSummary.repeated === 1 ? 'item needs' : 'items need'} extra practice</p>}
          </section>
        )}
        {caughtUp && !scopeIsComplete && evidenceStatus === 'ready' && activeCountryCount > 0 && (
          <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm" aria-labelledby="world-countries-guided-consolidation-heading">
            <p id="world-countries-guided-consolidation-heading" className="text-xs font-semibold uppercase tracking-wider text-amber-300">Still in progress</p>
            <p className="mt-1 text-zinc-300">{completionSummary}. {unfinishedGeography ?? 'Some countries still need practice.'}</p>
          </section>
        )}
        {journey && (
          <>
            {isInspectingOtherSubregion && (
              <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">You're viewing {inspectedSubregionLabel}</p>
                <p className="mt-1 text-zinc-300">{nextLearning
                  ? `Your next step is still in ${guidedSubregionLabel ?? 'the guided area'}.`
                  : consolidationAvailable
                    ? 'There is nothing new to learn here right now, but you can keep practising unfinished recall.'
                    : 'Your guided path stays the same.'}</p>
                {onFocusGuidedSubregion && <button type="button" onClick={onFocusGuidedSubregion} className="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200">{guidedSubregionLabel ? `Back to ${guidedSubregionLabel}` : 'Back to the guided view'}</button>}
              </section>
            )}
            <JourneyPath journey={journey} />
          </>
        )}
        <div className="space-y-2" aria-label="World Countries secondary actions">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Play and progress</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onOpenPlay} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Play</button>
            <button type="button" onClick={onOpenProgress} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">View progress</button>
          </div>
          {level === 'continent' && <button type="button" onClick={onWorld} className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm font-semibold text-zinc-400 hover:border-zinc-600 hover:text-zinc-100">Back to World</button>}
          {refreshing && <p className="text-xs text-zinc-500">Updating your progress…</p>}
        </div>
      </WorldCountriesPanel>
    ),
    leftLabel: 'Geography',
    rightLabel: 'Learning journey',
  }), [activeCountryCount, caughtUp, completionSummary, consolidationAvailable, continent, dueCount, dueCountryCount, evidenceStatus, guidedSubregionId, guidedSubregionLabel, inspectedSubregionLabel, isInspectingOtherSubregion, journey, level, nextLearning, onFocusGuidedSubregion, onOpenPlay, onOpenProgress, onWorld, refreshing, reviewReasonSummary, scopeIsComplete, scopeName, scopeSummaries, statusExplanation, statusHeading, unfinishedGeography, whyTodayText])
  useRails(rails)
  return null
}

function JourneyPath({ journey }: { journey: WorldCountriesJourneyPresentation }) {
  const subregionLabel = getSubregionDefinition(journey.subregionId).label
  return (
    <section className="space-y-2" aria-labelledby="world-countries-journey-heading">
      <p id="world-countries-journey-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Journey · {subregionLabel}</p>
      <ol className="space-y-2">
        {journey.stages.map((stage, index) => (
          <li key={stage.id} className="flex items-start gap-2" data-journey-stage={stage.id} data-journey-status={stage.status}>
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${stage.status === 'complete' ? 'border-green-500/40 bg-green-500/10 text-green-300' : stage.status === 'current' ? 'border-cyan-400 bg-cyan-600 text-white' : 'border-zinc-700 text-zinc-500'}`} aria-hidden="true">{stage.status === 'complete' ? '✓' : index + 1}</span>
            <span className="min-w-0"><span className={`block text-xs font-semibold ${stage.status === 'current' ? 'text-zinc-100' : 'text-zinc-300'}`}>{stage.label}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{stage.detail}</span></span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function learningStepDescription(track: WorldCountriesTodayLearningTrack, subregionLabel: string): string {
  return track === 'learn-countries'
    ? `learn the countries in ${subregionLabel}`
    : `add the capitals in ${subregionLabel}`
}
