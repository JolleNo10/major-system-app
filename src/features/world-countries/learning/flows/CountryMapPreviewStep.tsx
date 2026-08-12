import type { Continent, Country } from '@/features/world-countries/data/countries'
import { CountryLearningMap } from '@/features/world-countries/learning/CountryLearningMap'
import { LearningHeader } from './MemoryPreviewStep'

export function CountryMapPreviewStep({
  continent,
  entries,
  onStart,
  onExit,
}: {
  continent: Continent
  entries: readonly Country[]
  onStart: () => void
  onExit: () => void
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Intro" title="Learn the country locations" onExit={onExit} />
      <p className="text-sm leading-relaxed text-zinc-400">
        Study the map with Country names before the guided walkthrough.
      </p>
      <CountryLearningMap
        continent={continent}
        scopeCountries={entries}
        showNames
        showHoverNames
        ariaLabel="Map with Country names"
      />
      <button type="button" onClick={onStart} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">
        Start walkthrough
      </button>
    </div>
  )
}
