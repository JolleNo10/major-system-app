import { deriveWorldCountriesPrimaryStatusCounts, getCountryProgressColor, WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import type { WorldCountriesPrimaryStatusCount } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES, type WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'
import type { Country } from '@/features/world-countries/data/countries'
import type { RecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'

/** Workflow-neutral core mastery summary shared by guided and setup surfaces. */
export function WorldMasterySummary({ progress, scopeLabel = 'World', primaryStatusContext }: { progress: WorldCountriesScopeProgress | null; scopeLabel?: string; primaryStatusContext?: { countries: readonly Pick<Country, 'id' | 'subregionId'>[]; recallProgress: RecallProgress; learningStates: LearningStates } }) {
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
        {progress === null ? (
          <p role="status" aria-live="polite" className="text-sm text-zinc-400">Loading mastery…</p>
        ) : (
          <p className="font-semibold tabular-nums text-zinc-100">
            {progress.coreMasteredSkills} / {progress.coreSkillCount} core skills mastered
            <span className="ml-3 text-cyan-300">{formatCompletionPercentage(progress)}%</span>
          </p>
        )}
      </div>

      {progress !== null && (
        <>
          {progress.totalCountries === 0 && <p className="text-xs font-semibold text-zinc-300">0 Countries active</p>}
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-300" aria-label="World mastery state counts">
            {(primaryStatusContext ? deriveWorldCountriesPrimaryStatusCounts(primaryStatusContext.countries, primaryStatusContext.learningStates, primaryStatusContext.recallProgress) : WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => ({ state, label: WORLD_COUNTRIES_PROGRESS_LABELS[state], count: progress.countryStateCounts[state], color: getCountryProgressColor(state) }))).map((entry: WorldCountriesPrimaryStatusCount) => (
              <li key={entry.state} className="inline-flex items-center gap-1.5 tabular-nums">
                <span className="h-2.5 w-2.5 rounded-sm border border-white/15" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <span>{entry.label} {entry.count}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">{progress.completeCountries} / {progress.totalCountries} Countries fully mastered.</p>
          <p className="text-xs text-zinc-400">{WORLD_COUNTRIES_CORE_FINISH_LINE_EXPLANATION}</p>
        </>
      )}
    </section>
  )
}

function formatCompletionPercentage(progress: WorldCountriesScopeProgress): number {
  return Math.round(progress.coreMasteryRatio * 100)
}
