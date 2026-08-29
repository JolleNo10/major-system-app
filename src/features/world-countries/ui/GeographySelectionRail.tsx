import type { ReactNode } from 'react'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import {
  getContinentScopeState,
  getContinentSubregionScopeCounts,
  getSubregionScopeCounts,
  type WorldCountriesSubregionScope,
  type WorldCountriesSubregionScopeMetadata,
} from '@/features/world-countries/geography/subregionScope'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { GeographyBreadcrumbs } from './GeographyBreadcrumbs'
import { GeographyHierarchyRow } from './GeographyHierarchyRow'
import { WorldCountriesPanel } from './WorldCountriesPanel'

export interface GeographySelectionRailProps {
  level: 'world' | 'continent'
  setupContinent: Continent | null
  selection: WorldCountriesSubregionScope
  selectionMetadata: WorldCountriesSubregionScopeMetadata
  worldOrder: readonly Continent[]
  subregionOrder: readonly SubregionDefinition[]
  entries?: readonly Country[]
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleContinent: (continent: Continent) => void
  onSelectAllWorld: () => void
  onClearWorld: () => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  headingId?: string
  showEmptyScopeGuidance?: boolean
  worldHeaderAction?: ReactNode
  continentHeaderAction?: ReactNode
  worldOrderContent?: ReactNode
  continentOrderContent?: ReactNode
}

