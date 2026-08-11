import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { AnswerMode } from '@/core/types'
import { Overlay } from '@/app/layout/Overlay'
import { useSettings } from '@/app/settings/SettingsContext'
import type { Continent } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import {
  createWorldCountriesMemoReadinessByCountry,
  createWorldCountriesMemoReadinessColors,
} from '@/features/world-countries/learning/memoReadiness'
import { getContinents, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { useWorldCountriesPopulation } from '@/features/world-countries/worldCountriesPopulation'
import {
  getContinentMemoReadinessProgress,
  getWorldMemoReadinessProgress,
  type MemoReadinessProgress,
} from './memoProgress'
import { MemoMap } from './MemoMap'
import { ContinentOrderEditor } from './continent/ContinentOrderEditor'
import { SubregionMemoScreen } from './subregion/SubregionMemoScreen'
import { ContinentOverviewRails, WorldOverviewRails } from './WorldCountriesMemoRails'

export function WorldCountriesMemo({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const activeCountries = useWorldCountriesPopulation()
  const [continent, setContinent] = useState<Continent | null>(null)
  const [subregion, setSubregion] = useState<SubregionId | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [learningVersion, setLearningVersion] = useState(0)
  const continents = useMemo(() => getContinents(activeCountries), [activeCountries])
  const learningStates = useMemo(() => getAllSubregionLearningStates(activeCountries), [activeCountries, learningVersion])
  const worldProgress = useMemo(() => getWorldMemoReadinessProgress(learningStates, activeCountries), [activeCountries, learningStates])
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
      <SubregionMemoScreen
        continent={continent}
        subregion={subregion}
        activeCountries={activeCountries}
        learningVersion={learningVersion}
        locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onLearningChanged={refreshLearning}
        onSelectSubregion={selectSubregion}
        onExit={backToContinent}
        onWorld={backToWorld}
      />
    )
  }

  if (continent) {
    return (
      <ContinentMemoOverview
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
        entries={activeCountries}
      />
    )
  }

  return (
    <WorldMemoOverview
      continents={continents}
      entries={activeCountries}
      progress={worldProgress}
      learningStates={learningStates}
      hoveredGroupId={hoveredGroupId}
      onSelectContinent={selectContinent}
      onHoverGroup={setHoveredGroupId}
      memoReadinessColorsById={memoReadinessColorsById}
      memoReadinessByCountryId={memoReadinessByCountryId}
    />
  )
}

function WorldMemoOverview({
  continents,
  entries,
  progress,
  learningStates,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
  memoReadinessColorsById,
  memoReadinessByCountryId,
}: {
  continents: readonly Continent[]
  entries: readonly import('@/features/world-countries/data/countries').Country[]
  progress: MemoReadinessProgress
  learningStates: ReturnType<typeof getAllSubregionLearningStates>
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  memoReadinessColorsById: ReadonlyMap<string, string>
  memoReadinessByCountryId: ReadonlyMap<string, import('@/features/world-countries/learning/memoReadiness').WorldCountriesMemoReadiness>
}) {
  return (
    <MemoOverviewShell
      rails={
        <WorldOverviewRails
          continents={continents}
          entries={entries}
          learningStates={learningStates}
          progress={progress}
          hoveredGroupId={hoveredGroupId}
          onSelectContinent={onSelectContinent}
          onHoverGroup={onHoverGroup}
        />
      }
      map={
        <MemoMap
          level="world"
          memoReadinessColorsById={memoReadinessColorsById}
          memoReadinessByCountryId={memoReadinessByCountryId}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onSelectContinent={onSelectContinent}
        />
      }
    />
  )
}

function ContinentMemoOverview({
  continent,
  entries,
  learningStates,
  hoveredGroupId,
  learningVersion,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onLearningChanged,
  memoReadinessColorsById,
  memoReadinessByCountryId,
}: {
  continent: Continent
  entries: readonly import('@/features/world-countries/data/countries').Country[]
  learningStates: ReturnType<typeof getAllSubregionLearningStates>
  hoveredGroupId: string | null
  learningVersion: number
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onLearningChanged: () => void
  memoReadinessColorsById: ReadonlyMap<string, string>
  memoReadinessByCountryId: ReadonlyMap<string, import('@/features/world-countries/learning/memoReadiness').WorldCountriesMemoReadiness>
}) {
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftSubregions, setDraftSubregions] = useState<readonly SubregionDefinition[] | null>(null)
  const subregions = useMemo(
    () => getSubregionsForContinentInEffectiveOrder(continent, entries, getContinentMetadata(continent)),
    [continent, entries, learningVersion],
  )
  const progress = useMemo(() => getContinentMemoReadinessProgress(continent, learningStates, entries), [continent, entries, learningStates])
  const railSubregions = draftSubregions ?? subregions

  const openOrderEditor = useCallback(() => {
    setDraftSubregions(subregions)
    setEditingOrder(true)
  }, [subregions])
  const closeOrderEditor = useCallback(() => {
    setDraftSubregions(null)
    setEditingOrder(false)
  }, [])
  const handleOrderChanged = useCallback(() => {
    setDraftSubregions(null)
    onLearningChanged()
  }, [onLearningChanged])

  return (
    <>
      <MemoOverviewShell
        rails={
          <ContinentOverviewRails
            continent={continent}
            subregions={railSubregions}
            entries={entries}
            learningStates={learningStates}
            progress={progress}
            hoveredGroupId={hoveredGroupId}
            onWorld={onWorld}
            onSelectSubregion={onSelectSubregion}
            onHoverGroup={onHoverGroup}
            onEditOrder={openOrderEditor}
          />
        }
        map={
          <MemoMap
            level="continent"
            continent={continent}
            memoReadinessColorsById={memoReadinessColorsById}
            memoReadinessByCountryId={memoReadinessByCountryId}
            hoveredGroupId={hoveredGroupId}
            onHoverGroup={onHoverGroup}
            onSelectSubregion={onSelectSubregion}
          />
        }
      />

      {editingOrder && (
        <Overlay
          onClose={closeOrderEditor}
          ariaLabel="Edit learning order"
          header={<h2 className="text-lg font-bold text-zinc-100">Edit learning order</h2>}
          maxWidth="max-w-lg"
          presentation="side-panel"
        >
          <ContinentOrderEditor
            continent={continent}
            entries={subregions}
            onDraftChanged={setDraftSubregions}
            onChanged={handleOrderChanged}
            onClose={closeOrderEditor}
          />
        </Overlay>
      )}
    </>
  )
}

function MemoOverviewShell({ rails, map }: { rails: ReactNode; map: ReactNode }) {
  return (
    <>
      {rails}
      <div className="w-full animate-fade-in">{map}</div>
    </>
  )
}
