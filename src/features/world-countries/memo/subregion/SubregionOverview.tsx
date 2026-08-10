import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { CountryLearningMap } from './CountryLearningMap'

export function SubregionOverview({
  continent,
  subregion,
  entries,
  learned,
  capitalsLearned,
  onStart,
  onPracticeStageB,
  onStartCapitals,
  onPracticeCapitals,
  mapEntries = entries,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  learned: boolean
  capitalsLearned: boolean
  onStart: () => void
  onPracticeStageB: () => void
  onStartCapitals: () => void
  onPracticeCapitals: () => void
  mapEntries?: readonly Country[]
}) {
  const definition = getSubregionDefinition(subregion)

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Subregion</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">{definition.label}</h1>
            <p className="mt-1 text-sm text-zinc-500">{entries.length} countries · {continent}</p>
          </div>
        </div>
      </section>

      <CountryLearningMap
        continent={continent}
        scopeCountries={mapEntries}
        showNames
        showOrderNumbers
        ariaLabel={`Map of ${definition.label}`}
      />

      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-zinc-100">Countries</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {learned ? 'The ordered country recall is complete. You can review it whenever you like.' : 'Learn the countries and their locations.'}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onStart} disabled={entries.length === 0} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
              {learned ? 'Review countries' : 'Start learning countries'}
            </button>
            {learned && (
              <button type="button" onClick={onPracticeStageB} disabled={entries.length === 0} className="rounded-lg border border-cyan-500/50 bg-zinc-900 px-4 py-2 text-sm font-semibold text-cyan-300 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
                Practice country recall
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-zinc-100">Capitals</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {capitalsLearned
                ? 'You completed a clean Country → Capital recall round. Review it whenever you like.'
                : countriesLearnedHint(learned)}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={onStartCapitals} disabled={entries.length === 0} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
              {capitalsLearned ? 'Review capitals' : 'Start learning capitals'}
            </button>
            {capitalsLearned && (
              <button type="button" onClick={onPracticeCapitals} disabled={entries.length === 0} className="rounded-lg border border-violet-500/50 bg-zinc-900 px-4 py-2 text-sm font-semibold text-violet-300 hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-40">
                Practice capital recall
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function countriesLearnedHint(learned: boolean): string {
  return learned
    ? 'Learn the capital for each country.'
    : 'Learn the capital for each country. Recommended after learning the countries.'
}
