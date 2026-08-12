import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getContinentMemoReadinessProgress,
  getNextSubregionToMemo,
  getSubregionMemoReadinessProgress,
  type MemoLearningStates,
  type MemoReadinessProgress,
} from '@/features/world-countries/learning/memoProgress'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { GeographyHierarchyRow } from '@/features/world-countries/ui/GeographyHierarchyRow'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { PrepareMnemonicEditor } from './PrepareMnemonicEditor'

interface WorldOverviewRailsProps {
  continents: readonly Continent[]
  activeCountries?: readonly Country[]
  learningStates: MemoLearningStates
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
}

export function WorldOverviewRails({
  continents,
  activeCountries = countries,
  learningStates,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
  onEditOrder,
}: WorldOverviewRailsProps) {
  useRails(
    {
      left: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-continents-rail-heading">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
              <h2 id="world-countries-continents-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Continents</h2>
            </div>
            <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
              Edit order
            </button>
          </div>

          <nav aria-label="Continents">
            <ul className="space-y-1.5">
              {continents.map((continent, index) => (
                <GeographyHierarchyRow
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
        </WorldCountriesPanel>
      ),
      leftLabel: 'Continents',
    },
    [continents, activeCountries, learningStates, hoveredGroupId, onSelectContinent, onHoverGroup, onEditOrder],
  )

  return null
}

interface ContinentOverviewRailsProps {
  continent: Continent
  subregions: readonly SubregionDefinition[]
  activeCountries?: readonly Country[]
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
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-subregions-rail-heading">
          <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: continent, current: true }]} />

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{continent}</p>
              <h2 id="world-countries-subregions-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregions</h2>
            </div>
            <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
              Edit order
            </button>
          </div>

          <nav aria-label={`${continent} Subregions`}>
            <ol className="space-y-1.5">
              {subregions.map((subregion, index) => (
                <GeographyHierarchyRow
                  key={subregion.id}
                  label={subregion.label}
                  groupId={getSubregionHoverGroupId(subregion.label)}
                  hoveredGroupId={hoveredGroupId}
                  onClick={() => onSelectSubregion(subregion.id)}
                  onHoverGroup={onHoverGroup}
                  sequenceNumber={index + 1}
                />
              ))}
            </ol>
          </nav>
        </WorldCountriesPanel>
      ),
      right: <NextToPreparePanel nextSubregion={nextSubregion} onSelectSubregion={onSelectSubregion} />,
      leftLabel: 'Subregions',
      rightLabel: 'Prepare next',
    },
    [continent, activeCountries, learningStates, subregions, nextSubregion, hoveredGroupId, onWorld, onSelectSubregion, onHoverGroup, onEditOrder],
  )

  return null
}

export interface PrepareSubregionRailsProps {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  nextSubregion: SubregionDefinition | null
  nextEmptyLabel?: string
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
  nextSubregion,
  nextEmptyLabel,
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
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-prepare-context-heading">
          <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: continent, onSelect: onContinent }, { label: getSubregionDefinition(subregion).label, current: true }]} />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Prepare</p>
            <h2 id="world-countries-prepare-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregion structure</h2>
          </div>

          <section aria-labelledby="prepare-learning-order-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="prepare-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Edit order</button>
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
        </WorldCountriesPanel>
      ),
      right: (
        <div className="w-full space-y-3">
          <NextToPreparePanel nextSubregion={nextSubregion} emptyLabel={nextEmptyLabel} onSelectSubregion={onSelectSubregion} />
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
    [continent, subregion, entries, nextSubregion, nextEmptyLabel, mnemonicVersion, onWorld, onContinent, onSelectSubregion, onEditOrder, onMnemonicChanged],
  )

  return null
}

function NextToPreparePanel({
  nextSubregion,
  emptyLabel = 'All subregions prepared',
  onSelectSubregion,
}: {
  nextSubregion: SubregionDefinition | null
  emptyLabel?: string
  onSelectSubregion: (subregion: SubregionId) => void
}) {
  const hasNext = nextSubregion !== null
  return (
    <WorldCountriesPanel aria-labelledby="world-countries-next-to-prepare-heading" aria-disabled={!hasNext} className={!hasNext ? 'opacity-70' : undefined}>
      <h3 id="world-countries-next-to-prepare-heading" className="text-sm font-semibold text-zinc-200">Prepare next</h3>
      <div className={`mt-3 rounded-lg border px-3 py-2.5 ${hasNext ? 'border-cyan-500/40 bg-cyan-600/10' : 'border-zinc-800 bg-zinc-800/40'}`}>
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{hasNext ? 'Unprepared subregion' : 'Complete'}</p>
        <p className={`mt-1 text-sm font-semibold ${hasNext ? 'text-cyan-300' : 'text-zinc-500'}`}>{nextSubregion?.label ?? emptyLabel}</p>
      </div>
      <button type="button" onClick={() => { if (nextSubregion) onSelectSubregion(nextSubregion.id) }} disabled={!hasNext} className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
        {hasNext ? 'Open subregion →' : emptyLabel}
      </button>
    </WorldCountriesPanel>
  )
}

function formatContinentProgress(progress: MemoReadinessProgress): string {
  return `${progress.countriesMemoed.count}/${progress.countriesMemoed.total} Subregions`
}
