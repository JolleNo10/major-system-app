import { useId, useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { getContinents, getSubregionDefinitionsForContinent } from '@/features/world-countries/geography/queries'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { sortSubregionsByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { InlineOrderEditor } from '@/features/world-countries/ui/InlineOrderEditor'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WORLD_COUNTRIES_MAIN_DRILL_MODE, WORLD_COUNTRIES_SUB_DRILL_MODES, type WorldCountriesDrillMode } from './drillModes'
import { getContinentSelectionState, getDrillSelectionCounts, type DrillSelectionMetadata, type WorldCountriesDrillSelection, type WorldCountriesDrillSelectionCounts } from './drillSelection'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { getPracticeInteractionLabel, getPracticeModeDefinition, resolvePracticeInteraction, type WorldCountriesPracticeInteraction, type WorldCountriesPracticeMode } from '@/features/world-countries/practice/practiceModes'
import { WORLD_COUNTRIES_PROFICIENCY_FILTERS, type WorldCountriesDrillScopeSource, type WorldCountriesProficiencyScope, type WorldCountriesProficiencySelection, type WorldCountriesProficiencyFilter } from './drillProficiencyScope'
import type { WorldCountriesSetupActivity } from './setupActivity'

export function DrillSetupRails({
  level,
  setupContinent,
  selection,
  selectionMetadata,
  mode,
  order,
  activity,
  practiceInteraction,
  onPracticeInteractionChange,
  scopeSource,
  onScopeSourceChange,
  proficiencySelection,
  proficiencyScope,
  proficiencyLoading,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleContinent,
  onToggleWorld,
  onToggleSubregion,
  onSelectEntireContinent,
  onProficiencySelectionChange,
  onModeChange,
  onOrderChange,
  onStart,
  onExit,
  entries = countries,
  worldOrder,
  subregionOrder,
  editingOrder,
  onBeginOrderEdit,
  onCancelOrderEdit,
  onDraftWorldOrder,
  onDraftSubregionOrder,
  onSaveWorldOrder,
  onSaveSubregionOrder,
}: {
  level: 'world' | 'continent'
  setupContinent: Continent | null
  selection: WorldCountriesDrillSelection
  selectionMetadata: DrillSelectionMetadata
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  activity: WorldCountriesSetupActivity
  practiceInteraction?: WorldCountriesPracticeInteraction
  onPracticeInteractionChange?: (interaction: WorldCountriesPracticeInteraction) => void
  scopeSource: WorldCountriesDrillScopeSource
  onScopeSourceChange: (source: WorldCountriesDrillScopeSource) => void
  proficiencySelection: WorldCountriesProficiencySelection
  proficiencyScope: WorldCountriesProficiencyScope
  proficiencyLoading: boolean
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleContinent: (continent: Continent) => void
  onToggleWorld: () => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onProficiencySelectionChange: (selection: WorldCountriesProficiencySelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onExit?: () => void
  entries?: readonly Country[]
  worldOrder: readonly Continent[]
  subregionOrder: readonly SubregionDefinition[]
  editingOrder: 'world' | 'continent' | null
  onBeginOrderEdit: (level: 'world' | 'continent') => void
  onCancelOrderEdit: () => void
  onDraftWorldOrder: (order: readonly Continent[]) => void
  onDraftSubregionOrder: (order: readonly SubregionDefinition[]) => void
  onSaveWorldOrder: (order: readonly Continent[]) => void
  onSaveSubregionOrder: (order: readonly SubregionDefinition[]) => void
}) {
  const continent = setupContinent
  const subregions = subregionOrder
  const modeGroupName = `world-countries-mode-${useId()}`
  const selectionCounts = getDrillSelectionCounts(selection, entries, selectionMetadata)
  const usesProficiency = scopeSource === 'proficiency'
  const proficiencySelected = usesProficiency && proficiencySelection.length > 0
  const canStart = usesProficiency
    ? proficiencySelected && !proficiencyLoading && proficiencyScope.countries.length > 0
    : selectionCounts.countries > 0
  const noMatching = proficiencySelected && !proficiencyLoading && proficiencyScope.countries.length === 0
  const disabledButtonLabel = usesProficiency
    ? !proficiencySelected
      ? 'Choose Weak or Developing'
      : proficiencyLoading
        ? 'Loading proficiency…'
        : noMatching
          ? 'No matching Countries'
          : 'Start Drill'
    : canStart
      ? 'Start Drill'
      : getSelectionPrompt(level)
  const scopeSummary = proficiencySelected
    ? !proficiencyLoading && proficiencyScope.countries.length > 0
      ? formatProficiencyScopeSummary(proficiencySelection, proficiencyScope.countries.length)
      : undefined
    : selectionCounts.countries > 0
      ? formatGeographyScopeSummary(selection, selectionCounts, entries, selectionMetadata, worldOrder)
      : undefined
  const countryScope = useMemo<CountryScopeSectionProps>(() => ({
    source: scopeSource,
    onSourceChange: onScopeSourceChange,
    geographyCountryCount: selectionCounts.countries,
    selection: proficiencySelection,
    scope: proficiencyScope,
    loading: proficiencyLoading,
    onChange: onProficiencySelectionChange,
  }), [onProficiencySelectionChange, onScopeSourceChange, proficiencyLoading, proficiencyScope, proficiencySelection, scopeSource, selectionCounts.countries])

  const rails = useMemo(() => ({
    left: (
      <section className="space-y-4">
        <GeographySelectionRail
          level={level}
          setupContinent={continent}
          selection={selection}
          selectionMetadata={selectionMetadata}
          worldOrder={worldOrder}
          subregionOrder={subregions}
          entries={entries}
          hoveredGroupId={hoveredGroupId}
          onHoverGroup={onHoverGroup}
          onWorld={onWorld}
          onSelectContinent={onSelectContinent}
          onToggleContinent={onToggleContinent}
          onToggleWorld={onToggleWorld}
          onToggleSubregion={onToggleSubregion}
          onSelectEntireContinent={onSelectEntireContinent}
          showEmptyScopeGuidance={!proficiencySelected}
          headingId={level === 'world' ? 'world-countries-drill-geography-heading' : 'world-countries-drill-scope-heading'}
          worldHeaderAction={editingOrder !== 'world' && worldOrder.length > 1 ? <button type="button" onClick={() => onBeginOrderEdit('world')} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button> : undefined}
          continentHeaderAction={editingOrder !== 'continent' && subregions.length > 1 ? <button type="button" onClick={() => onBeginOrderEdit('continent')} className="text-xs font-semibold text-cyan-300 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button> : undefined}
          worldOrderContent={editingOrder === 'world' ? <InlineOrderEditor entries={worldOrder} getId={candidate => candidate} getLabel={candidate => candidate} onItemHover={candidate => onHoverGroup(getContinentHoverGroupId(candidate))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftWorldOrder(draft)} onSave={draft => onSaveWorldOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getContinents(entries)} /> : undefined}
          continentOrderContent={editingOrder === 'continent' ? <InlineOrderEditor entries={subregions} getId={subregion => subregion.id} getLabel={subregion => subregion.label} onItemHover={subregion => onHoverGroup(getSubregionHoverGroupId(subregion.label))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftSubregionOrder(draft)} onSave={draft => onSaveSubregionOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getSubregionDefinitionsForContinent(continent ?? 'Africa', entries)} autoOrder={{ label: 'Auto-order from map', pendingLabel: 'Reading map…', hint: 'Best effort; review before saving.', errorMessage: 'Map auto-ordering was unavailable. The draft is unchanged.', run: draft => sortSubregionsByMemoMapPosition(continent ?? 'Africa', draft) }} /> : undefined}
        />
      </section>
    ),
    right: <div className="space-y-3"><WorldCountriesPanel className="space-y-3">{activity.kind === 'drill' ? <CurrentDrillPanel mode={mode} order={order} groupName={modeGroupName} onModeChange={onModeChange} onOrderChange={onOrderChange} countryScope={countryScope} scopeSummary={scopeSummary} canStart={canStart} noMatching={noMatching} disabledButtonLabel={disabledButtonLabel} onStart={onStart} /> : <FixedPracticePanel mode={activity.mode} interaction={practiceInteraction} onInteractionChange={onPracticeInteractionChange} countryScope={countryScope} scopeSummary={scopeSummary} canStart={canStart} noMatching={noMatching} disabledButtonLabel={disabledButtonLabel} onStart={onStart} />}</WorldCountriesPanel>{onExit && <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to guided home</button>}</div>,
    leftLabel: 'Geography',
    rightLabel: activity.kind === 'drill' ? 'Drill' : 'Practice',
  }), [activity, canStart, continent, countryScope, disabledButtonLabel, onPracticeInteractionChange, practiceInteraction, editingOrder, entries, hoveredGroupId, level, mode, modeGroupName, noMatching, onBeginOrderEdit, onCancelOrderEdit, onDraftSubregionOrder, onDraftWorldOrder, onExit, onHoverGroup, onModeChange, onOrderChange, onSaveSubregionOrder, onSaveWorldOrder, onSelectContinent, onSelectEntireContinent, onStart, onToggleContinent, onToggleSubregion, onToggleWorld, onWorld, order, proficiencySelected, selection, selectionMetadata, subregions, worldOrder])
  useRails(rails)
  return null
}

function CurrentDrillPanel({ mode, order, groupName, onModeChange, onOrderChange, countryScope, scopeSummary, canStart, noMatching, disabledButtonLabel, onStart }: { mode: WorldCountriesDrillMode; order: WorldCountriesDrillOrder; groupName: string; onModeChange: (mode: WorldCountriesDrillMode) => void; onOrderChange: (order: WorldCountriesDrillOrder) => void; countryScope: CountryScopeSectionProps; scopeSummary?: string; canStart: boolean; noMatching: boolean; disabledButtonLabel: string; onStart: () => void }) {
  return <section className="space-y-4" aria-labelledby="world-countries-current-drill-heading"><h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill mode</h2><fieldset className="space-y-2"><legend className="sr-only">Drill mode</legend><ModeOption candidate={WORLD_COUNTRIES_MAIN_DRILL_MODE} selected={WORLD_COUNTRIES_MAIN_DRILL_MODE.id === mode} onSelect={onModeChange} groupName={groupName} /><div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">One skill at a time</h3><div className="mt-2 space-y-2">{WORLD_COUNTRIES_SUB_DRILL_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}</div></div></fieldset><div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill order</h3><div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-label="Drill order"><OrderOption order="ordered" selected={order === 'ordered'} onSelect={onOrderChange}>In order</OrderOption><OrderOption order="random" selected={order === 'random'} onSelect={onOrderChange}>Random</OrderOption></div></div></div><CountryScopeSection {...countryScope} />{noMatching && <p className="text-sm text-amber-300" role="alert">No Countries currently match the selected proficiency.</p>}{scopeSummary && <div role="group" aria-label="Drill scope" className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</h3><p className="mt-1 text-sm font-semibold text-zinc-200">{scopeSummary}</p></div>}<button type="button" disabled={!canStart} onClick={() => onStart()} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Drill' : disabledButtonLabel}</button></section>
}

function formatGeographyScopeSummary(selection: WorldCountriesDrillSelection, counts: WorldCountriesDrillSelectionCounts, entries: readonly Country[], metadata: DrillSelectionMetadata, worldOrder: readonly Continent[]): string {
  const entireContinent = counts.continents === 1
    ? worldOrder.find(continent => getContinentSelectionState(selection, continent, entries, metadata) === 'all')
    : undefined
  if (entireContinent) return `${entireContinent} · ${formatCountryCount(counts.countries)}`
  if (counts.subregions === 1) return `${getSubregionDefinition(selection.subregionIds[0]!).label} · ${formatCountryCount(counts.countries)}`
  return `${counts.subregions} Subregions · ${formatCountryCount(counts.countries)}`
}

function formatProficiencyScopeSummary(selection: WorldCountriesProficiencySelection, countryCount: number): string {
  const labels = (['weak', 'developing'] as const)
    .filter(filter => selection.includes(filter))
    .map(filter => filter === 'weak' ? 'Weak' : 'Developing')
  return `${labels.join(' + ')} · ${formatCountryCount(countryCount)}`
}

function formatCountryCount(count: number): string {
  return `${count} ${count === 1 ? 'Country' : 'Countries'}`
}

function FixedPracticePanel({ mode, interaction, onInteractionChange, countryScope, scopeSummary, canStart, noMatching, disabledButtonLabel, onStart }: { mode: WorldCountriesPracticeMode; interaction?: WorldCountriesPracticeInteraction; onInteractionChange?: (interaction: WorldCountriesPracticeInteraction) => void; countryScope: CountryScopeSectionProps; scopeSummary?: string; canStart: boolean; noMatching: boolean; disabledButtonLabel: string; onStart: () => void }) {
  const definition = getPracticeModeDefinition(mode)
  const label = definition.label
  const selectedInteraction = resolvePracticeInteraction(mode, interaction)
  return <section className="space-y-3" aria-labelledby="world-countries-practice-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Practice</p><h2 id="world-countries-practice-heading" className="mt-1 text-lg font-bold text-zinc-100">{label}</h2><p className="mt-1 text-sm leading-relaxed text-zinc-400">{definition.description}</p></div>{definition.interactions.length > 1 && onInteractionChange && <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Answer with</h3><div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-label="Answer with">{definition.interactions.map(candidate => <button key={candidate} type="button" role="radio" aria-checked={candidate === selectedInteraction} onClick={() => onInteractionChange(candidate)} className={`min-w-[4.25rem] rounded px-2 py-1 text-xs font-semibold ${candidate === selectedInteraction ? 'bg-cyan-600/40 text-cyan-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{getPracticeInteractionLabel(candidate)}</button>)}</div></div></div>}<p className="text-xs leading-relaxed text-zinc-500">Practice is non-recording and does not affect Learning, recall status, or evidence.</p><CountryScopeSection {...countryScope} />{noMatching && <p className="text-sm text-amber-300" role="alert">No Countries currently match the selected proficiency.</p>}{scopeSummary && <div role="group" aria-label="Practice scope" className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Scope</h3><p className="mt-1 text-sm font-semibold text-zinc-200">{scopeSummary}</p></div>}<button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? `Start ${label}` : disabledButtonLabel}</button></section>
}

interface CountryScopeSectionProps {
  source: WorldCountriesDrillScopeSource
  onSourceChange: (source: WorldCountriesDrillScopeSource) => void
  geographyCountryCount: number
  selection: WorldCountriesProficiencySelection
  scope: WorldCountriesProficiencyScope
  loading: boolean
  onChange: (selection: WorldCountriesProficiencySelection) => void
}

/**
 * Which Countries a run covers, alongside the other "what am I drilling"
 * settings. The two sources are exclusive, so they read as one choice here
 * rather than as a second scope picker competing with the geography rail.
 */
function CountryScopeSection({ source, onSourceChange, geographyCountryCount, selection, scope, loading, onChange }: CountryScopeSectionProps) {
  const groupName = `world-countries-scope-source-${useId()}`
  const toggle = (filter: WorldCountriesProficiencyFilter) => onChange(selection.includes(filter) ? selection.filter(value => value !== filter) : [...selection, filter])
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><fieldset className="space-y-2"><legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Countries</legend><SourceOption candidate="geography" label="Selected regions" trailing={formatCountryCount(geographyCountryCount)} selected={source === 'geography'} groupName={groupName} onSelect={onSourceChange} /><SourceOption candidate="proficiency" label="Only what needs work" selected={source === 'proficiency'} groupName={groupName} onSelect={onSourceChange} />{source === 'proficiency' && <div className="space-y-2 pl-3"><fieldset className="space-y-2"><legend className="sr-only">Proficiency filters</legend>{WORLD_COUNTRIES_PROFICIENCY_FILTERS.map(filter => <label key={filter} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selection.includes(filter) ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="checkbox" checked={selection.includes(filter)} onChange={() => toggle(filter)} className="h-4 w-4 accent-cyan-500" /><span className="min-w-0 flex-1 font-semibold">{filter === 'weak' ? 'Weak' : 'Developing'}</span><span className="text-xs tabular-nums text-zinc-500">{loading ? '…' : formatCountryCount(scope.counts[filter])}</span></label>)}</fieldset>{selection.length === 0 && <p className="text-xs leading-relaxed text-zinc-500">Pick Weak, Developing, or both.</p>}</div>}</fieldset></div>
}

function SourceOption({ candidate, label, trailing, selected, groupName, onSelect }: { candidate: WorldCountriesDrillScopeSource; label: string; trailing?: string; selected: boolean; groupName: string; onSelect: (source: WorldCountriesDrillScopeSource) => void }) {
  return <label className={`flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}><input type="radio" name={groupName} value={candidate} data-scope-source={candidate} checked={selected} onChange={() => onSelect(candidate)} className="sr-only" />{selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}<span className="min-w-0 flex-1 font-semibold">{label}</span>{trailing && <span className="shrink-0 text-xs tabular-nums text-zinc-500">{trailing}</span>}</label>
}

function getSelectionPrompt(_level: 'world' | 'continent'): string {
  return 'Choose at least one Subregion'
}

type ModeOption<T extends string> = { id: T; label: string; description: string }
function ModeOption<T extends string>({ candidate, selected, onSelect, groupName }: { candidate: ModeOption<T>; selected: boolean; onSelect: (mode: T) => void; groupName: string }) {
  const descriptionId = `${useId()}-description`
  return <label className={`flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}><input type="radio" name={groupName} value={candidate.id} checked={selected} onChange={() => onSelect(candidate.id)} aria-describedby={descriptionId} className="sr-only" />{selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}<span className="min-w-0 flex-1 font-semibold">{candidate.label}</span><span className="group relative shrink-0"><span tabIndex={0} aria-label={`Explain ${candidate.label} mode`} aria-describedby={descriptionId} title={candidate.description} className="flex h-5 w-5 cursor-help items-center justify-center rounded-full text-sm text-zinc-500 hover:bg-zinc-800 hover:text-cyan-300">ⓘ</span><span id={descriptionId} role="tooltip" className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{candidate.description}</span></span></label>
}

function OrderOption({ order, selected, onSelect, children }: { order: WorldCountriesDrillOrder; selected: boolean; onSelect: (order: WorldCountriesDrillOrder) => void; children: string }) {
  return <button type="button" role="radio" aria-checked={selected} onClick={() => onSelect(order)} className={`min-w-[4.25rem] rounded px-2 py-1 text-xs font-semibold ${selected ? 'bg-cyan-600/40 text-cyan-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{children}</button>
}
