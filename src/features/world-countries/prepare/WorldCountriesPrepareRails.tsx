import { useRails } from '@/app/layout/PageLayoutContext'
import type { ReactNode } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getContinentMemoReadinessProgress,
  getNextSubregionToMemo,
  getSubregionMemoReadinessProgress,
  type MemoLearningStates,
  type MemoMilestone,
  type MemoReadinessProgress,
} from '@/features/world-countries/learning/memoProgress'
import {
  deriveWorldCountriesMemoReadinessFromTracks,
  getWorldCountriesMemoReadinessLabel,
} from '@/features/world-countries/learning/memoReadiness'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { PrepareMnemonicEditor } from './PrepareMnemonicEditor'

interface WorldOverviewRailsProps {
  continents: readonly Continent[]
  activeCountries?: readonly Country[]
  progress: MemoReadinessProgress
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
}

export function WorldOverviewRails({
  continents,
  activeCountries = countries,
  progress,
  learningStates,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
  onEditOrder,
}: WorldOverviewRailsProps) {
  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-continents-rail-heading">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
              <h2 id="world-countries-continents-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Continents</h2>
            </div>
            <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">
              Edit order
            </button>
          </div>

          <ProgressSummary label="World Prepare progress" progress={progress} />

          <nav aria-label="Continents">
            <ul className="space-y-1.5">
              {continents.map((continent, index) => (
                <PrepareHierarchyRailRow
                  key={continent}
                  label={continent}
                  groupId={getContinentHoverGroupId(continent)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectContinent(continent)}
                  onHoverGroup={onHoverGroup}
                  trailing={formatContinentProgress(getContinentMemoReadinessProgress(continent, learningStates, activeCountries))}
                  sequenceNumber={index + 1}
                />
              ))}
            </ul>
          </nav>
        </section>
      ),
      leftLabel: 'Continents',
    },
    [continents, activeCountries, learningStates, progress, hoveredGroupId, onSelectContinent, onHoverGroup, onEditOrder],
  )

  return null
}

interface ContinentOverviewRailsProps {
  continent: Continent
  subregions: readonly SubregionDefinition[]
  activeCountries?: readonly Country[]
  progress: MemoReadinessProgress
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
}

export function ContinentOverviewRails({
  continent,
  subregions,
  activeCountries = countries,
  progress,
  learningStates,
  hoveredGroupId,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onEditOrder,
}: ContinentOverviewRailsProps) {
  const nextSubregion = getNextSubregionToMemo(
    subregions,
    subregion => getSubregionMemoReadinessProgress(subregion, learningStates, activeCountries).readiness !== 'NOT_MEMOED',
  )

  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-subregions-rail-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{continent}</span>
          </nav>

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{continent}</p>
              <h2 id="world-countries-subregions-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregions</h2>
            </div>
            <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">
              Edit order
            </button>
          </div>

          <ProgressSummary label="Continent Prepare progress" progress={progress} />

          <nav aria-label={`${continent} Subregions`}>
            <ol className="space-y-1.5">
              {subregions.map((subregion, index) => (
                <PrepareHierarchyRailRow
                  key={subregion.id}
                  label={subregion.label}
                  groupId={getSubregionHoverGroupId(subregion.label)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectSubregion(subregion.id)}
                  onHoverGroup={onHoverGroup}
                  sequenceNumber={index + 1}
                  trailing={getWorldCountriesMemoReadinessLabel(getSubregionMemoReadinessProgress(subregion.id, learningStates, activeCountries).readiness)}
                />
              ))}
            </ol>
          </nav>
        </section>
      ),
      right: <NextToPreparePanel nextSubregion={nextSubregion} onSelectSubregion={onSelectSubregion} />,
      leftLabel: 'Subregions',
      rightLabel: 'Prepare next',
    },
    [continent, activeCountries, learningStates, subregions, nextSubregion, progress, hoveredGroupId, onWorld, onSelectSubregion, onHoverGroup, onEditOrder],
  )

  return null
}

export interface PrepareSubregionRailsProps {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  learned: boolean
  capitalsLearned: boolean
  nextSubregion: SubregionDefinition | null
  mnemonicVersion: number
  onWorld: () => void
  onContinent: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onEditOrder: () => void
  onMnemonicChanged: () => void
}

