import { useRails } from '@/app/layout/PageLayoutContext'
import type { ReactNode } from 'react'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentMemoProgress, getSubregionMemoProgress } from './memoProgress'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import type { MemoProgress } from './memoProgress'
import type { CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import { MemoMnemonicCard } from './MemoMnemonicCard'

interface WorldOverviewRailsProps {
  continents: readonly Continent[]
  memoedCountryIds: ReadonlySet<string>
  progress: MemoProgress
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
}

export function WorldOverviewRails({
  continents,
  memoedCountryIds,
  progress,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
}: WorldOverviewRailsProps) {
  useRails(
    {
      left: (
        <section className="space-y-4" aria-labelledby="world-countries-continents-rail-heading">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
            <h2 id="world-countries-continents-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Continents</h2>
          </div>

          <ProgressSummary label="World progress" progress={progress} />

          <nav aria-label="Continents">
            <ul className="space-y-1.5">
              {continents.map(continent => (
                <MemoHierarchyRailRow
                  key={continent}
                  label={continent}
                  groupId={getContinentHoverGroupId(continent)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectContinent(continent)}
                  onHoverGroup={onHoverGroup}
                  trailing={memoedCountForContinent(continent, memoedCountryIds)}
                />
              ))}
            </ul>
          </nav>
        </section>
      ),
      leftLabel: 'Continents',
    },
    [continents, memoedCountryIds, progress.memoedCount, progress.totalCount, progress.ratio, hoveredGroupId, onSelectContinent, onHoverGroup],
  )

  return null
}

interface ContinentOverviewRailsProps {
  continent: Continent
  subregions: readonly SubregionDefinition[]
  memoedCountryIds: ReadonlySet<string>
  progress: MemoProgress
  hoveredGroupId: string | null
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
}

export function ContinentOverviewRails({
  continent,
  subregions,
  memoedCountryIds,
  progress,
  hoveredGroupId,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onEditOrder,
}: ContinentOverviewRailsProps) {
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

          <ProgressSummary label="Continent progress" progress={progress} />

          <nav aria-label={`${continent} Subregions`}>
            <ol className="space-y-1.5">
              {subregions.map((subregion, index) => (
                <MemoHierarchyRailRow
                  key={subregion.id}
                  label={subregion.label}
                  groupId={getSubregionHoverGroupId(subregion.label)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectSubregion(subregion.id)}
                  onHoverGroup={onHoverGroup}
                  sequenceNumber={index + 1}
                  trailing={memoedCountForSubregion(continent, subregion.id, memoedCountryIds)}
                />
              ))}
            </ol>
          </nav>
        </section>
      ),
      leftLabel: 'Subregions',
    },
    [continent, subregions, memoedCountryIds, progress.memoedCount, progress.totalCount, progress.ratio, hoveredGroupId, onWorld, onSelectSubregion, onHoverGroup, onEditOrder],
  )

  return null
}

interface MemoHierarchyRailRowProps {
  label: string
  onClick: () => void
  groupId: string
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  sequenceNumber?: number
  trailing?: ReactNode
}

function MemoHierarchyRailRow({
  label,
  onClick,
  groupId,
  hoveredGroupId,
  onHoverGroup,
  sequenceNumber,
  trailing,
}: MemoHierarchyRailRowProps) {
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
        className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          hovered
            ? 'border-cyan-500 bg-cyan-950/60 text-zinc-100'
            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'
        }`}
      >
        {sequenceNumber !== undefined && (
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{sequenceNumber}.</span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing !== undefined && (
          <span className="shrink-0 text-xs tabular-nums text-zinc-500">{trailing}</span>
        )}
      </button>
    </li>
  )
}

interface SubregionRailNavigation {
  continent: Continent
  subregion: SubregionId
  onWorld: () => void
  onContinent: () => void
}

interface SubregionRailContent {
  entries: readonly Country[]
  learned: boolean
  mnemonicVersion: number
  onMnemonicChanged: () => void
}

interface SubregionOverviewRailsProps {
  phase: 'overview' | CountryLearningPhase
  navigation: SubregionRailNavigation
  content: SubregionRailContent
  onEditOrder: () => void
}

export function SubregionOverviewRails({
  phase,
  navigation,
  content,
  onEditOrder,
}: SubregionOverviewRailsProps) {
  const { continent, subregion, onWorld, onContinent } = navigation
  const { entries, learned, mnemonicVersion, onMnemonicChanged } = content
  const visible = phase !== 'ordered-recall' && phase !== 'complete'

  useRails(
    {
      left: visible ? (
        <section className="space-y-4" aria-labelledby="world-countries-learning-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <button type="button" onClick={onWorld} className="text-zinc-500 hover:text-zinc-200">World</button>
            <span className="text-zinc-700">/</span>
            <button type="button" onClick={onContinent} className="text-zinc-500 hover:text-zinc-200">{continent}</button>
            <span className="text-zinc-700">/</span>
            <span className="text-cyan-300">{getSubregionDefinition(subregion).label}</span>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Subregion</p>
            <h2 id="world-countries-learning-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Learning context</h2>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Learning status</p>
            <p className={`mt-1 text-sm font-semibold ${learned ? 'text-green-300' : 'text-zinc-300'}`}>
              {learned ? 'Countries learned ✓' : 'Countries not learned'}
            </p>
          </div>

          <section aria-labelledby="learning-order-rail-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="learning-order-rail-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              {phase === 'overview' && (
                <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">
                  Edit order
                </button>
              )}
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
      ) : undefined,
      right: visible ? (
        <MemoMnemonicCard
          targetId={subregionMnemonicId(subregion)}
          title="Subregion memory aid"
          subtitle={`Optional story or picture for this ordered ${entries.length}-country group`}
          countryIds={entries.map(entry => entry.id)}
          refreshKey={mnemonicVersion}
          onChanged={onMnemonicChanged}
        />
      ) : undefined,
      leftLabel: 'Learning context',
      rightLabel: 'Memory aid',
    },
    [visible, continent, subregion, entries, learned, mnemonicVersion, onWorld, onContinent, onEditOrder, onMnemonicChanged],
  )

  return null
}

function ProgressSummary({ label, progress }: { label: string; progress: MemoProgress }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-green-300">{progress.memoedCount}/{progress.totalCount}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress.ratio * 100}%` }} />
      </div>
    </div>
  )
}

function memoedCountForContinent(continent: Continent, memoedCountryIds: ReadonlySet<string>): string {
  return formatProgress(getContinentMemoProgress(continent, memoedCountryIds))
}

function memoedCountForSubregion(continent: Continent, subregion: SubregionId, memoedCountryIds: ReadonlySet<string>): string {
  return formatProgress(getSubregionMemoProgress(continent, subregion, memoedCountryIds))
}

function formatProgress(progress: MemoProgress): string {
  return `${progress.memoedCount}/${progress.totalCount}`
}
