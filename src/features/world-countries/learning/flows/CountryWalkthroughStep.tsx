import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import type { CountryLearningFlowState } from '@/features/world-countries/learning/countryLearningFlow'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function CountryWalkthroughStep({
  continent,
  entries,
  flow,
  onMove,
  onStartLocation,
  onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  flow: CountryLearningFlowState
  onMove: (offset: -1 | 1) => void
  onStartLocation: () => void
  onExit: () => void
}) {
  const index = flow.walkthroughIndex
  const country = entries[index]
  if (!country) return null

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Country walkthrough" title={`${index + 1} / ${entries.length}`} onExit={onExit} />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Study this location</p>
        <h2 className="mt-2 text-3xl font-black text-zinc-100">{country.country}</h2>
        <p className="mt-2 text-sm text-zinc-500">Shape · location · position in your learning sequence</p>
      </section>
      <CountryLearningMap
        continent={continent}
        scopeCountries={entries}
        namedCountryId={country.id}
        highlightedCountryId={country.id}
        ariaLabel={`${country.country} highlighted on the map`}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
        {index < entries.length - 1 ? (
          <button type="button" onClick={() => onMove(1)} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Next</button>
        ) : (
          <button type="button" onClick={onStartLocation} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Start location recall</button>
        )}
      </div>
      {index === entries.length - 1 && (
        <button type="button" onClick={() => onMove(-1)} className="w-full text-xs text-zinc-500 hover:text-zinc-300">Review walkthrough again</button>
      )}
    </div>
  )
}
