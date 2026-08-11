import { useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import { countries } from './data/countries'
import { countryClassifications } from './data/countryClassification'
import { resolveCountrySet } from './geography/countrySet'
import { WorldCountriesDrill } from '@/features/world-countries/drill/WorldCountriesDrill'
import { WorldCountriesMaintenance } from '@/features/world-countries/maintenance/WorldCountriesMaintenance'
import { WorldCountriesPrepare } from '@/features/world-countries/prepare/WorldCountriesPrepare'
import { WorldCountriesRecite } from '@/features/world-countries/recite/WorldCountriesRecite'
import { WorldCountriesPopulationProvider } from './worldCountriesPopulation'

type WorldCountriesArea = 'prepare' | 'drill' | 'recite' | 'maintenance'

const AREAS: readonly { id: WorldCountriesArea; label: string }[] = [
  { id: 'prepare', label: 'Prepare' },
  { id: 'drill', label: 'Drill' },
  { id: 'recite', label: 'Recite' },
]

/** World Countries application shell; workflows own their behavior and state. */
export function WorldCountries({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const [area, setArea] = useState<WorldCountriesArea>('prepare')
  const activeCountries = useMemo(
    () => resolveCountrySet(countries, countryClassifications, settings.worldCountriesIncludedEntityGroups),
    [settings.worldCountriesIncludedEntityGroups],
  )

  useLayoutHeader(
    <div className="w-full space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-100">Learn, practise and retain</h1>
        </div>
        <button
          type="button"
          onClick={() => setArea('maintenance')}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            area === 'maintenance'
              ? 'border-cyan-500 bg-cyan-600 text-white'
              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'
          }`}
        >
          Due review
        </button>
      </div>

      <div role="tablist" aria-label="World Countries activities" className="flex w-fit gap-1 rounded-lg bg-zinc-800 p-1">
        {AREAS.map(candidate => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={area === candidate.id}
            onClick={() => setArea(candidate.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              area === candidate.id ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {candidate.label}
          </button>
        ))}
      </div>
    </div>,
    [area],
  )

  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {area === 'prepare' && <WorldCountriesPrepare answerMode={answerMode} />}
      {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} />}
      {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} />}
      {area === 'maintenance' && <WorldCountriesMaintenance answerMode={answerMode} />}
    </WorldCountriesPopulationProvider>
  )
}
