import { useId, useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import type { WorldCountriesSubregionScope, WorldCountriesSubregionScopeMetadata } from '@/features/world-countries/geography/subregionScope'
import { GeographyOverviewMap } from '@/features/world-countries/maps/GeographyOverviewMap'
import type { SvgMapLoadState } from '@/features/world-countries/maps/SvgMapView'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { MapSurface } from '@/features/world-countries/ui/MapSurface'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { WorldCountriesReciteProgress } from './reciteProgress'
import { createReciteSetupCountryColors, createReciteSetupCountryDescriptions, getReciteStatusDescription, RECITE_STATUS_COLORS, type ReciteStatus } from './recitePresentation'
import type { ReciteMode } from './reciteSession'

export type ReciteMapAssistance = 'visible' | 'reveal'

export const RECITE_MODE_DEFINITIONS: readonly {
  id: ReciteMode
  label: string
  description: string
}[] = [
  { id: 'countries', label: 'Countries', description: 'Recall each Country name in authored geographic order.' },
  { id: 'countries-capitals', label: 'Countries + Capitals', description: 'Recall each Country, then its Capital, before advancing.' },
  { id: 'countries-from-capitals', label: 'Countries from Capitals', description: 'Use each Capital as a cue to recall the Country.' },
]

export const RECITE_ASSISTANCE_DEFINITIONS: readonly {
  id: ReciteMapAssistance
  label: string
  description: string
}[] = [
  { id: 'visible', label: 'Visible', description: 'Keep Country geography visible without names or status history.' },
  { id: 'reveal', label: 'Reveal as you go', description: 'Reveal each Country only after its Country prompt is resolved.' },
]

export function getReciteModeLabel(mode: ReciteMode): string {
  return RECITE_MODE_DEFINITIONS.find(candidate => candidate.id === mode)?.label ?? mode
}

export function getReciteAssistanceLabel(assistance: ReciteMapAssistance): string {
  return RECITE_ASSISTANCE_DEFINITIONS.find(candidate => candidate.id === assistance)?.label ?? assistance
}

export interface ReciteSetupProps {
  activeCountries: readonly Country[]
  selectedContinent: Continent | null
  selectedScopeSubregionIds: readonly SubregionId[]
  setupScopeCountries: readonly Country[]
  selection: WorldCountriesSubregionScope
  selectionMetadata: WorldCountriesSubregionScopeMetadata
  worldOrder: readonly Continent[]
  subregions: readonly SubregionDefinition[]
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleContinent: (continent: Continent) => void
  onSelectAllWorld: () => void
  onClearWorld: () => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onMapStateChange: (state: SvgMapLoadState) => void
  mode: ReciteMode
  assistance: ReciteMapAssistance
  onModeChange: (mode: ReciteMode) => void
  onAssistanceChange: (assistance: ReciteMapAssistance) => void
  canStart: boolean
  mapState: SvgMapLoadState
  onStart: () => void
  progress: WorldCountriesReciteProgress
}

export function ReciteSetup({
  activeCountries,
  selectedContinent,
  selectedScopeSubregionIds,
  setupScopeCountries,
  selection,
  selectionMetadata,
  worldOrder,
  subregions,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleContinent,
  onSelectAllWorld,
  onClearWorld,
  onToggleSubregion,
  onSelectEntireContinent,
  onMapStateChange,
  mode,
  assistance,
  onModeChange,
  onAssistanceChange,
  canStart,
  mapState,
  onStart,
  progress,
}: ReciteSetupProps) {
  const visibleCountries = useMemo(
    () => selectedContinent ? activeCountries.filter(country => country.continent === selectedContinent) : activeCountries,
    [activeCountries, selectedContinent],
  )
  const scopeCountryIds = useMemo(
    () => selectedContinent ? setupScopeCountries.map(country => country.id) : undefined,
    [selectedContinent, setupScopeCountries],
  )
  const setupColors = useMemo(
    () => createReciteSetupCountryColors(visibleCountries, scopeCountryIds, mode, progress),
    [mode, progress, scopeCountryIds, visibleCountries],
  )
  const setupDescriptions = useMemo(
    () => createReciteSetupCountryDescriptions(visibleCountries, scopeCountryIds, mode, progress),
    [mode, progress, scopeCountryIds, visibleCountries],
  )
  const rails = useMemo(() => ({
    left: (
      <GeographySelectionRail
        level={selectedContinent ? 'continent' : 'world'}
        setupContinent={selectedContinent}
        selection={selection}
        selectionMetadata={selectionMetadata}
        worldOrder={worldOrder}
        subregionOrder={subregions}
        entries={activeCountries}
        hoveredGroupId={hoveredGroupId}
        onHoverGroup={onHoverGroup}
        onWorld={onWorld}
        onSelectContinent={onSelectContinent}
        onToggleContinent={onToggleContinent}
        onSelectAllWorld={onSelectAllWorld}
        onClearWorld={onClearWorld}
        onToggleSubregion={onToggleSubregion}
        onSelectEntireContinent={onSelectEntireContinent}
        headingId="world-countries-recite-geography-heading"
      />
    ),
    right: (
      <ReciteSetupControls
        mode={mode}
        assistance={assistance}
        onModeChange={onModeChange}
        onAssistanceChange={onAssistanceChange}
        canStart={canStart}
        mapState={mapState}
        selectedCount={selectedScopeSubregionIds.length}
        onStart={onStart}
        progress={progress}
      />
    ),
    leftLabel: 'Geography',
    rightLabel: 'Recite',
  }), [
    activeCountries,
    assistance,
    canStart,
    hoveredGroupId,
    mapState,
    mode,
    onAssistanceChange,
    onClearWorld,
    onHoverGroup,
    onModeChange,
    onSelectAllWorld,
    onSelectContinent,
    onSelectEntireContinent,
    onStart,
    onToggleContinent,
    onToggleSubregion,
    onWorld,
    progress,
    selectedContinent,
    selectedScopeSubregionIds.length,
    selection,
    selectionMetadata,
    subregions,
    worldOrder,
  ])
  useRails(rails)

  return (
    <section className="space-y-3 animate-fade-in" aria-labelledby="world-countries-recite-heading">
      <MapSurface
        context={(
          <div className="px-1 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Recite</p>
            <h1 id="world-countries-recite-heading" className="mt-1 text-2xl font-black text-zinc-100">Ordered recall</h1>
            <p className="mt-1 text-sm text-zinc-500">Choose a World-wide Subregion scope, then recall it in authored order.</p>
          </div>
        )}
        map={(
          <GeographyOverviewMap
            level={selectedContinent ? 'continent' : 'world'}
            continent={selectedContinent ?? undefined}
            selectedSubregionIds={selectedContinent ? selectedScopeSubregionIds : undefined}
            countryColorsById={setupColors}
            countryAccessibleDescriptionsById={setupDescriptions}
            hoveredGroupId={hoveredGroupId}
            onHoverGroup={onHoverGroup}
            onCountryClick={country => selectedContinent ? onToggleSubregion(country.subregionId) : onSelectContinent(country.continent)}
            onMapStateChange={onMapStateChange}
            ariaLabel={selectedContinent ? `${selectedContinent} map for Recite setup` : 'World map for Recite setup'}
          />
        )}
        mapMeta={<span>{setupScopeCountries.length > 0 ? `${setupScopeCountries.length} Countries in current scope` : 'Select a Subregion to begin'}</span>}
      />
    </section>
  )
}

function ReciteSetupControls({ mode, assistance, onModeChange, onAssistanceChange, canStart, mapState, selectedCount, onStart, progress }: {
  mode: ReciteMode
  assistance: ReciteMapAssistance
  onModeChange: (mode: ReciteMode) => void
  onAssistanceChange: (assistance: ReciteMapAssistance) => void
  canStart: boolean
  mapState: SvgMapLoadState
  selectedCount: number
  onStart: () => void
  progress: WorldCountriesReciteProgress
}) {
  const modeGroup = `world-countries-recite-mode-${useId()}`
  const assistanceGroup = `world-countries-recite-assistance-${useId()}`
  return (
    <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-recite-controls-heading">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p><h2 id="world-countries-recite-controls-heading" className="mt-1 text-lg font-bold text-zinc-100">Mode</h2></div>
      <fieldset className="space-y-2"><legend className="sr-only">Recite mode</legend>{RECITE_MODE_DEFINITIONS.map(candidate => <label key={candidate.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${mode === candidate.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="radio" name={modeGroup} value={candidate.id} checked={mode === candidate.id} onChange={() => onModeChange(candidate.id)} className="mt-1 accent-cyan-500" /><span><span className="block font-semibold">{candidate.label}</span><span className="mt-0.5 block text-xs text-zinc-500">{candidate.description}</span></span></label>)}</fieldset>
      <fieldset className="space-y-2 border-t border-zinc-800 pt-4"><legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Map assistance</legend>{RECITE_ASSISTANCE_DEFINITIONS.map(candidate => <label key={candidate.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${assistance === candidate.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="radio" name={assistanceGroup} value={candidate.id} checked={assistance === candidate.id} onChange={() => onAssistanceChange(candidate.id)} className="mt-1 accent-cyan-500" /><span><span className="block font-semibold">{candidate.label}</span><span className="mt-0.5 block text-xs text-zinc-500">{candidate.description}</span></span></label>)}</fieldset>
      <ReciteStatusLegend mode={mode} progress={progress} />
      {selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion.</p>}
      {mapState === 'loading' && <p className="text-xs text-zinc-500" role="status">Loading map…</p>}
      {mapState === 'error' && <p className="text-sm text-red-300" role="alert">Recite will be available when the map loads successfully.</p>}
      <button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Recite' : 'Choose a ready Country scope'}</button>
    </WorldCountriesPanel>
  )
}

function ReciteStatusLegend({ mode, progress }: { mode: ReciteMode; progress: WorldCountriesReciteProgress }) {
  const statuses: readonly ReciteStatus[] = ['unrecited', 'revealed', 'recovered', 'recalled']
  return <details className="border-t border-zinc-800 pt-4"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-500">{getReciteModeLabel(mode)} status legend</summary><ul className="mt-3 space-y-2 text-xs text-zinc-400">{statuses.map(status => <li key={status} className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: status === 'unrecited' ? RECITE_STATUS_COLORS.unrecited : RECITE_STATUS_COLORS[status] }} /><span><span className="font-semibold text-zinc-200">{statusLabel(status)}</span> — {getReciteStatusDescription(status)}{status !== 'unrecited' && <span className="sr-only"> Stored outcomes remain mode-specific.</span>}</span></li>)}</ul><p className="mt-3 text-xs text-zinc-500">Countries setup may use a stronger Countries + Capitals result. Countries + Capitals and Countries from Capitals remain their own status views; stored progress remains independent. Drill and Learning status are not used here.</p><span className="sr-only">{progress.version === 1 ? 'Recite progress storage active.' : ''}</span></details>
}

function statusLabel(status: ReciteStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
