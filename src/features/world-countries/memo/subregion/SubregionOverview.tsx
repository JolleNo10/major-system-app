import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { CountryLearningMap } from './CountryLearningMap'

export function SubregionOverview({
  continent,
  subregion,
  entries,
  learned,
  onStart,
  onPracticeStageB,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  learned: boolean
  onStart: () => void
  onPracticeStageB: () => void
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
        scopeCountries={entries}
        showNames
        ariaLabel={`Map of ${definition.label}`}
      />

      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-100">Countries</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {learned ? 'The ordered country recall is complete. You can review it whenever you like.' : 'Learn the countries and their locations.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onStart} disabled={entries.length === 0} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
              {learned ? 'Review countries' : 'Start learning countries'}
            </button>
            {learned && (
              <button type="button" onClick={onPracticeStageB} disabled={entries.length === 0} className="rounded-lg border border-cyan-500/50 bg-zinc-900 px-4 py-2 text-sm font-semibold text-cyan-300 hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
                Practice Stage B
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="px-1 text-xs text-zinc-600">Capitals are a later learning stage. Country–Capital reference remains available when that stage is designed.</p>
    </div>
  )
}
