import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AnswerMode } from '@/core/types'
import { Overlay } from '@/app/layout/Overlay'
import { useSettings } from '@/app/settings/SettingsContext'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates } from '@/features/world-countries/learning/subregionLearningStore'
import { isSubregionCountriesLearned } from '@/features/world-countries/learning/subregionLearningState'
import {
  deriveWorldCountriesCountryProgress,
  loadWorldCountriesRecallProgress,
  type RecallProgress,
} from '@/features/world-countries/learning/recallProgress'
import { getCountryProgressState } from '@/features/world-countries/learning/progressPresentation'
import { WORLD_COUNTRIES_RECALL_SKILLS } from '@/features/world-countries/learning/recallTargets'
import {
  deriveWorldCountriesContinentProgress,
  deriveWorldCountriesSubregionProgress,
  deriveWorldCountriesWorldProgress,
  type WorldCountriesScopeProgress,
} from '@/features/world-countries/learning/scopeProgress'
import { getContinents, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getContinentMemoProgress, getWorldMemoProgress, type MemoProgress } from './memoProgress'
import { MemoMap } from './MemoMap'
import { ContinentOrderEditor } from './continent/ContinentOrderEditor'
import { SubregionMemoScreen } from './subregion/SubregionMemoScreen'
import { ContinentOverviewRails, WorldOverviewRails } from './WorldCountriesMemoRails'

const CORE_PROGRESS_COLORS: Readonly<Record<string, string>> = {
  unpractised: '#52525b',
  weak: '#dc2626',
  developing: '#d97706',
  strong: '#2563eb',
  complete: '#16a34a',
}

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
  const [recallProgress, setRecallProgress] = useState<RecallProgress | null>(null)
  const continents = useMemo(() => getContinents(), [])
  const learnedIds = useMemo(() => learnedCountryIds(), [learningVersion])
  const worldProgress = getWorldMemoProgress(learnedIds)

  useEffect(() => {
    let active = true
    setRecallProgress(null)
    void loadWorldCountriesRecallProgress({
      countryIds: countries.map(country => country.id),
      skills: WORLD_COUNTRIES_RECALL_SKILLS,
    }).then(progress => {
      if (active) setRecallProgress(progress)
    })
    return () => { active = false }
  }, [learningVersion])

  const countryColorsById = useMemo(() => {
    if (!recallProgress) return undefined
    return new Map(countries.map(country => {
      const progress = deriveWorldCountriesCountryProgress(country.id, recallProgress)
      const state = getCountryProgressState(progress, 'core')
      return [country.id, CORE_PROGRESS_COLORS[state] ?? CORE_PROGRESS_COLORS.unpractised] as const
    }))
  }, [recallProgress])
  const worldLearningProgress = useMemo(
    () => recallProgress ? deriveWorldCountriesWorldProgress(recallProgress) : null,
    [recallProgress],
  )
  const subregionLearningProgress = useMemo(
    () => subregion && recallProgress
      ? deriveWorldCountriesSubregionProgress(subregion, recallProgress)
      : null,
    [recallProgress, subregion],
  )
  const continentLearningProgress = useMemo(
    () => continent && recallProgress
      ? deriveWorldCountriesContinentProgress(continent, recallProgress)
      : null,
    [continent, recallProgress],
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
        learningVersion={learningVersion}
        locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum}
        fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
        onLearningChanged={refreshLearning}
        onSelectSubregion={selectSubregion}
        onExit={backToContinent}
        onWorld={backToWorld}
        countryColorsById={countryColorsById}
        learningProgress={subregionLearningProgress}
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
        countryColorsById={countryColorsById}
        learningProgress={continentLearningProgress}
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
      countryColorsById={countryColorsById}
      learningProgress={worldLearningProgress}
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
  countryColorsById,
  learningProgress,
}: {
  continents: readonly Continent[]
  progress: MemoProgress
  memoedCountryIds: ReadonlySet<string>
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  countryColorsById?: ReadonlyMap<string, string>
  learningProgress?: WorldCountriesScopeProgress | null
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
          learningProgress={learningProgress}
        />
      }
      map={
        <MemoMap
          level="world"
          memoedCountryIds={memoedCountryIds}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onSelectContinent={onSelectContinent}
          countryColorsById={countryColorsById}
          progressLegend={countryColorsById ? 'Core Country progress' : undefined}
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
  countryColorsById,
  learningProgress,
}: {
  continent: Continent
  memoedCountryIds: ReadonlySet<string>
  hoveredGroupId: string | null
  learningVersion: number
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onLearningChanged: () => void
  countryColorsById?: ReadonlyMap<string, string>
  learningProgress?: WorldCountriesScopeProgress | null
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
            learningProgress={learningProgress}
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
            countryColorsById={countryColorsById}
            progressLegend={countryColorsById ? 'Core Country progress' : undefined}
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
