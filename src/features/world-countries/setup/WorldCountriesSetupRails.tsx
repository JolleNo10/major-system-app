import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import {
  getContinentLearningReadinessProgress,
  getSubregionLearningReadinessProgress,
  type LearningStates,
  type LearningReadinessProgress,
} from '@/features/world-countries/learning/learningProgress'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { GeographyHierarchyRow } from '@/features/world-countries/ui/GeographyHierarchyRow'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { SetupMnemonicEditor } from './SetupMnemonicEditor'

interface WorldSetupOverviewRailsProps {
  continents: readonly Continent[]
  activeCountries?: readonly Country[]
  learningStates: LearningStates
  hoveredGroupId: string | null
  onSelectContinent: (continent: Continent) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
  onBackToDrill?: () => void
}

export function WorldSetupOverviewRails({
  continents,
  activeCountries = countries,
  learningStates,
  hoveredGroupId,
  onSelectContinent,
  onHoverGroup,
  onEditOrder,
  onBackToDrill,
}: WorldSetupOverviewRailsProps) {
  useRails(
    {
      left: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-continents-rail-heading">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
              <h2 id="world-countries-continents-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography</h2>
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
                  trailing={formatContinentProgress(getContinentLearningReadinessProgress(continent, learningStates, activeCountries))}
                  sequenceNumber={index + 1}
                />
              ))}
            </ul>
          </nav>
          <p className="text-xs text-zinc-500">Learning Readiness</p>
        </WorldCountriesPanel>
      ),
      right: <BackToDrillPanel onBackToDrill={onBackToDrill} />,
      leftLabel: 'Geography',
      rightLabel: 'Setup',
    },
    [continents, activeCountries, learningStates, hoveredGroupId, onSelectContinent, onHoverGroup, onEditOrder, onBackToDrill],
  )
  return null
}

interface ContinentSetupOverviewRailsProps {
  continent: Continent
  subregions: readonly SubregionDefinition[]
  activeCountries?: readonly Country[]
  learningStates: LearningStates
  hoveredGroupId: string | null
  onWorld: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onHoverGroup: (groupId: string | null) => void
  onEditOrder: () => void
  onBackToDrill?: () => void
}

export function ContinentSetupOverviewRails({
  continent,
  subregions,
  activeCountries = countries,
  learningStates,
  hoveredGroupId,
  onWorld,
  onSelectSubregion,
  onHoverGroup,
  onEditOrder,
  onBackToDrill,
}: ContinentSetupOverviewRailsProps) {
  useRails(
    {
      left: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-subregions-rail-heading">
          <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: continent, current: true }]} />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{continent}</p>
                <h2 id="world-countries-subregions-rail-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography scope</h2>
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
          <p className="text-xs text-zinc-500">Learning Readiness is contextual information; Setup does not start learning.</p>
        </WorldCountriesPanel>
      ),
      right: <BackToDrillPanel onBackToDrill={onBackToDrill} />,
      leftLabel: 'Geography',
      rightLabel: 'Setup',
    },
    [continent, activeCountries, learningStates, subregions, hoveredGroupId, onWorld, onSelectSubregion, onHoverGroup, onEditOrder, onBackToDrill],
  )
  return null
}

export interface SetupSubregionRailsProps {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  mnemonicVersion: number
  onWorld: () => void
  onContinent: () => void
  onSelectSubregion: (subregion: SubregionId) => void
  onEditOrder: () => void
  onMnemonicChanged: () => void
  onBackToDrill?: () => void
}

export function SetupSubregionRails({
  continent,
  subregion,
  entries,
  mnemonicVersion,
  onWorld,
  onContinent,
  onSelectSubregion: _onSelectSubregion,
  onEditOrder,
  onMnemonicChanged,
  onBackToDrill,
}: SetupSubregionRailsProps) {
  useRails(
    {
      left: (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-setup-context-heading">
          <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: continent, onSelect: onContinent }, { label: getSubregionDefinition(subregion).label, current: true }]} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Setup</p>
            <h2 id="world-countries-setup-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Subregion structure</h2>
          </div>
          <section aria-labelledby="setup-learning-order-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="setup-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              <button type="button" onClick={onEditOrder} className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Edit order</button>
            </div>
            <ol className="mt-3 space-y-1.5 text-sm text-zinc-300">
              {entries.map((entry, index) => (
                <li key={entry.id} className="flex gap-2"><span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{index + 1}.</span><span className="min-w-0 break-words">{entry.country}</span></li>
              ))}
            </ol>
          </section>
        </WorldCountriesPanel>
      ),
      right: (
        <div className="w-full space-y-3">
          <SetupMnemonicEditor
            targetId={subregionMnemonicId(subregion)}
            title="Subregion memory aid"
            subtitle={`Optional story or picture for this ordered ${entries.length}-country group`}
            countryIds={entries.map(entry => entry.id)}
            refreshKey={mnemonicVersion}
            onChanged={onMnemonicChanged}
          />
          <BackToDrillPanel onBackToDrill={onBackToDrill} />
        </div>
      ),
      leftLabel: 'Setup context',
      rightLabel: 'Setup tools',
    },
    [continent, subregion, entries, mnemonicVersion, onWorld, onContinent, onEditOrder, onMnemonicChanged, onBackToDrill],
  )
  return null
}

function BackToDrillPanel({ onBackToDrill }: { onBackToDrill?: () => void }) {
  if (!onBackToDrill) return null
  return (
    <WorldCountriesPanel className="space-y-3" aria-labelledby="world-countries-setup-actions-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Setup</p>
        <h2 id="world-countries-setup-actions-heading" className="mt-1 text-lg font-bold text-zinc-100">Structure and memory aids</h2>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">Configure geography, order, and mnemonic content without starting a learning activity.</p>
      <button type="button" onClick={onBackToDrill} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Back to Drill</button>
    </WorldCountriesPanel>
  )
}

function formatContinentProgress(progress: LearningReadinessProgress): string {
  return `${progress.countriesLearned.count}/${progress.countriesLearned.total} Subregions learned`
}
