import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import {
  createWorldCountriesMemoReadinessByCountry,
  createWorldCountriesMemoReadinessColors,
} from '@/features/world-countries/learning/memoReadiness'
import { getContinentsInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { useWorldCountriesPopulation } from '@/features/world-countries/WorldCountriesPopulationContext'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { ContinentPrepareOverview } from './ContinentPrepareOverview'
import { SubregionPrepareScreen } from './subregion/SubregionPrepareScreen'
import { WorldPrepareOverview } from './WorldPrepareOverview'

export function WorldCountriesPrepare({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const activeCountries = useWorldCountriesPopulation()
  const [continent, setContinent] = useState<Continent | null>(null)
  const [subregion, setSubregion] = useState<SubregionId | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [learningVersion, setLearningVersion] = useState(0)
  const continents = useMemo(
    () => getContinentsInEffectiveOrder(activeCountries, getWorldMetadata()),
    [activeCountries, learningVersion],
  )
  const learningStates = useMemo(() => getAllSubregionLearningStates(activeCountries), [activeCountries, learningVersion])
  const memoReadinessColorsById = useMemo(
    () => createWorldCountriesMemoReadinessColors(activeCountries, learningStates),
    [activeCountries, learningStates],
  )
  const memoReadinessByCountryId = useMemo(
    () => createWorldCountriesMemoReadinessByCountry(activeCountries, learningStates),
    [activeCountries, learningStates],
  )

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
      <SubregionPrepareScreen
        continent={continent}
        subregion={subregion}
        activeCountries={activeCountries}
        learningVersion={learningVersion}
        onLearningChanged={refreshLearning}
        onSelectSubregion={selectSubregion}
        onExit={backToContinent}
        onWorld={backToWorld}
      />
    )
  }

  if (continent) {
    return (
      <ContinentPrepareOverview
        continent={continent}
        learningStates={learningStates}
        hoveredGroupId={hoveredGroupId}
        learningVersion={learningVersion}
        onWorld={backToWorld}
        onSelectSubregion={selectSubregion}
        onHoverGroup={setHoveredGroupId}
        onLearningChanged={refreshLearning}
        memoReadinessColorsById={memoReadinessColorsById}
        memoReadinessByCountryId={memoReadinessByCountryId}
        activeCountries={activeCountries}
      />
    )
  }

  return (
    <WorldPrepareOverview
      continents={continents}
      activeCountries={activeCountries}
      learningStates={learningStates}
      hoveredGroupId={hoveredGroupId}
      onLearningChanged={refreshLearning}
      onSelectContinent={selectContinent}
      onHoverGroup={setHoveredGroupId}
      memoReadinessColorsById={memoReadinessColorsById}
      memoReadinessByCountryId={memoReadinessByCountryId}
    />
  )
}
