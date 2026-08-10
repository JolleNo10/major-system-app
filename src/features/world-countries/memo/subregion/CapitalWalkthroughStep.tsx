import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { CapitalLearningFlowState } from '@/features/world-countries/learning/capitalLearningFlow'
import { CountryLearningMap } from './CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function CapitalWalkthroughStep({
  continent,
  entries,
  flow,
  onMove,
  onStartRecall,
  onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  flow: CapitalLearningFlowState
  onMove: (offset: -1 | 1) => void
  onStartRecall: () => void
  onExit: () => void
}) {
  const index = flow.walkthroughIndex
  const country = entries[index]
  if (!country) return null

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Capital walkthrough" title={`${index + 1} / ${entries.length}`} onExit={onExit} />
      <section aria-labelledby="capital-relationship-heading" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">Study this relationship</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5">
          <h2 id="capital-relationship-heading" className="text-2xl font-black text-zinc-100">{country.country}</h2>
          <span aria-hidden="true" className="text-sm text-zinc-600">↔</span>
          <p className="text-lg font-semibold text-green-300">{country.capital}</p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Country · location context · capital</p>
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
          <button type="button" onClick={onStartRecall} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Start capital recall</button>
        )}
      </div>
      {index === entries.length - 1 && (
        <button type="button" onClick={() => onMove(-1)} className="w-full text-xs text-zinc-500 hover:text-zinc-300">Review walkthrough again</button>
      )}
    </div>
  )
}
