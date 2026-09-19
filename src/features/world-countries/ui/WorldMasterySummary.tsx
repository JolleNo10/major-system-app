import { WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION } from '@/features/world-countries/learning/progressPresentation'
import { getWorldCountriesScopeDisplayedMasteryRatio, type WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'
import { formatWorldCountriesScopeStatus, type WorldCountriesScopeStatus } from '@/features/world-countries/learning/scopeStatus'
import { WorldCountriesDualRecallBar } from './WorldCountriesDualRecallBar'

/** Workflow-neutral core mastery summary shared by guided and setup surfaces. */
export function WorldMasterySummary({ progress, scopeStatus, scopeLabel = 'World' }: {
  progress: WorldCountriesScopeProgress | null
  /**
   * Highest ladder rung this scope has reached; the finish-line count stays
   * separate. Omit it to keep the strict mastery headline: Drill setup still
   * does, because its recall rungs would be gated behind guided-Learning
   * milestones that Drill evidence never sets, and that view is being reworked.
   */
  scopeStatus?: WorldCountriesScopeStatus | null
  scopeLabel?: string
}) {
  const title = scopeLabel === 'World' ? 'World mastery' : `${scopeLabel} progress`
  return (
    <section
      className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm"
      aria-labelledby="world-mastery-heading"
      data-testid="world-mastery-summary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="world-mastery-heading" className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{title}</h2>
          <p className="mt-1 text-xs text-zinc-500">Core Country finish line across the active {scopeLabel} population.</p>
        </div>
        {progress === null || scopeStatus === null ? (
          <p role="status" aria-live="polite" className="text-sm text-zinc-400">Loading mastery…</p>
        ) : scopeStatus === undefined ? (
          <p className="font-semibold tabular-nums text-zinc-100">
            Mastery <span className="text-cyan-300">{Math.round(getWorldCountriesScopeDisplayedMasteryRatio(progress) * 100)}%</span>
          </p>
        ) : (
          <p className="font-semibold tabular-nums text-cyan-300">
            {formatWorldCountriesScopeStatus(scopeStatus)}
          </p>
        )}
      </div>

      {progress !== null && (
        <>
          {progress.totalCountries === 0 && <p className="text-xs font-semibold text-zinc-300">0 Countries active</p>}
          <WorldCountriesDualRecallBar
            totalCountries={progress.totalCountries}
            countryCounts={progress.locationToCountryStateCounts}
            capitalCounts={progress.countryToCapitalStateCounts}
          />
          <p className="text-xs text-zinc-400">{progress.completeCountries} / {progress.totalCountries} Countries fully mastered.</p>
          <p className="text-xs text-zinc-400">{WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION}</p>
        </>
      )}
    </section>
  )
}
