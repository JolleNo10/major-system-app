import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from './data/countries'
import { countries } from './data/countries'
import { countryClassifications } from './data/countryClassification'
import { normalizeWorldCountriesIncludedEntityGroups, resolveCountrySet } from './geography/countrySet'
import { WorldCountriesDrill } from '@/features/world-countries/drill/WorldCountriesDrill'
import { WorldCountriesRecite } from '@/features/world-countries/recite/WorldCountriesRecite'
import { WorldCountriesToday } from '@/features/world-countries/today/WorldCountriesToday'
import { WorldCountriesQuiz } from '@/features/world-countries/practice/WorldCountriesQuiz'
import { WorldCountriesPlay } from './WorldCountriesPlay'
import { WorldCountriesPopulationProvider } from './WorldCountriesPopulationContext'
import type { WorldCountriesLearnPracticeMode } from './drill/learnPracticeSetupModes'

type WorldCountriesArea = 'home' | 'continent' | 'play' | 'drill' | 'recite' | 'quiz'
type DrillEntry = {
  purpose: 'drill' | 'learn-practise'
  learnPracticeMode?: WorldCountriesLearnPracticeMode
}

/** World Countries composition boundary for Home, geography hubs, Playground, and existing workflows. */
export function WorldCountries({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const [area, setArea] = useState<WorldCountriesArea>('home')
  const [continent, setContinent] = useState<Continent | null>(null)
  const [drillEntry, setDrillEntry] = useState<DrillEntry | null>(null)
  const activeCountries = useMemo(
    () => resolveCountrySet(
      countries,
      countryClassifications,
      normalizeWorldCountriesIncludedEntityGroups(settings.worldCountriesIncludedEntityGroups),
    ),
    [settings.worldCountriesIncludedEntityGroups],
  )

  const goHome = () => {
    setDrillEntry(null)
    setContinent(null)
    setArea('home')
  }
  const goToContinent = (nextContinent: Continent) => {
    setContinent(nextContinent)
    setArea('continent')
  }
  const goToScope = useCallback(() => {
    setDrillEntry(null)
    setArea(continent ? 'continent' : 'home')
  }, [continent])
  const openPlay = () => setArea('play')
  const openWorkflow = (workflow: Extract<WorldCountriesArea, 'drill' | 'recite' | 'quiz'>) => {
    if (workflow === 'drill') setDrillEntry(null)
    setArea(workflow)
  }
  const openDrillEntry = (entry: DrillEntry) => {
    setDrillEntry(entry)
    setArea('drill')
  }

  const header = useMemo(() => (
    <nav aria-label="World Countries navigation" className="flex w-full min-w-0 items-center justify-between gap-3 py-2">
      <button type="button" onClick={goHome} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
        <span className="block truncate text-sm font-semibold text-zinc-100">World Countries</span>
        <span className="block text-xs text-zinc-500">{continent && area === 'continent' ? `World / ${continent}` : area === 'play' ? 'World / Playground' : 'Learn the world'}</span>
      </button>
      <button
        type="button"
        data-world-countries-playground
        aria-current={area === 'play' ? 'page' : undefined}
        onClick={area === 'play' ? goToScope : openPlay}
        className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${area === 'play' ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}
      >
        Playground
      </button>
    </nav>
  ), [area, continent, goToScope])
  useLayoutHeader(header)

  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {area === 'home' && <WorldCountriesToday answerMode={answerMode} onNavigate={openWorkflow} onSelectContinent={goToContinent} />}
      {area === 'continent' && continent && <WorldCountriesToday answerMode={answerMode} continent={continent} onNavigate={openWorkflow} onSelectContinent={goToContinent} onWorld={goHome} />}
      {area === 'play' && <WorldCountriesPlay scopeLabel={continent ?? 'World'} scopeContinent={continent ?? undefined} onBack={goToScope} onOpenRecite={() => openWorkflow('recite')} onOpenQuiz={() => openWorkflow('quiz')} onOpenLocateCountries={() => openDrillEntry({ purpose: 'learn-practise', learnPracticeMode: 'locate-countries' })} onOpenLocateCapitals={() => openDrillEntry({ purpose: 'learn-practise', learnPracticeMode: 'locate-capitals' })} onOpenCapitalPractice={() => openDrillEntry({ purpose: 'learn-practise', learnPracticeMode: 'capitals' })} onOpenCustomDrill={() => openDrillEntry({ purpose: 'drill' })} />}
      {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} onExit={goToScope} initialPurpose={drillEntry?.purpose} initialLearnPracticeMode={drillEntry?.learnPracticeMode} />}
      {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} onExit={goToScope} />}
      {area === 'quiz' && <WorldCountriesQuiz answerMode={answerMode} onExit={goToScope} />}
    </WorldCountriesPopulationProvider>
  )
}