export function PrepareSubregionRails({
  continent,
  subregion,
  entries,
  learned,
  capitalsLearned,
  nextSubregion,
  mnemonicVersion,
  onWorld,
  onContinent,
  onSelectSubregion,
  onEditOrder,
  onMnemonicChanged,
}: PrepareSubregionRailsProps) {
  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-prepare-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <button type="button" onClick={onContinent} className="text-zinc-500 hover:text-zinc-200">{continent}</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{getSubregionDefinition(subregion).label}</span>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Prepare</p>
            <h2 id="world-countries-prepare-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregion structure</h2>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Learning status</p>
            <div className="mt-1 space-y-1 text-sm font-semibold">
              <p className="text-violet-300">Memo readiness: {getWorldCountriesMemoReadinessLabel(deriveWorldCountriesMemoReadinessFromTracks(learned, capitalsLearned))}</p>
              <p className={learned ? 'text-green-300' : 'text-zinc-300'}>{learned ? 'Countries learned ✓' : 'Countries not learned'}</p>
              <p className={capitalsLearned ? 'text-green-300' : 'text-zinc-300'}>{capitalsLearned ? 'Capitals learned ✓' : 'Capitals not learned'}</p>
            </div>
          </div>

          <section aria-labelledby="prepare-learning-order-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="prepare-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Edit order</button>
            </div>
            <ol className="mt-3 space-y-1.5 text-sm text-zinc-300">
              {entries.map((entry, index) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{index + 1}.</span>
                  <span className="min-w-0 break-words">{entry.country}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>
      ),
      right: (
        <div className="w-full space-y-3">
          <NextToPreparePanel nextSubregion={nextSubregion} onSelectSubregion={onSelectSubregion} />
          <PrepareMnemonicEditor
            targetId={subregionMnemonicId(subregion)}
            title="Subregion memory aid"
            subtitle={`Optional story or picture for this ordered ${entries.length}-country group`}
            countryIds={entries.map(entry => entry.id)}
            refreshKey={mnemonicVersion}
            onChanged={onMnemonicChanged}
          />
        </div>
      ),
      leftLabel: 'Prepare context',
      rightLabel: 'Prepare tools',
    },
    [continent, subregion, entries, learned, capitalsLearned, nextSubregion, mnemonicVersion, onWorld, onContinent, onSelectSubregion, onEditOrder, onMnemonicChanged],
  )

  return null
}

function PrepareHierarchyRailRow({
  label,
  onClick,
  groupId,
  hoveredGroupId,
  onHoverGroup,
  sequenceNumber,
  trailing,
}: {
  label: string
  onClick: () => void
  groupId: string
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  sequenceNumber?: number
  trailing?: ReactNode
}) {
  const hovered = hoveredGroupId === groupId
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHoverGroup(groupId)}
        onMouseLeave={() => onHoverGroup(null)}
        onFocus={() => onHoverGroup(groupId)}
        onBlur={() => onHoverGroup(null)}
        className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${hovered ? 'border-cyan-500 bg-cyan-950/60 text-zinc-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}
      >
        {sequenceNumber !== undefined && <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{sequenceNumber}.</span>}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing !== undefined && <span className="shrink-0 text-xs tabular-nums text-zinc-500">{trailing}</span>}
      </button>
    </li>
  )
}

function NextToPreparePanel({
  nextSubregion,
  onSelectSubregion,
}: {
  nextSubregion: SubregionDefinition | null
  onSelectSubregion: (subregion: SubregionId) => void
}) {
  const hasNext = nextSubregion !== null
  return (
    <section aria-labelledby="world-countries-next-to-prepare-heading" aria-disabled={!hasNext} className={`rounded-xl border bg-zinc-900 p-4 ${hasNext ? 'border-zinc-800' : 'border-zinc-800 opacity-70'}`}>
      <h3 id="world-countries-next-to-prepare-heading" className="text-sm font-semibold text-zinc-200">Prepare next</h3>
      <div className={`mt-3 rounded-lg border px-3 py-2.5 ${hasNext ? 'border-cyan-500/40 bg-cyan-600/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{hasNext ? 'Unprepared subregion' : 'Complete'}</p>
        <p className={`mt-1 text-sm font-semibold ${hasNext ? 'text-cyan-300' : 'text-zinc-500'}`}>{nextSubregion?.label ?? 'All subregions prepared'}</p>
      </div>
      <button type="button" onClick={() => { if (nextSubregion) onSelectSubregion(nextSubregion.id) }} disabled={!hasNext} className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
        {hasNext ? 'Open subregion →' : 'All subregions prepared'}
      </button>
    </section>
  )
}

function ProgressSummary({ label, progress }: { label: string; progress: MemoReadinessProgress }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3" aria-label={label}>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-3 space-y-3">
        <MemoMilestone label="Countries prepared" milestone={progress.countriesMemoed} color="bg-violet-500" />
        <MemoMilestone label="Countries + Capitals prepared" milestone={progress.countriesAndCapitalsMemoed} color="bg-fuchsia-500" />
      </div>
    </div>
  )
}

function MemoMilestone({ label, milestone, color }: { label: string; milestone: MemoMilestone; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-zinc-200">{milestone.count}/{milestone.total} Subregions</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${milestone.ratio * 100}%` }} /></div>
    </div>
  )
}

function formatContinentProgress(progress: MemoReadinessProgress): string {
  return `${progress.countriesMemoed.count}/${progress.countriesMemoed.total} Subregions`
}
