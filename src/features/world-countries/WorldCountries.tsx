import { useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import { countries } from './data/countries'
import { countryClassifications } from './data/countryClassification'
import { resolveCountrySet } from './geography/countrySet'
import { WorldCountriesDrill } from '@/features/world-countries/drill/WorldCountriesDrill'
import { WorldCountriesRecite } from '@/features/world-countries/recite/WorldCountriesRecite'
import { WorldCountriesToday } from '@/features/world-countries/today/WorldCountriesToday'
import { WorldCountriesPopulationProvider } from './WorldCountriesPopulationContext'

type WorldCountriesArea = 'today' | 'drill' | 'recite'

const AREAS: readonly { id: WorldCountriesArea; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'drill', label: 'Drill' },
  { id: 'recite', label: 'Recite' },
]

/** World Countries application shell; workflows own their behavior and state. */
export function WorldCountries({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const [area, setArea] = useState<WorldCountriesArea>('today')
  const activeCountries = useMemo(
    () => resolveCountrySet(countries, countryClassifications, settings.worldCountriesIncludedEntityGroups),
    [settings.worldCountriesIncludedEntityGroups],
  )

  useLayoutHeader(
    <nav
      aria-label="World Countries navigation"
      className="w-full min-w-0 py-2"
    >
      <span className="sr-only">World Countries</span>

      <div
        className="flex min-w-0 items-center gap-2"
      >
        <div
          role="tablist"
          aria-label="World Countries activities"
          className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1"
        >
          {AREAS.map(candidate => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={area === candidate.id}
              onClick={() => setArea(candidate.id)}
              className={`min-w-0 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                area === candidate.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>
    </nav>,
    [area],
  )

  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {area === 'today' && <WorldCountriesToday answerMode={answerMode} onNavigate={setArea} />}
      {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} />}
      {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} />}
    </WorldCountriesPopulationProvider>
  )
}
