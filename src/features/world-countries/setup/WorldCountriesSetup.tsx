import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import {
  createWorldCountriesLearningReadinessByCountry,
  createWorldCountriesLearningReadinessColors,
} from '@/features/world-countries/learning/learningReadiness'
import { getContinentsInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { ContinentSetupOverview } from './ContinentSetupOverview'
import { SubregionSetupScreen } from './subregion/SubregionSetupScreen'
import { WorldSetupOverview } from './WorldSetupOverview'

export type WorldCountriesSetupContext =
  | { kind: 'world' }
  | { kind: 'continent'; continent: Continent }
  | { kind: 'subregion'; continent: Continent; subregion: SubregionId }

export function WorldCountriesSetup({
  answerMode: _answerMode,
  context,
  onBackToDrill,
}: {
  answerMode: AnswerMode
  context?: WorldCountriesSetupContext
  onBackToDrill?: () => void
}) {
  const activeCountries = useWorldCountriesPopulation()
  const [continent, setContinent] = useState<Continent | null>(() => context?.kind === 'world' || !context ? null : context.continent)
  const [subregion, setSubregion] = useState<SubregionId | null>(() => context?.kind === 'subregion' ? context.subregion : null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [learningVersion, setLearningVersion] = useState(0)
  const continents = useMemo(
    () => getContinentsInEffectiveOrder(activeCountries, getWorldMetadata()),
    [activeCountries, learningVersion],
  )
  const learningStates = useMemo(() => getAllSubregionLearningStates(activeCountries), [activeCountries, learningVersion])
  const learningReadinessColorsById = useMemo(
    () => createWorldCountriesLearningReadinessColors(activeCountries, learningStates),
    [activeCountries, learningStates],
  )
  const learningReadinessByCountryId = useMemo(
    () => createWorldCountriesLearningReadinessByCountry(activeCountries, learningStates),
    [activeCountries, learningStates],
  )

  useEffect(() => {
    if (!context || context.kind === 'world') {
      setContinent(null)
      setSubregion(null)
    } else {
      setContinent(context.continent)
      setSubregion(context.kind === 'subregion' ? context.subregion : null)
    }
    setHoveredGroupId(null)
  }, [context])

  const refreshLearning = useCallback(() => setLearningVersion(version => version + 1), [])

  const selectContinent = useCallback((next: Continent) => {
    setContinent(next)
    setSubregion(null)
    setHoveredGroupId(null)
  }, [])

  const selectSubregion = useCallback((next: SubregionId) => {
    setSubregion(next)
    setHoveredGroupId(null)
  }, [])

  const backToWorld = useCallback(() => {
    setContinent(null)
    setSubregion(null)
    setHoveredGroupId(null)
  }, [])

  const backToContinent = useCallback(() => {
    setSubregion(null)
    setHoveredGroupId(null)
  }, [])

  if (continent && subregion) {
    return (
      <SubregionSetupScreen
        continent={continent}
        subregion={subregion}
        activeCountries={activeCountries}
        learningVersion={learningVersion}
        onLearningChanged={refreshLearning}
        onSelectSubregion={selectSubregion}
        onExit={backToContinent}
        onWorld={backToWorld}
        onBackToDrill={onBackToDrill}
      />
    )
  }

  if (continent) {
    return (
      <ContinentSetupOverview
        continent={continent}
        learningStates={learningStates}
        hoveredGroupId={hoveredGroupId}
        learningVersion={learningVersion}
        onWorld={backToWorld}
        onSelectSubregion={selectSubregion}
        onHoverGroup={setHoveredGroupId}
        onLearningChanged={refreshLearning}
        learningReadinessColorsById={learningReadinessColorsById}
        learningReadinessByCountryId={learningReadinessByCountryId}
        activeCountries={activeCountries}
        onBackToDrill={onBackToDrill}
      />
    )
  }

  return (
    <WorldSetupOverview
      continents={continents}
      activeCountries={activeCountries}
      learningStates={learningStates}
      hoveredGroupId={hoveredGroupId}
      onLearningChanged={refreshLearning}
      onSelectContinent={selectContinent}
      onHoverGroup={setHoveredGroupId}
      learningReadinessColorsById={learningReadinessColorsById}
      learningReadinessByCountryId={learningReadinessByCountryId}
      onBackToDrill={onBackToDrill}
    />
  )
}
