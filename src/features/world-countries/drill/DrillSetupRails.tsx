import { useId, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getContinentsInEffectiveOrder, getCountriesForContinent, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { getWorldMetadata } from '@/features/world-countries/geography/worldMetadataStore'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { GeographyHierarchyRow } from '@/features/world-countries/ui/GeographyHierarchyRow'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { isEntireContinentSelection, type WorldCountriesDrillSelection } from './drillSelection'
import {
  WORLD_COUNTRIES_DRILL_MODES,
  type WorldCountriesDrillMode,
} from './drillModes'
import type { WorldCountriesDrillOrder } from './drillOrder'

type PracticeMode = 'learn-countries' | 'countries' | 'capitals'
type DrillPracticeMode = Exclude<PracticeMode, 'learn-countries'>

const PRACTICE_MODE_CANDIDATES: readonly ModeOptionCandidate<PracticeMode>[] = [
  { id: 'learn-countries', label: 'Learn Countries', description: 'Build Country location memory with guided practice.' },
  { id: 'countries', label: 'Locate Countries', description: 'Click the target Country on the map.' },
  { id: 'capitals', label: 'Capitals', description: 'Practise capitals before Countries + Capitals.' },
]

export function DrillSetupRails({
  level,
  selection,
  mode,
  order,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleSubregion,
  onSelectEntireContinent,
  onModeChange,
  onPracticeStart = () => undefined,
  onOrderChange,
  onStart,
  onLearnCountries = () => undefined,
  entries = countries,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onPracticeStart?: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onLearnCountries?: () => void
  entries?: readonly Country[]
}) {
  const subregions = getSubregionsForContinentInEffectiveOrder(
    selection.continent,
    entries,
    getContinentMetadata(selection.continent),
  )
  const entireContinent = isEntireContinentSelection(selection, entries)
  const selectedCount = selection.subregionIds.length
  const modeGroupName = `world-countries-drill-mode-${useId()}`
  const [practiceMode, setPracticeMode] = useState<PracticeMode | null>(null)

  useRails(
    {
      left: (
        <section className="space-y-4">
          {level === 'world' ? (
            <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-drill-geography-heading">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
                <h3 id="world-countries-drill-geography-heading" className="mt-1 text-lg font-bold text-zinc-100">Geography</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">Choose a Continent to enter its map-centered Drill setup.</p>
              <nav aria-label="Continents">
                <ul className="space-y-1.5">
                  {getContinentsInEffectiveOrder(entries, getWorldMetadata()).map(continent => (
                    <GeographyHierarchyRow
                      key={continent}
                      label={continent}
                      secondary={formatContinentSummary(continent, entries)}
                      groupId={getContinentHoverGroupId(continent)}
                      hoveredGroupId={hoveredGroupId}
                      onClick={() => onSelectContinent(continent)}
                      onHoverGroup={onHoverGroup}
                    />
                  ))}
                </ul>
              </nav>
            </WorldCountriesPanel>
          ) : (
            <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-drill-scope-heading">
              <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: selection.continent, current: true }]} />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{selection.continent}</p>
                <h3 id="world-countries-drill-scope-heading" className="mt-1 text-lg font-bold text-zinc-100">Drill scope</h3>
                <p className="mt-1 text-sm text-zinc-400">Select Subregions from the rail or map.</p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-zinc-500">Scope</span>
                  <span className="text-right font-semibold text-zinc-200">
                    {selectedCount} {selectedCount === 1 ? 'Subregion' : 'Subregions'} selected
                  </span>
                </div>
                <button
                  type="button"
                  aria-pressed={entireContinent}
                  onClick={onSelectEntireContinent}
                  className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${entireContinent
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}
                  `}
                >
                  <span className="block font-semibold">Entire Continent</span>
                  <span className="mt-1 block text-xs text-zinc-500">All currently defined Subregions</span>
                </button>
              </div>

              <nav aria-label={`${selection.continent} Subregions`}>
                <ul className="space-y-1.5">
                  {subregions.map(subregion => {
                    const selected = selection.subregionIds.includes(subregion.id)
                    return (
                      <GeographyHierarchyRow
                        key={subregion.id}
                        label={subregion.label}
                        groupId={getSubregionHoverGroupId(subregion.label)}
                        hoveredGroupId={hoveredGroupId}
                        onClick={() => onToggleSubregion(subregion.id)}
                        onHoverGroup={onHoverGroup}
                        selected={selected}
                      />
                    )
                  })}
                </ul>
              </nav>
              {selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>}
            </WorldCountriesPanel>
          )}
        </section>
      ),
      right: (
        <DrillSetupActionRail
          mode={mode}
          groupName={modeGroupName}
          onModeChange={onModeChange}
          practiceMode={practiceMode}
          onPracticeModeChange={setPracticeMode}
          onPracticeStart={onPracticeStart}
          order={order}
          onOrderChange={onOrderChange}
          level={level}
          selection={selection}
          onStart={onStart}
          onLearnCountries={onLearnCountries}
        />
      ),
      leftLabel: 'Drill scope',
      rightLabel: 'Drill',
    },
    [entries, level, mode, modeGroupName, onLearnCountries, onPracticeStart, order, practiceMode, selection.continent, selection.subregionIds, hoveredGroupId, onHoverGroup, onWorld, onSelectContinent, onToggleSubregion, onSelectEntireContinent, onModeChange, onOrderChange, onStart],
  )

  return null
}

function DrillModeRail({
  mode,
  onModeChange,
  groupName,
}: {
  mode: WorldCountriesDrillMode
  onModeChange: (mode: WorldCountriesDrillMode) => void
  groupName: string
}) {
  const modeGroupId = useId()
  const drillHeadingId = `${modeGroupId}-drill-heading`

  return (
    <fieldset className="space-y-3" aria-labelledby={drillHeadingId}>
      <div className="space-y-2" role="group" aria-labelledby={drillHeadingId}>
        <h3 id={drillHeadingId} className="sr-only">Drill</h3>
        <div className="space-y-2">
          {WORLD_COUNTRIES_DRILL_MODES
            .filter(candidate => candidate.id !== 'capitals')
            .map(candidate => (
              <DrillModeOption
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === mode}
                onSelect={onModeChange}
                groupName={groupName}
              />
            ))}
        </div>
      </div>
    </fieldset>
  )
}

function DrillPracticePanel({
  mode,
  onModeChange,
  canStart,
  onStart,
  onLearnCountries,
}: {
  mode: PracticeMode | null
  onModeChange: (mode: PracticeMode) => void
  canStart: boolean
  onStart: (mode: DrillPracticeMode) => void
  onLearnCountries: () => void
}) {
  const practiceHeadingId = useId()
  const groupName = `world-countries-practice-mode-${useId()}`

  return (
    <WorldCountriesPanel className="space-y-3" aria-labelledby={practiceHeadingId}>
      <h2 id={practiceHeadingId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learn and Practise</h2>
      {PRACTICE_MODE_CANDIDATES.map(candidate => (
        <DrillModeOption
          key={candidate.id}
          candidate={candidate}
          selected={candidate.id === mode}
          onSelect={onModeChange}
          groupName={groupName}
        />
      ))}
      <button
        type="button"
        disabled={!canStart || mode === null}
        onClick={() => {
          if (mode === 'learn-countries') onLearnCountries()
          else if (mode) onStart(mode)
        }}
        className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start practise
      </button>
    </WorldCountriesPanel>
  )
}

function DrillSetupActionRail({
  level,
  selection,
  mode,
  groupName,
  onModeChange,
  practiceMode,
  onPracticeModeChange,
  onPracticeStart,
  onLearnCountries,
  order,
  onOrderChange,
  onStart,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  groupName: string
  onModeChange: (mode: WorldCountriesDrillMode) => void
  practiceMode: PracticeMode | null
  onPracticeModeChange: (mode: PracticeMode) => void
  onPracticeStart: (mode: WorldCountriesDrillMode) => void
  onLearnCountries: () => void
  order: WorldCountriesDrillOrder
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
}) {
  return (
    <section className="space-y-4">
      <CurrentDrillPanel
        level={level}
        selection={selection}
        mode={mode}
        groupName={groupName}
        onModeChange={onModeChange}
        order={order}
        onOrderChange={onOrderChange}
        onStart={onStart}
      />

      <DrillPracticePanel
        mode={practiceMode}
        onModeChange={onPracticeModeChange}
        canStart={level === 'continent'
          && selection.subregionIds.length > 0
          && (practiceMode !== 'learn-countries' || selection.subregionIds.length === 1)}
        onStart={onPracticeStart}
        onLearnCountries={onLearnCountries}
      />
    </section>
  )
}

function CurrentDrillPanel({
  level,
  selection,
  mode,
  groupName,
  onModeChange,
  order,
  onOrderChange,
  onStart,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  groupName: string
  onModeChange: (mode: WorldCountriesDrillMode) => void
  order: WorldCountriesDrillOrder
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
}) {
  return (
    <WorldCountriesPanel aria-labelledby="world-countries-current-drill-heading">
      <h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill</h2>
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <DrillModeRail mode={mode} onModeChange={onModeChange} groupName={groupName} />
      </div>
      <div className="mt-4">
        <DrillOrderPanel order={order} onOrderChange={onOrderChange} />
      </div>
      <button
        type="button"
        disabled={level !== 'continent' || selection.subregionIds.length === 0}
        onClick={onStart}
        className="mt-3 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {level === 'world' ? 'Choose a Continent first' : 'Start Drill'}
      </button>
    </WorldCountriesPanel>
  )
}

function DrillOrderPanel({ order, onOrderChange }: { order: WorldCountriesDrillOrder; onOrderChange: (order: WorldCountriesDrillOrder) => void }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-3" aria-labelledby="world-countries-drill-order-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="world-countries-drill-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill order</h2>
        <DrillOrderSelector order={order} onSelect={onOrderChange} />
      </div>
    </section>
  )
}

function DrillOrderSelector({ order, onSelect }: { order: WorldCountriesDrillOrder; onSelect: (order: WorldCountriesDrillOrder) => void }) {
  return (
    <div className="inline-flex h-7 shrink-0 rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-labelledby="world-countries-drill-order-heading">
      <DrillOrderOption order="ordered" selected={order === 'ordered'} onSelect={onSelect}>In order</DrillOrderOption>
      <DrillOrderOption order="random" selected={order === 'random'} onSelect={onSelect}>Random</DrillOrderOption>
    </div>
  )
}

function DrillOrderOption({ order, selected, onSelect, children }: { order: WorldCountriesDrillOrder; selected: boolean; onSelect: (order: WorldCountriesDrillOrder) => void; children: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(order)}
      className={`min-w-[4.25rem] rounded px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${selected ? 'bg-cyan-600/40 text-cyan-100 shadow-sm' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}
    >
      {children}
    </button>
  )
}

type ModeOptionCandidate<Mode extends string> = {
  id: Mode
  label: string
  description: string
}

function DrillModeOption<Mode extends string>({ candidate, selected, onSelect, groupName }: { candidate: ModeOptionCandidate<Mode>; selected: boolean; onSelect: (mode: Mode) => void; groupName: string }) {
  const descriptionId = `${useId()}-description`

  return (
    <label className={`flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}>
      <input type="radio" name={groupName} value={candidate.id} checked={selected} onChange={() => onSelect(candidate.id)} aria-describedby={descriptionId} className="sr-only" />
      {selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}
      <span className="min-w-0 flex-1 font-semibold">{candidate.label}</span>
      <span className="group relative shrink-0">
        <span tabIndex={0} aria-label={`Explain ${candidate.label} mode`} aria-describedby={descriptionId} title={candidate.description} className="flex h-5 w-5 cursor-help items-center justify-center rounded-full text-sm text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
          <span aria-hidden="true">ⓘ</span>
        </span>
        <span id={descriptionId} role="tooltip" className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          {candidate.description}
        </span>
      </span>
    </label>
  )
}

function formatContinentSummary(continent: Continent, entries: readonly Country[]): string {
  const subregionCount = getSubregionsForContinentInEffectiveOrder(continent, entries, getContinentMetadata(continent)).length
  const countryCount = getCountriesForContinent(continent, entries).length
  return `${formatCount(subregionCount, 'Subregion', 'Subregions')} · ${formatCount(countryCount, 'Country', 'Countries')}`
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
