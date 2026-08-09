import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { useSettings } from '@/app/settings/SettingsContext'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getAllSubregionLearningStates, isSubregionCountriesLearned } from '@/features/world-countries/persistence/subregionLearningStore'
import { getCountryId } from '@/features/world-countries/domain/country'
import { getContinents, getCountriesForContinent, getSubregionDefinitionsForContinent } from '@/features/world-countries/domain/geography'
import { getContinentMemoProgress, getSubregionMemoProgress, getWorldMemoProgress } from './memoProgress'
import { MemoMap } from './MemoMap'
import { SubregionMemoScreen } from './subregion/SubregionMemoScreen'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'

function ProgressBadge({ learnedCount, totalCount }: { learnedCount: number; totalCount: number }) {
  return <span className="text-xs tabular-nums text-zinc-500">{learnedCount}/{totalCount} learned</span>
}

function learnedCountryIds(): Set<string> {
  const states = new Map(getAllSubregionLearningStates().map(state => [state.subregionId, state]))
  return new Set(countries
    .filter(country => isSubregionCountriesLearned(states.get(country.subregionId!)))
    .map(getCountryId))
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

  const backToWorld = () => {
    setContinent(null)
    setSubregion(null)
    setHoveredGroupId(null)
  }

  const backToContinent = () => {
    setSubregion(null)
    setHoveredGroupId(null)
  }

  if (continent && subregion) {
    const definition = getSubregionDefinition(subregion)
    return (
      <div className="w-full space-y-4 animate-fade-in">
        <MemoBreadcrumbs continent={continent} subregion={definition.label} onWorld={backToWorld} onContinent={backToContinent} />
        <SubregionMemoScreen
          continent={continent}
          subregion={subregion}
          learningVersion={learningVersion}
          locationCleanTargetMinimum={settings.worldCountriesLocationCleanTargetMinimum}
          fuzzyMatching={settings.worldCountriesFuzzyAnswerMatching}
          onLearningChanged={refreshLearning}
          onExit={backToContinent}
        />
      </div>
    )
  }

  if (continent) {
    const continentProgress = getContinentMemoProgress(continent, learnedIds)
    const subregions = getSubregionDefinitionsForContinent(continent)
    return (
      <div className="w-full space-y-4 animate-fade-in">
        <MemoBreadcrumbs continent={continent} onWorld={backToWorld} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Continent</p>
              <h1 className="mt-1 text-2xl font-bold text-zinc-100">{continent}</h1>
            </div>
            <ProgressBadge learnedCount={continentProgress.memoedCount} totalCount={continentProgress.totalCount} />
          </div>
          <p className="mt-2 text-sm text-zinc-500">Select a Subregion to prepare and learn its countries.</p>
        </div>
        <MemoMap
          level="continent"
          continent={continent}
          memoedCountryIds={learnedIds}
          hoveredGroupId={hoveredGroupId}
          onSelectSubregion={selectSubregion}
        />
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="subregions-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="subregions-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Subregions</h2>
            <span className="text-xs text-zinc-600">{getCountriesForContinent(continent).length} countries</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {subregions.map(definition => {
              const progress = getSubregionMemoProgress(continent, definition.id, learnedIds)
              return (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => selectSubregion(definition.id)}
                  onMouseEnter={() => setHoveredGroupId(getSubregionHoverGroupId(definition.label))}
                  onMouseLeave={() => setHoveredGroupId(null)}
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left transition-colors hover:border-cyan-500 hover:bg-zinc-800/80"
                >
                  <span className="font-medium text-zinc-200">{definition.label}</span>
                  <ProgressBadge learnedCount={progress.memoedCount} totalCount={progress.totalCount} />
                </button>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Memo</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">World Countries</h1>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-500">World progress</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-green-300">{worldProgress.memoedCount}/{worldProgress.totalCount}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">Choose a Continent, then a Subregion. Countries are learned after one clean ordered recall.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${worldProgress.ratio * 100}%` }} />
        </div>
      </div>
      <MemoMap level="world" memoedCountryIds={learnedIds} hoveredGroupId={hoveredGroupId} onSelectContinent={selectContinent} />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="continents-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="continents-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Continents</h2>
          <span className="text-xs text-zinc-600">Click the map or choose below</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {continents.map(item => {
            const progress = getContinentMemoProgress(item, learnedIds)
            return (
              <button
                key={item}
                type="button"
                onClick={() => selectContinent(item)}
                onMouseEnter={() => setHoveredGroupId(getContinentHoverGroupId(item))}
                onMouseLeave={() => setHoveredGroupId(null)}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left transition-colors hover:border-cyan-500 hover:bg-zinc-800/80"
              >
                <span className="font-medium text-zinc-200">{item}</span>
                <ProgressBadge learnedCount={progress.memoedCount} totalCount={progress.totalCount} />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MemoBreadcrumbs({ continent, subregion, onWorld, onContinent }: { continent?: Continent; subregion?: string; onWorld: () => void; onContinent?: () => void }) {
  return (
    <nav aria-label="Memo navigation" className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
      {continent && <><span className="text-zinc-700">/</span>{onContinent ? <button type="button" onClick={onContinent} className="text-zinc-500 hover:text-zinc-200">{continent}</button> : <span className="text-zinc-300">{continent}</span>}</>}
      {subregion && <><span className="text-zinc-700">/</span><span className="text-cyan-300">{subregion}</span></>}
    </nav>
  )
}
