import { getCountryProgressColor, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES } from '@/features/world-countries/learning/scopeProgress'
import {
  WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES,
} from '@/features/world-countries/learning/learningReadiness'

/** Compact, visible legend for the one-status map ladder. */
export function WorldCountriesMapLegend() {
  return (
    <div
      data-testid="world-countries-map-legend"
      aria-label="Map legend: learning and recall health"
      className="space-y-2 text-[11px] text-zinc-400"
    >
      <section aria-label="Learning">
        <p className="mb-1 font-semibold uppercase tracking-wider text-zinc-500">Learning</p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {WORLD_COUNTRIES_LEARNING_READINESS_LEGEND_ENTRIES.map(entry => (
            <li key={entry.state} data-learning-state={entry.state} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15" style={{ backgroundColor: entry.color, ...entry.swatchStyle }} />
              <span>{entry.label}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Recall health">
        <p className="mb-1 font-semibold uppercase tracking-wider text-zinc-500">Recall health</p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => (
            <li key={state} data-progress-state={state} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full border border-white/15" style={{ backgroundColor: getCountryProgressColor(state) }} />
              <span>{WORLD_COUNTRIES_PROGRESS_LABELS[state]}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
