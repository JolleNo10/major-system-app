import { useMemo, useState } from 'react'
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

/** World Countries composition boundary for Home, geography hubs, Play, and existing workflows. */
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
  const goToScope = () => {
    setDrillEntry(null)
    setArea(continent ? 'continent' : 'home')
  }
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
        <span className="block text-xs text-zinc-500">{continent && area === 'continent' ? `World / ${continent}` : area === 'play' ? 'Play' : 'Learn the world'}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
        <button type="button" onClick={goHome} aria-current={area === 'home' ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${area === 'home' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>Home</button>
        <button type="button" onClick={openPlay} aria-current={area === 'play' ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${area === 'play' ? 'bg-cyan-600 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>Play</button>
      </div>
    </nav>
  ), [area, continent])
  useLayoutHeader(header)

  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {area === 'home' && <WorldCountriesToday answerMode={answerMode} onNavigate={openWorkflow} onSelectContinent={goToContinent} onOpenPlay={openPlay} />}
      {area === 'continent' && continent && <WorldCountriesToday answerMode={answerMode} continent={continent} onNavigate={openWorkflow} onSelectContinent={goToContinent} onWorld={goHome} onOpenPlay={openPlay} />}
      {area === 'play' && <WorldCountriesPlay scopeLabel={continent ?? 'World'} onBack={goToScope} onOpenRecite={() => openWorkflow('recite')} onOpenQuiz={() => openWorkflow('quiz')} onOpenMapPractice={() => openDrillEntry({ purpose: 'learn-practise', learnPracticeMode: 'locate-countries' })} onOpenMixedPractice={() => openDrillEntry({ purpose: 'learn-practise', learnPracticeMode: 'capitals' })} onOpenCustomPractice={() => openDrillEntry({ purpose: 'drill' })} />}
      {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} onExit={goToScope} initialPurpose={drillEntry?.purpose} initialLearnPracticeMode={drillEntry?.learnPracticeMode} />}
      {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} onExit={goToScope} />}
      {area === 'quiz' && <WorldCountriesQuiz answerMode={answerMode} onExit={goToScope} />}
    </WorldCountriesPopulationProvider>
  )
}
