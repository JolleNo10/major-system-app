import { getCountryProgressColor, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES } from '@/features/world-countries/learning/scopeProgress'
import {
  getWorldCountriesLearningReadinessLabel,
  WORLD_COUNTRIES_LEARNING_EDGE_STROKE,
  WORLD_COUNTRIES_LEARNING_READINESS_COLORS,
  WORLD_COUNTRIES_LEARNING_READINESS_STATES,
} from '@/features/world-countries/learning/learningReadiness'

/** Compact, visible legend for both independent map signals. */
export function WorldCountriesMapLegend() {
  return (
    <div
      data-testid="world-countries-map-legend"
      aria-label="Map legend: recall fill and learning edge"
      className="space-y-2 text-[11px] text-zinc-400"
    >
      <section aria-label="Recall / fill">
        <p className="mb-1 font-semibold uppercase tracking-wider text-zinc-500">Recall / fill</p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {WORLD_COUNTRIES_COUNTRY_CORE_STATES.map(state => (
            <li key={state} data-progress-state={state} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full border border-white/15"
                style={{ backgroundColor: getCountryProgressColor(state) }}
              />
              <span>{WORLD_COUNTRIES_PROGRESS_LABELS[state]}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Learning / edge">
        <p className="mb-1 font-semibold uppercase tracking-wider text-zinc-500">Learning / edge</p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {WORLD_COUNTRIES_LEARNING_READINESS_STATES.map(state => (
            <li key={state} data-learning-edge-state={state} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-sm border ${state === 'COUNTRIES_AND_CAPITALS_LEARNED' ? 'shadow-[0_0_5px_rgba(34,211,238,0.55)]' : ''}`}
                style={{ borderColor: state === 'NOT_LEARNED' ? WORLD_COUNTRIES_LEARNING_READINESS_COLORS[state] : WORLD_COUNTRIES_LEARNING_EDGE_STROKE }}
              />
              <span>{getWorldCountriesLearningReadinessLabel(state)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
