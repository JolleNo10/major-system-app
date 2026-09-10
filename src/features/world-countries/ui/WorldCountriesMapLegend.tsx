import { getCountryProgressColor, WORLD_COUNTRIES_PROGRESS_LABELS } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_COUNTRY_CORE_STATES } from '@/features/world-countries/learning/scopeProgress'

/** Compact, visible legend for the core progress colors used by Country maps. */
export function WorldCountriesMapLegend() {
  return (
    <ul
      data-testid="world-countries-map-legend"
      aria-label="Map progress states"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-zinc-400"
    >
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
  )
}
