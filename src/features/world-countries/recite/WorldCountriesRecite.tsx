import { useMemo } from 'react'
import type { AnswerMode } from '@/core/types'
import { useWorldCountriesPopulation } from '@/features/world-countries/worldCountriesPopulation'
import { createWorldCountriesReciteScope } from './reciteScope'

/** Structural entry point for complete ordered World Countries recall. */
export function WorldCountriesRecite({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const activeCountries = useWorldCountriesPopulation()
  const scope = useMemo(() => createWorldCountriesReciteScope(activeCountries), [activeCountries])
  const preview = activeCountries.slice(0, 3).map(country => country.country).join(', ')
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-recite-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p>
        <h1 id="world-countries-recite-heading" className="mt-1 text-2xl font-bold text-zinc-100">Complete recall</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Select a learned Subregion, Continent, or the World and recall it in its defined order. The current recitation scope contains {scope.totalCountries} active entities.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400">
        <p className="font-semibold text-zinc-200">Active recitation scope</p>
        <p className="mt-1">
          {preview}{scope.totalCountries > 3 ? `, and ${scope.totalCountries - 3} more` : ''}
        </p>
      </div>
    </section>
  )
}
