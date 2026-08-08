import { useCallback, useMemo, useState } from 'react'
import type { AnswerMode } from '@/core/types'
import { countries, type Continent } from '@/features/world-countries/data/countries'
import { getContinents, getCountriesForContinent, getSubregionsForContinent } from './geographyMemo'
import { getContinentMemoProgress, getSubregionMemoProgress, getWorldMemoProgress } from './memoProgress'
import { loadMemoedCountryIds } from './memoStore'
import { MemoMap } from './MemoMap'
import { MemoWorkspace } from './MemoWorkspace'

function ProgressBadge({
  memoedCount,
  totalCount,
}: {
  memoedCount: number
  totalCount: number
}) {
  return (
    <span className="text-xs tabular-nums text-zinc-500">
      {memoedCount}/{totalCount} memoed
    </span>
  )
}

export function WorldCountriesMemo({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  const [continent, setContinent] = useState<Continent | null>(null)
  const [subregion, setSubregion] = useState<string | null>(null)
  const [memoedCountryIds, setMemoedCountryIds] = useState<Set<string>>(() => loadMemoedCountryIds())
  const continents = useMemo(() => getContinents(), [])
  const worldProgress = getWorldMemoProgress(memoedCountryIds)

  const selectContinent = useCallback((next: Continent) => {
    setContinent(next)
    setSubregion(null)
  }, [])

  const selectSubregion = useCallback((next: string) => {
    setSubregion(next)
  }, [])

  const onMemoed = useCallback((ids: Set<string>) => {
    setMemoedCountryIds(ids)
  }, [])

  const backToWorld = () => {
    setContinent(null)
    setSubregion(null)
  }

  const backToContinent = () => setSubregion(null)

  if (continent && subregion) {
    const subregionProgress = getSubregionMemoProgress(continent, subregion, memoedCountryIds)
    return (
      <div className="w-full space-y-4 animate-fade-in">
        <MemoBreadcrumbs continent={continent} subregion={subregion} onWorld={backToWorld} onContinent={backToContinent} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Subregion</p>
              <h1 className="mt-1 text-2xl font-bold text-zinc-100">{subregion}</h1>
            </div>
            <ProgressBadge memoedCount={subregionProgress.memoedCount} totalCount={subregionProgress.totalCount} />
          </div>
        </div>
        <MemoMap
          level="continent"
          continent={continent}
          selectedSubregion={subregion}
          memoedCountryIds={memoedCountryIds}
          onSelectSubregion={selectSubregion}
        />
        <MemoWorkspace
          continent={continent}
          subregion={subregion}
          memoedCountryIds={memoedCountryIds}
          onMemoed={onMemoed}
        />
      </div>
    )
  }

  if (continent) {
    const continentProgress = getContinentMemoProgress(continent, memoedCountryIds)
    const subregions = getSubregionsForContinent(continent)
    return (
      <div className="w-full space-y-4 animate-fade-in">
        <MemoBreadcrumbs continent={continent} onWorld={backToWorld} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Continent</p>
              <h1 className="mt-1 text-2xl font-bold text-zinc-100">{continent}</h1>
            </div>
            <ProgressBadge memoedCount={continentProgress.memoedCount} totalCount={continentProgress.totalCount} />
          </div>
          <p className="mt-2 text-sm text-zinc-500">Select a Subregion on the map or below to open its Memo workspace.</p>
        </div>
        <MemoMap
          level="continent"
          continent={continent}
          memoedCountryIds={memoedCountryIds}
          onSelectSubregion={selectSubregion}
        />
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="subregions-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="subregions-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Subregions</h2>
            <span className="text-xs text-zinc-600">{getCountriesForContinent(continent).length} countries</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {subregions.map(name => {
              const progress = getSubregionMemoProgress(continent, name, memoedCountryIds)
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectSubregion(name)}
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left transition-colors hover:border-cyan-500 hover:bg-zinc-800/80"
                >
                  <span className="font-medium text-zinc-200">{name}</span>
                  <ProgressBadge memoedCount={progress.memoedCount} totalCount={progress.totalCount} />
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
            <p className="mt-1 text-lg font-semibold tabular-nums text-green-300">
              {worldProgress.memoedCount}/{worldProgress.totalCount}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">Choose a Continent, then a Subregion. Memoed means the Country–Capital fact has been recalled successfully once.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${worldProgress.ratio * 100}%` }} />
        </div>
      </div>
      <MemoMap
        level="world"
        memoedCountryIds={memoedCountryIds}
        onSelectContinent={selectContinent}
      />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="continents-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="continents-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Continents</h2>
          <span className="text-xs text-zinc-600">Click the map or choose below</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {continents.map(item => {
            const progress = getContinentMemoProgress(item, memoedCountryIds)
            return (
              <button
                key={item}
                type="button"
                onClick={() => selectContinent(item)}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left transition-colors hover:border-cyan-500 hover:bg-zinc-800/80"
              >
                <span className="font-medium text-zinc-200">{item}</span>
                <ProgressBadge memoedCount={progress.memoedCount} totalCount={progress.totalCount} />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MemoBreadcrumbs({
  continent,
  subregion,
  onWorld,
  onContinent,
}: {
  continent?: Continent
  subregion?: string
  onWorld: () => void
  onContinent?: () => void
}) {
  return (
    <nav aria-label="Memo navigation" className="flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
      {continent && (
        <>
          <span className="text-zinc-700">/</span>
          {onContinent ? (
            <button type="button" onClick={onContinent} className="text-zinc-500 hover:text-zinc-200">{continent}</button>
          ) : <span className="text-zinc-300">{continent}</span>}
        </>
      )}
      {subregion && (
        <>
          <span className="text-zinc-700">/</span>
          <span className="text-cyan-300">{subregion}</span>
        </>
      )}
    </nav>
  )
}
