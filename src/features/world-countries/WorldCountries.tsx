import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
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


  return (
    <WorldCountriesPopulationProvider countries={activeCountries}>
      {area === 'home' && <WorldCountriesToday answerMode={answerMode} onNavigate={openTodayNavigation} onSelectContinent={goToContinent} />}
      {area === 'continent' && continent && <WorldCountriesToday answerMode={answerMode} continent={continent} worldJourneyContinent={worldJourneyContinent} onNavigate={openTodayNavigation} onSelectContinent={goToContinent} onWorld={goHome} />}
      {area === 'play' && <WorldCountriesPlay scopeLabel={continent ?? 'World'} scopeContinent={continent ?? undefined} onBack={goToScope} onOpenRecite={() => openWorkflow('recite')} onOpenQuiz={() => openWorkflow('quiz')} onOpenPractice={mode => openDrillEntry({ activity: { kind: 'practice', mode } })} onOpenCustomDrill={() => openDrillEntry({ activity: { kind: 'drill' } })} />}
      {area === 'drill' && <WorldCountriesDrill answerMode={answerMode} onExit={goToScope} initialActivity={drillEntry?.activity} initialScope={drillEntry?.initialScope} onOpenPlayground={openPlay} />}
      {area === 'recite' && <WorldCountriesRecite answerMode={answerMode} onExit={goToScope} />}
      {area === 'quiz' && <WorldCountriesQuiz answerMode={answerMode} onExit={goToScope} />}
    </WorldCountriesPopulationProvider>
  )
}
