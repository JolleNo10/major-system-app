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
  scopeSummaries: readonly GuidedHomeScopeSummary[]
  onWorld: () => void
  onOpenPlay: () => void
  onOpenProgress: () => void
}) {
  const whyTodayItems = [
    reviewReasonSummary.mistakes > 0 && `${reviewReasonSummary.mistakes} ${reviewReasonSummary.mistakes === 1 ? 'mistake' : 'mistakes'}`,
    reviewReasonSummary.firstRecall > 0 && `${reviewReasonSummary.firstRecall} first recall`,
    reviewReasonSummary.firstReviewAfterLearning > 0 && `${reviewReasonSummary.firstReviewAfterLearning} first review after Learning`,
    reviewReasonSummary.spaced > 0 && `${reviewReasonSummary.spaced} spaced`,
  ].filter((item): item is string => Boolean(item))
  const whyTodayText = whyTodayItems.join(' · ')
  const scopeName = continent ?? 'World'
  const inspectedSubregionLabel = journey ? getSubregionDefinition(journey.subregionId).label : null
  const guidedSubregionLabel = guidedSubregionId ? getSubregionDefinition(guidedSubregionId).label : null
  const isInspectingOtherSubregion = Boolean(journey && (!guidedSubregionId || journey.subregionId !== guidedSubregionId))
  const statusHeading = activeCountryCount === 0
    ? '0 Countries active'
    : evidenceStatus === 'error'
      ? 'Guided status unavailable'
      : evidenceStatus === 'loading'
        ? 'Guided status loading'
        : dueCount > 0
          ? `${dueCount} core reviews due`
          : caughtUp
            ? 'All caught up'
            : 'Ready for the next step'
  const statusExplanation = activeCountryCount === 0
    ? `No active Countries are available in ${scopeName}.`
    : evidenceStatus === 'loading'
      ? 'Retained recall evidence is loading; the map will keep its stable shell.'
      : evidenceStatus === 'error'
        ? 'Guided status could not load. Freeform Play remains available.'
        : dueCount > 0
          ? nextLearning
            ? `Continue review first. Next: Learn ${trackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}`
            : 'Continue review before introducing more core material.'
          : nextLearning
            ? `Continue with Learn ${trackLabel(nextLearning.track)} · ${nextLearning.subregionLabel}`
            : 'No core review is due and no new guided Learning remains.'

  const rails = useMemo(() => ({
    left: (
      <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-geography-heading">
        <GeographyBreadcrumbs items={level === 'world'
          ? [{ label: 'World', current: true }]
          : [{ label: 'World', onSelect: onWorld }, { label: continent ?? 'Continent', current: true }]} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{scopeName} geography</p>
          <h2 id="world-countries-guided-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">{level === 'world' ? 'Explore the world' : 'Learning regions'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Select geography to inspect its progress. Selection does not start a session.</p>
        </div>
        <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
          <span className="block text-xs uppercase tracking-wider text-zinc-500">Population</span>
          <span className="mt-1 block font-semibold tabular-nums text-zinc-100">{activeCountryCount} active {activeCountryCount === 1 ? 'Country' : 'Countries'}</span>
        </p>
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
                <span className="mt-1 block text-xs text-zinc-500">{summary.status ?? `${summary.progress.completeCountries} / ${summary.progress.totalCountries} complete`}</span>
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
        {evidenceStatus === 'ready' && activeCountryCount > 0 && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><dt className="text-xs uppercase tracking-wider text-zinc-500">Due reviews</dt><dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCount}</dd></div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"><dt className="text-xs uppercase tracking-wider text-zinc-500">Due Countries</dt><dd className="mt-1 font-semibold tabular-nums text-zinc-100">{dueCountryCount}</dd></div>
          </dl>
        )}
        {dueCount > 0 && whyTodayText.length > 0 && (
          <section className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm" aria-labelledby="world-countries-guided-why-heading">
            <p id="world-countries-guided-why-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Why now</p>
            <p className="mt-1 leading-relaxed text-zinc-300">{whyTodayText}</p>
            {reviewReasonSummary.repeated > 0 && <p className="mt-1 text-xs font-semibold text-amber-300">{reviewReasonSummary.repeated} repeated difficulty</p>}
          </section>
        )}
        {nextLearning && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm"><p className="text-xs uppercase tracking-wider text-cyan-300">Next Learning</p><p className="mt-1 font-semibold text-zinc-100">{trackLabel(nextLearning.track)} · {nextLearning.subregionLabel}</p></div>}
        {journey && (
          <>
            {isInspectingOtherSubregion && (
              <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Inspecting {inspectedSubregionLabel}</p>
                <p className="mt-1 text-zinc-300">{nextLearning ? `Continue still follows ${guidedSubregionLabel ?? 'the guided recommendation'}.` : 'No guided action is currently scheduled; this inspection does not change the guided path.'}</p>
                {onFocusGuidedSubregion && <button type="button" onClick={onFocusGuidedSubregion} className="mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200">{guidedSubregionId ? 'Return to guided Subregion' : 'Clear inspection'}</button>}
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
          {refreshing && <p className="text-xs text-zinc-500">Refreshing guided status…</p>}
        </div>
      </WorldCountriesPanel>
    ),
    leftLabel: 'Geography',
    rightLabel: 'Guided journey',
  }), [activeCountryCount, continent, dueCount, dueCountryCount, evidenceStatus, guidedSubregionId, guidedSubregionLabel, inspectedSubregionLabel, isInspectingOtherSubregion, journey, level, nextLearning, onFocusGuidedSubregion, onOpenPlay, onOpenProgress, onWorld, refreshing, reviewReasonSummary, scopeName, scopeSummaries, statusExplanation, statusHeading, whyTodayText])
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

function trackLabel(track: WorldCountriesTodayLearningTrack): string {
  return track === 'learn-countries' ? 'Countries' : 'Capitals'
}
