import { useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useWorldCountriesPopulation } from '@/features/world-countries/worldCountriesPopulation'
import {
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import { selectWorldCountriesMaintenanceCandidates } from './maintenanceCandidates'

/** Structural entry point for system-directed review selection. */
export function WorldCountriesMaintenance({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const activeCountries = useWorldCountriesPopulation()
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)
  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({
      countryIds: activeCountries.map(country => country.id),
      skills: WORLD_COUNTRIES_RECALL_SKILLS,
    }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [activeCountries])
  const candidates = useMemo(
    () => recallProgress
      ? selectWorldCountriesMaintenanceCandidates(activeCountries, recallProgress)
      : [],
    [activeCountries, recallProgress],
  )
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-maintenance-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Maintenance</p>
        <h1 id="world-countries-maintenance-heading" className="mt-1 text-2xl font-bold text-zinc-100">What needs review?</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Maintenance selects learned material that needs reinforcement from the current {activeCountries.length}-entity population. Historical evidence for inactive entities remains stored but is ignored until those entities become active again.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400" aria-live="polite">
        {recallProgress === null
          ? 'Loading active review candidates…'
          : candidates.length === 0
            ? 'No active Countries currently need review.'
            : `${candidates.length} active ${candidates.length === 1 ? 'Country needs' : 'Countries need'} review.`}
      </div>
    </section>
  )
}
