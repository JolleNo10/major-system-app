import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { AnswerMode } from '@/core/types'
import { Overlay } from '@/app/layout/Overlay'
import { useSettings } from '@/app/settings/SettingsContext'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import { getContinents, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getContinentMemoProgress, getWorldMemoProgress, type MemoProgress } from './memoProgress'
import { MemoMap } from './MemoMap'
import { ContinentOrderEditor } from './continent/ContinentOrderEditor'
import { SubregionMemoScreen } from './subregion/SubregionMemoScreen'
import { ContinentOverviewRails, WorldOverviewRails } from './WorldCountriesMemoRails'

function learnedCountryIds(): Set<string> {
  const states = new Map(getAllSubregionLearningStates().map(state => [state.subregionId, state]))
  return new Set(countries
    .filter(country => isSubregionCountriesLearned(states.get(country.subregionId)))
    .map(country => country.id))
}

export function WorldCountriesMemo({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const { settings } = useSettings()
  const [continent, setContinent] = useState<Continent | null>(null)
  const [subregion, setSubregion] = useState<SubregionId | null>(null)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [learningVersion, setLearningVersion] = useState(0)
  const continents = useMemo(() => getContinents(), [])
  const learnedIds = useMemo(() => learnedCountryIds(), [learningVersion])
  const worldProgress = getWorldMemoProgress(learnedIds)

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
        learningVersion={learningVersion}
        locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onLearningChanged={refreshLearning}
        onExit={backToContinent}
        onWorld={backToWorld}
      />
    )
  }

  if (continent) {
    return (
      <ContinentMemoOverview
        continent={continent}
        memoedCountryIds={learnedIds}
        hoveredGroupId={hoveredGroupId}
        learningVersion={learningVersion}
        onWorld={backToWorld}
        onSelectSubregion={selectSubregion}
        onHoverGroup={setHoveredGroupId}
        onLearningChanged={refreshLearning}
      />
    )
  }

  return (
    <WorldMemoOverview
      continents={continents}
      progress={worldProgress}
      memoedCountryIds={learnedIds}
      hoveredGroupId={hoveredGroupId}
      onSelectContinent={selectContinent}
      onHoverGroup={setHoveredGroupId}
    />
  )
}

function WorldMemoOverview({
  continents,
  progress,
  memoedCountryIds,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
}: {
  continents: readonly Continent[]
  progress: MemoProgress
  memoedCountryIds: ReadonlySet<string>
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
}) {
  return (
    <MemoOverviewShell
      rails={
        <WorldOverviewRails
          continents={continents}
          memoedCountryIds={memoedCountryIds}
          progress={progress}
          hoveredGroupId={hoveredGroupId}
          onSelectContinent={onSelectContinent}
          onHoverGroup={onHoverGroup}
        />
      }
      map={
        <MemoMap
          level="world"
          memoedCountryIds={memoedCountryIds}
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
  memoedCountryIds,
  hoveredGroupId,
  learningVersion,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onLearningChanged,
}: {
  continent: Continent
  memoedCountryIds: ReadonlySet<string>
  hoveredGroupId: string | null
  learningVersion: number
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onLearningChanged: () => void
}) {
  const [editingOrder, setEditingOrder] = useState(false)
  const [draftSubregions, setDraftSubregions] = useState<readonly SubregionDefinition[] | null>(null)
  const subregions = useMemo(
    () => getSubregionsForContinentInEffectiveOrder(continent, undefined, getContinentMetadata(continent)),
    [continent, learningVersion],
  )
  const progress = useMemo(() => getContinentMemoProgress(continent, memoedCountryIds), [continent, memoedCountryIds])
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
            memoedCountryIds={memoedCountryIds}
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
            memoedCountryIds={memoedCountryIds}
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
