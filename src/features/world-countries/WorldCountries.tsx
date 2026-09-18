import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useLayoutHeader } from '@/app/layout/PageLayoutContext'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from './data/countries'
import { countries } from './data/countries'
import { countryClassifications } from './data/countryClassification'
import { normalizeWorldCountriesIncludedEntityGroups, resolveCountrySet } from './geography/countrySet'
import { WorldCountriesDrill, type WorldCountriesDrillInitialScope } from '@/features/world-countries/drill/WorldCountriesDrill'
import { WorldCountriesRecite } from '@/features/world-countries/recite/WorldCountriesRecite'
import { WorldCountriesToday } from '@/features/world-countries/today/WorldCountriesToday'
import type { WorldCountriesTodayNavigation } from '@/features/world-countries/today/WorldCountriesToday'
import { WorldCountriesQuiz } from '@/features/world-countries/practice/WorldCountriesQuiz'
import { WorldCountriesPlay } from './WorldCountriesPlay'
import { WorldCountriesPopulationProvider } from './WorldCountriesPopulationContext'
import type { WorldCountriesSetupActivity } from './drill/setupActivity'
import { migrateWorldCountriesAttemptTypes } from './learning/attemptTypeMigration'

type WorldCountriesArea = 'home' | 'continent' | 'play' | 'drill' | 'recite' | 'quiz'
type DrillEntry = {
  activity: WorldCountriesSetupActivity
  initialScope?: WorldCountriesDrillInitialScope
}

/** World Countries composition boundary for Home, geography hubs, Playground, and existing workflows. */
export function WorldCountries({ answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const [area, setArea] = useState<WorldCountriesArea>('home')
  const [continent, setContinent] = useState<Continent | null>(null)
  const [worldJourneyContinent, setWorldJourneyContinent] = useState<Continent | null>(null)
  const [drillEntry, setDrillEntry] = useState<DrillEntry | null>(null)
  const activeCountries = useMemo(
    () => resolveCountrySet(
      countries,
      countryClassifications,
      normalizeWorldCountriesIncludedEntityGroups(settings.worldCountriesIncludedEntityGroups),
    ),
    [settings.worldCountriesIncludedEntityGroups],
  )
  const activePopulationKey = useMemo(
    () => activeCountries.map(country => country.id).sort().join('|'),
    [activeCountries],
  )
  const [attemptTypeMigration, setAttemptTypeMigration] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setAttemptTypeMigration('loading')
    void migrateWorldCountriesAttemptTypes({ activeCountries }).then(() => {
      if (!cancelled) setAttemptTypeMigration('ready')
    }, () => {
      if (!cancelled) setAttemptTypeMigration('error')
    })
    return () => { cancelled = true }
  }, [activeCountries, activePopulationKey])

  const goHome = () => {
    setDrillEntry(null)
    setContinent(null)
    setWorldJourneyContinent(null)
    setArea('home')
  }
  const goToContinent = (nextContinent: Continent, nextWorldJourneyContinent: Continent | null = worldJourneyContinent) => {
    setContinent(nextContinent)
    setWorldJourneyContinent(nextWorldJourneyContinent)
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
  const openTodayNavigation = (navigation: WorldCountriesTodayNavigation) => {
    if (navigation.area === 'play') {
      openPlay()
      return
    }
    if (navigation.area === 'drill') {
      openDrillEntry({ activity: { kind: 'drill' }, initialScope: navigation.scope })
      return
    }
    openWorkflow(navigation.area)
  }

  const header = useMemo(() => {
    if (area === 'home' || area === 'continent') return null
    const headerArea: string = area

    return (
      <nav aria-label="World Countries navigation" className="flex w-full min-w-0 items-center justify-between gap-3 py-2">
        <button type="button" onClick={goHome} className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
          <span className="block truncate text-sm font-semibold text-zinc-100">World Countries</span>
          <span className="block text-xs text-zinc-500">{continent && headerArea === 'continent' ? `World / ${continent}` : area === 'play' ? 'World / Playground' : 'Learn the world'}</span>
        </button>
        <button
          type="button"
          data-world-countries-playground
          aria-current={area === 'play' ? 'page' : undefined}
          onClick={area === 'play' ? goToScope : openPlay}
          className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${area === 'play' ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}
        >
          {area === 'play' ? `Back to ${continent ?? 'World'}` : 'Playground'}
        </button>
      </nav>
    )
  }, [area, continent, goToScope])
  useLayoutHeader(header)

  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {attemptTypeMigration === 'loading' && <div role="status" className="p-6 text-sm text-zinc-400">Loading World Countries progress…</div>}
      {attemptTypeMigration === 'error' && <div role="alert" className="p-6 text-sm text-red-300">World Countries progress could not be loaded.</div>}
      {attemptTypeMigration === 'ready' && <>
        {area === 'home' && <WorldCountriesToday answerMode={answerMode} onNavigate={openTodayNavigation} onSelectContinent={goToContinent} />}
        {area === 'continent' && continent && <WorldCountriesToday answerMode={answerMode} continent={continent} worldJourneyContinent={worldJourneyContinent} onNavigate={openTodayNavigation} onSelectContinent={goToContinent} onWorld={goHome} />}
        {area === 'play' && <WorldCountriesPlay scopeLabel={continent ?? 'World'} scopeContinent={continent ?? undefined} onBack={goToScope} onOpenRecite={() => openWorkflow('recite')} onOpenQuiz={() => openWorkflow('quiz')} onOpenLocateCountries={() => openDrillEntry({ activity: { kind: 'practice', mode: 'locate-countries' } })} onOpenLocateCapitals={() => openDrillEntry({ activity: { kind: 'practice', mode: 'locate-capitals' } })} onOpenCapitalPractice={() => openDrillEntry({ activity: { kind: 'practice', mode: 'capitals' } })} onOpenCustomDrill={() => openDrillEntry({ activity: { kind: 'drill' } })} />}
        {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} onExit={goToScope} initialActivity={drillEntry?.activity} initialScope={drillEntry?.initialScope} />}
        {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} onExit={goToScope} />}
        {area === 'quiz' && <WorldCountriesQuiz answerMode={answerMode} onExit={goToScope} />}
      </>}
    </WorldCountriesPopulationProvider>
  )
}
