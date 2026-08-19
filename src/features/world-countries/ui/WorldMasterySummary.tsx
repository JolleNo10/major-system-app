import { getCountryProgressColor, WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES, type WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'

/** Workflow-neutral World core mastery summary shared by Today and Drill. */
export function WorldMasterySummary({ progress }: { progress: WorldCountriesScopeProgress | null }) {
  return (
    <section
      className="space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm"
      aria-labelledby="world-mastery-heading"
      data-testid="world-mastery-summary"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="world-mastery-heading" className="text-xs font-semibold uppercase tracking-wider text-cyan-300">World mastery</h2>
          <p className="mt-1 text-xs text-zinc-500">Core Country finish line across the active World population.</p>
        </div>
        {progress === null ? (
          <p role="status" aria-live="polite" className="text-sm text-zinc-400">Loading mastery…</p>
        ) : (
          <p className="font-semibold tabular-nums text-zinc-100">
            {progress.completeCountries} / {progress.totalCountries} complete
            <span className="ml-3 text-cyan-300">{formatCompletionPercentage(progress)}%</span>
          </p>
        )}
      </div>

      {progress !== null && (
        <>
          {progress.totalCountries === 0 && <p className="text-xs font-semibold text-zinc-300">0 Countries active</p>}
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-300" aria-label="World mastery state counts">
            {WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => (
              <li key={state} className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-2.5 w-2.5 rounded-sm border border-white/15" style={{ backgroundColor: getCountryProgressColor(state) }} aria-hidden="true" />
                <span>{WORLD_COUNTRIES_PROGRESS_LABELS[state]} {progress.countryStateCounts[state]}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">{WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION}</p>
        </>
      )}
    </section>
  )
}

function formatCompletionPercentage(progress: WorldCountriesScopeProgress): number {
  if (progress.totalCountries === 0) return 0
  if (progress.complete) return 100
  return Math.min(99, Math.round(progress.completionRatio * 100))
}
