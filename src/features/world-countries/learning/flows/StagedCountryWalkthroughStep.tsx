import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function StagedCountryWalkthroughStep({
  continent, entries, index, setNumber, hoveredCountryId, onMove, onContinue, onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  index: number
  setNumber: number
  hoveredCountryId?: string | null
  onMove: (offset: -1 | 1) => void
  onContinue: () => void
  onExit: () => void
}) {
  const country = entries[index]
  if (!country) return null
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label={`Set ${setNumber} · Step 1 - Review`} title={`${index + 1} / ${entries.length}`} onExit={onExit} />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Study this location</p>
        <h2 className="mt-2 text-3xl font-black text-zinc-100">{country.country}</h2>
        <p className="mt-2 text-sm text-zinc-500">Shape · location · position in your learning sequence</p>
      </section>
      <CountryLearningMap continent={continent} scopeCountries={entries} namedCountryId={country.id} highlightedCountryId={country.id} hoveredCountryId={hoveredCountryId} showOrderNumbers ariaLabel={`${country.country} highlighted on the map`} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
        {index < entries.length - 1 ? <button type="button" onClick={() => onMove(1)} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Next</button> : <button type="button" onClick={onContinue} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Continue to Locate</button>}
      </div>
    </div>
  )
}
