import type { Continent } from '@/features/world-countries/data/countries'
import { getContinents } from '@/features/world-countries/geography/queries'
import {
  getDrillSubregions,
  isEntireContinentSelection,
  withAllDrillSubregions,
  toggleDrillSubregion,
  type WorldCountriesDrillSelection,
} from './drillSelection'
import {
  WORLD_COUNTRIES_DRILL_MODES,
  type WorldCountriesDrillMode,
} from './drillModes'

export function DrillSetup({
  selection,
  mode,
  onSelectionChange,
  onModeChange,
  onStart,
}: {
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  onSelectionChange: (selection: WorldCountriesDrillSelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onStart: () => void
}) {
  const continents = getContinents()
  const subregions = getDrillSubregions(selection.continent)
  const entireContinent = isEntireContinentSelection(selection)
  const selectedSubregionCount = selection.subregionIds.length

  const changeContinent = (continent: Continent) => {
    onSelectionChange(withAllDrillSubregions(continent))
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Drill setup</p>
        <h1 id="world-countries-drill-heading" className="mt-1 text-2xl font-bold text-zinc-100">Deliberate practice</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Choose one Continent, the Subregions to practise, and the recall relationship to test.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <div>
          <label htmlFor="world-countries-drill-continent" className="block text-sm font-semibold text-zinc-200">Continent</label>
          <select
            id="world-countries-drill-continent"
            value={selection.continent}
            onChange={event => changeContinent(event.target.value as Continent)}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500 sm:w-64"
          >
            {continents.map(continent => <option key={continent}>{continent}</option>)}
          </select>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Geographic scope</h2>
              <p className="mt-1 text-xs text-zinc-500">Select the whole Continent or one or more Subregions.</p>
            </div>
            <span className="text-xs tabular-nums text-cyan-300">{selectedSubregionCount} Subregion{selectedSubregionCount === 1 ? '' : 's'} selected</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              aria-pressed={entireContinent}
              onClick={() => onSelectionChange(withAllDrillSubregions(selection.continent))}
              className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${entireContinent
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}
              `}
            >
              <span className="font-semibold">Entire Continent</span>
              <span className="mt-1 block text-xs text-zinc-500">All currently defined Subregions</span>
            </button>
            {subregions.map(subregion => {
              const selected = selection.subregionIds.includes(subregion.id)
              return (
                <button
                  key={subregion.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectionChange(toggleDrillSubregion(selection, subregion.id))}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${selected
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}
                  `}
                >
                  <span className="mr-2 text-cyan-400">{selected ? '✓' : '○'}</span>
                  {subregion.label}
                </button>
              )
            })}
          </div>
          {selection.subregionIds.length === 0 && (
            <p className="mt-3 text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Recall mode</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {WORLD_COUNTRIES_DRILL_MODES.map(candidate => {
            const selected = candidate.id === mode
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onModeChange(candidate.id)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${selected
                  ? 'border-violet-500 bg-violet-500/15'
                  : 'border-zinc-700 bg-zinc-800 hover:border-violet-600'}
                `}
              >
                <span className={`block text-sm font-semibold ${selected ? 'text-violet-200' : 'text-zinc-200'}`}>{candidate.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{candidate.description}</span>
              </button>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        disabled={selection.subregionIds.length === 0}
        onClick={onStart}
        className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Drill
      </button>
    </div>
  )
}