/** Shared World/Continent selection presentation used by setup workflows. */
export function GeographySelectionRail({
  level,
  setupContinent,
  selection,
  selectionMetadata,
  worldOrder,
  subregionOrder,
  entries = countries,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleContinent,
  onSelectAllWorld,
  onClearWorld,
  onToggleSubregion,
  onSelectEntireContinent,
  headingId = 'world-countries-geography-heading',
  showEmptyScopeGuidance = true,
  worldHeaderAction,
  continentHeaderAction,
  worldOrderContent,
  continentOrderContent,
}: GeographySelectionRailProps) {
  const continent = setupContinent
  const worldCounts = getSubregionScopeCounts(selection, entries, selectionMetadata)
  const continentCounts = continent
    ? getContinentSubregionScopeCounts(selection, continent, entries, selectionMetadata)
    : null
  const continentState = continent
    ? getContinentScopeState(selection, continent, entries, selectionMetadata)
    : 'none'

  if (level === 'world') {
    return (
      <WorldCountriesPanel className="space-y-4" aria-labelledby={headingId}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 id={headingId} className="text-lg font-bold text-zinc-100">Geography</h3>
            {worldHeaderAction}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-zinc-400">Select Subregions across the World, or open a Continent to inspect its map.</p>
        <nav aria-label="Continents">
          {worldOrderContent !== undefined ? worldOrderContent : (
            <ol className="space-y-1.5">
              {worldOrder.map((candidate, index) => (
                <WorldContinentRow
                  key={candidate}
                  continent={candidate}
                  sequenceNumber={index + 1}
                  selectedState={getContinentScopeState(selection, candidate, entries, selectionMetadata)}
                  secondary={formatContinentSummary(candidate, selection, entries, selectionMetadata)}
                  hoveredGroupId={hoveredGroupId}
                  onHoverGroup={onHoverGroup}
                  onToggle={() => onToggleContinent(candidate)}
                  onOpen={() => onSelectContinent(candidate)}
                />
              ))}
            </ol>
          )}
        </nav>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p aria-label="World selection summary" className="text-sm font-semibold text-zinc-200">{worldCounts.continents} {worldCounts.continents === 1 ? 'Continent' : 'Continents'} · {worldCounts.subregions} {worldCounts.subregions === 1 ? 'Subregion' : 'Subregions'} · {worldCounts.countries} {worldCounts.countries === 1 ? 'Country' : 'Countries'} selected</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={onSelectAllWorld} className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Select all World</button>
            <button type="button" onClick={onClearWorld} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">Clear</button>
          </div>
        </div>
      </WorldCountriesPanel>
    )
  }

  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby={headingId}>
      <GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: continent ?? 'Continent', current: true }]} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{continent}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h3 id={headingId} className="text-lg font-bold text-zinc-100">Geography</h3>
          {continentHeaderAction}
        </div>
        <p className="mt-1 text-sm text-zinc-400">Select Subregions from the rail or map.</p>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-zinc-500">Scope</span><span className="text-right font-semibold text-zinc-200">{continentCounts?.selectedSubregions ?? 0} {(continentCounts?.selectedSubregions ?? 0) === 1 ? 'Subregion' : 'Subregions'} selected</span></div>
        <button type="button" aria-pressed={continentState === 'all'} onClick={onSelectEntireContinent} className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${continentState === 'all' ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}`}><span className="block font-semibold">Entire Continent</span><span className="mt-1 block text-xs text-zinc-500">All currently active Subregions</span></button>
      </div>
      <nav aria-label={`${continent ?? 'Continent'} Subregions`}>
        {continentOrderContent !== undefined ? continentOrderContent : (
          <ol className="space-y-1.5">
            {subregionOrder.map((subregion, index) => <GeographyHierarchyRow key={subregion.id} label={subregion.label} sequenceNumber={index + 1} secondary={formatCount(entries.filter(country => country.continent === continent && country.subregionId === subregion.id).length, 'Country', 'Countries')} groupId={getSubregionHoverGroupId(subregion.label)} hoveredGroupId={hoveredGroupId} onClick={() => onToggleSubregion(subregion.id)} onHoverGroup={onHoverGroup} selected={selection.subregionIds.includes(subregion.id)} />)}
          </ol>
        )}
      </nav>
      {showEmptyScopeGuidance && (continentCounts?.selectedSubregions ?? 0) === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>}
    </WorldCountriesPanel>
  )
}

function WorldContinentRow({ continent, sequenceNumber, selectedState, secondary, hoveredGroupId, onHoverGroup, onToggle, onOpen }: { continent: Continent; sequenceNumber: number; selectedState: 'none' | 'partial' | 'all'; secondary: string; hoveredGroupId: string | null; onHoverGroup: (groupId: string | null) => void; onToggle: () => void; onOpen: () => void }) {
  const groupId = getContinentHoverGroupId(continent)
  const checked = selectedState === 'all'
  const hovered = hoveredGroupId === groupId
  const focusHandlers = { onFocus: () => onHoverGroup(groupId), onBlur: () => onHoverGroup(null) }
  return <li className="rounded-lg" onMouseEnter={() => onHoverGroup(groupId)} onMouseLeave={() => onHoverGroup(null)}><div className="flex items-stretch gap-1"><button type="button" role="checkbox" aria-checked={selectedState === 'partial' ? 'mixed' : checked} aria-label={`Select ${continent}`} onClick={onToggle} {...focusHandlers} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${hovered ? 'ring-1 ring-cyan-400/60' : ''} ${selectedState !== 'none' ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-cyan-600'}`}><span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${checked ? 'border-cyan-400 bg-cyan-500 text-zinc-950' : selectedState === 'partial' ? 'border-cyan-400 text-cyan-300' : 'border-zinc-600 text-transparent'}`}>{checked ? '✓' : selectedState === 'partial' ? '−' : '✓'}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold text-zinc-200"><span className="w-5 shrink-0 text-xs tabular-nums text-zinc-600">{sequenceNumber}</span>{continent}</span><span className="mt-0.5 block pl-7 text-xs text-zinc-500">{secondary}</span></span></button><button type="button" aria-label={`Open ${continent} setup`} onClick={onOpen} {...focusHandlers} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-lg text-zinc-500 hover:border-cyan-600 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">›</button></div></li>
}

function formatContinentSummary(
  continent: Continent,
  selection: WorldCountriesSubregionScope,
  entries: readonly Country[],
  metadata: WorldCountriesSubregionScopeMetadata,
): string {
  const counts = getContinentSubregionScopeCounts(selection, continent, entries, metadata)
  return `${counts.selectedSubregions} of ${counts.totalSubregions} Subregions · ${formatCount(counts.countries, 'Country', 'Countries')}`
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
