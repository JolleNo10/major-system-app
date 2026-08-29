import { useId, type ReactNode } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getContinents, getSubregionDefinitionsForContinent } from '@/features/world-countries/geography/queries'
import { getContinentSubregionScopeCounts } from '@/features/world-countries/geography/subregionScope'
import { deriveWorldCountriesLearningReadiness, getWorldCountriesLearningStateList, type WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { sortSubregionsByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { GeographySelectionRail } from '@/features/world-countries/ui/GeographySelectionRail'
import { InlineOrderEditor } from '@/features/world-countries/ui/InlineOrderEditor'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WORLD_COUNTRIES_DRILL_MODES, type WorldCountriesDrillMode } from './drillModes'
import { getDrillSelectionCounts, type DrillSelectionMetadata, type WorldCountriesDrillSelection } from './drillSelection'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { isWorldCountriesLearningMode, WORLD_COUNTRIES_LEARNING_MODES, WORLD_COUNTRIES_PRACTICE_MODES, type WorldCountriesLearnPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'
import type { WorldCountriesProficiencyScope, WorldCountriesProficiencySelection, WorldCountriesProficiencyFilter } from './drillProficiencyScope'

const PURPOSES = [
  { id: 'drill' as const, label: 'Drill', description: 'Recording recall that contributes to Drill proficiency.' },
  { id: 'learn-practise' as const, label: 'Learn & Practise', description: 'Durable Learning milestones or non-recording Practice.' },
]

export function DrillSetupRails({
  level,
  setupContinent,
  selection,
  selectionMetadata,
  mode,
  order,
  purpose,
  learnPracticeMode,
  proficiencySelection,
  proficiencyScope,
  proficiencyLoading,
  learningStates,
  learningReadinessBySubregion,
  hoveredGroupId,
  onHoverGroup,
  onWorld,
  onSelectContinent,
  onToggleContinent,
  onSelectAllWorld,
  onClearWorld,
  onToggleSubregion,
  onSelectEntireContinent,
  onProficiencySelectionChange,
  onModeChange,
  onOrderChange,
  onStart,
  onPurposeChange,
  onLearnPracticeModeChange,
  onLearnPracticeStart,
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
  purpose: 'drill' | 'learn-practise' | null
  learnPracticeMode: WorldCountriesLearnPracticeMode
  proficiencySelection: WorldCountriesProficiencySelection
  proficiencyScope: WorldCountriesProficiencyScope
  proficiencyLoading: boolean
  learningStates: LearningStates
  learningReadinessBySubregion?: ReadonlyMap<SubregionId, WorldCountriesLearningReadiness>
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleContinent: (continent: Continent) => void
  onSelectAllWorld: () => void
  onClearWorld: () => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
  onProficiencySelectionChange: (selection: WorldCountriesProficiencySelection) => void
  onModeChange: (mode: WorldCountriesDrillMode) => void
  onOrderChange: (order: WorldCountriesDrillOrder) => void
  onStart: () => void
  onPurposeChange: (purpose: 'drill' | 'learn-practise') => void
  onLearnPracticeModeChange: (mode: WorldCountriesLearnPracticeMode) => void
  onLearnPracticeStart: (mode: WorldCountriesLearnPracticeMode) => void
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
  const purposeGroupName = `world-countries-purpose-${useId()}`
  const modeGroupName = `world-countries-mode-${useId()}`
  const stateList = getWorldCountriesLearningStateList(learningStates)
  const selectedStates = selection.subregionIds.map(id => stateList.find(state => state.subregionId === id))
  const countriesIncomplete = selection.subregionIds.some(id => (learningReadinessBySubregion?.get(id) ?? deriveWorldCountriesLearningReadiness(stateList.find(state => state.subregionId === id))) === 'NOT_LEARNED')
  const selectionCounts = getDrillSelectionCounts(selection, entries, selectionMetadata)
  const selectedCount = level === 'continent' && continent
    ? getContinentSubregionScopeCounts(selection, continent, entries, selectionMetadata).selectedSubregions
    : selectionCounts.subregions

  useRails({
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
          onSelectAllWorld={onSelectAllWorld}
          onClearWorld={onClearWorld}
          onToggleSubregion={onToggleSubregion}
          onSelectEntireContinent={onSelectEntireContinent}
          showEmptyScopeGuidance={proficiencySelection.length === 0}
          headingId={level === 'world' ? 'world-countries-drill-geography-heading' : 'world-countries-drill-scope-heading'}
          worldHeaderAction={editingOrder !== 'world' && worldOrder.length > 1 ? <button type="button" onClick={() => onBeginOrderEdit('world')} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button> : undefined}
          continentHeaderAction={editingOrder !== 'continent' && subregions.length > 1 ? <button type="button" onClick={() => onBeginOrderEdit('continent')} className="text-xs font-semibold text-cyan-300 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button> : undefined}
          worldOrderContent={editingOrder === 'world' ? <InlineOrderEditor entries={worldOrder} getId={candidate => candidate} getLabel={candidate => candidate} onItemHover={candidate => onHoverGroup(getContinentHoverGroupId(candidate))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftWorldOrder(draft)} onSave={draft => onSaveWorldOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getContinents(entries)} /> : undefined}
          continentOrderContent={editingOrder === 'continent' ? <InlineOrderEditor entries={subregions} getId={subregion => subregion.id} getLabel={subregion => subregion.label} onItemHover={subregion => onHoverGroup(getSubregionHoverGroupId(subregion.label))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftSubregionOrder(draft)} onSave={draft => onSaveSubregionOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getSubregionDefinitionsForContinent(continent ?? 'Africa', entries)} autoOrder={{ label: 'Auto-order from map', pendingLabel: 'Reading map…', hint: 'Best effort; review before saving.', errorMessage: 'Map auto-ordering was unavailable. The draft is unchanged.', run: draft => sortSubregionsByMemoMapPosition(continent ?? 'Africa', draft) }} /> : undefined}
        />
        {level === 'continent' && <ProficiencyScopePanel selection={proficiencySelection} scope={proficiencyScope} loading={proficiencyLoading} onChange={onProficiencySelectionChange} />}
      </section>
    ),
    right: <ActivityPurposePanel purpose={purpose} groupName={purposeGroupName} onChange={onPurposeChange}>{purpose === 'drill' ? <CurrentDrillPanel level={level} mode={mode} order={order} groupName={modeGroupName} onModeChange={onModeChange} onOrderChange={onOrderChange} canStart={proficiencySelection.length > 0 ? !proficiencyLoading && proficiencyScope.countries.length > 0 : selectionCounts.countries > 0} noMatching={proficiencySelection.length > 0 && !proficiencyLoading && proficiencyScope.countries.length === 0} onStart={onStart} /> : purpose === 'learn-practise' ? <LearnPracticePanel selectedCount={selectedCount} selectedCountryCount={selectionCounts.countries} level={level} selectedStates={selectedStates} countriesIncomplete={countriesIncomplete} mode={learnPracticeMode} proficiencySelected={proficiencySelection.length > 0} proficiencyLoading={proficiencyLoading} proficiencyCountryCount={proficiencyScope.countries.length} onModeChange={onLearnPracticeModeChange} onStart={onLearnPracticeStart} /> : null}</ActivityPurposePanel>,
    leftLabel: 'Geography',
    rightLabel: purpose === 'drill' ? 'Drill' : purpose === 'learn-practise' ? 'Learn & Practise' : 'Choose activity',
  }, [continent, countriesIncomplete, editingOrder, entries, hoveredGroupId, learnPracticeMode, learningReadinessBySubregion, learningStates, level, mode, modeGroupName, onBeginOrderEdit, onCancelOrderEdit, onClearWorld, onDraftSubregionOrder, onDraftWorldOrder, onHoverGroup, onLearnPracticeModeChange, onLearnPracticeStart, onModeChange, onOrderChange, onProficiencySelectionChange, onSaveSubregionOrder, onSaveWorldOrder, onSelectAllWorld, onSelectContinent, onSelectEntireContinent, onStart, onToggleContinent, onToggleSubregion, onWorld, order, purpose, purposeGroupName, proficiencyLoading, proficiencyScope, proficiencySelection, selectedCount, selectedStates, selection, selectionCounts, selectionMetadata, subregions, worldOrder])
  return null
}

function ActivityPurposePanel({ purpose, groupName, onChange, children }: { purpose: 'drill' | 'learn-practise' | null; groupName: string; onChange: (purpose: 'drill' | 'learn-practise') => void; children: ReactNode }) {
  const compact = purpose !== null
  return <WorldCountriesPanel className={compact ? 'space-y-3' : 'space-y-4'} aria-labelledby="world-countries-purpose-heading"><div className={compact ? 'space-y-2' : 'space-y-3'}><div><h2 id="world-countries-purpose-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Purpose</h2><p className={compact ? 'mt-1 text-xs text-zinc-500' : 'mt-1 text-sm leading-relaxed text-zinc-300'}>{compact ? 'Controls below follow this choice.' : 'Choose the activity; its controls appear below.'}</p></div><div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Activity purpose">{PURPOSES.map(candidate => <PurposeOption key={candidate.id} candidate={candidate} selected={purpose === candidate.id} compact={compact} onSelect={onChange} groupName={groupName} />)}</div></div>{children ? <div className={compact ? 'border-t border-zinc-800 pt-3' : undefined}>{children}</div> : null}</WorldCountriesPanel>
}

function PurposeOption({ candidate, selected, compact, onSelect, groupName }: { candidate: typeof PURPOSES[number]; selected: boolean; compact: boolean; onSelect: (purpose: 'drill' | 'learn-practise') => void; groupName: string }) {
  const descriptionId = `${useId()}-description`
  return <label title={candidate.description} className={`${compact ? 'flex min-h-[42px] items-center justify-center text-center' : 'flex min-h-[92px] flex-col items-start text-left'} w-full cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600 hover:text-zinc-100'}`}><input type="radio" name={groupName} value={candidate.id} checked={selected} onChange={() => onSelect(candidate.id)} aria-describedby={descriptionId} className="sr-only" /><span className="flex items-center gap-2 font-semibold">{selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}{candidate.label}</span><span id={descriptionId} className={compact ? 'sr-only' : 'mt-1 text-xs leading-relaxed text-zinc-500'}>{candidate.description}</span></label>
}

function CurrentDrillPanel({ level, mode, order, groupName, onModeChange, onOrderChange, canStart, noMatching, onStart }: { level: 'world' | 'continent'; mode: WorldCountriesDrillMode; order: WorldCountriesDrillOrder; groupName: string; onModeChange: (mode: WorldCountriesDrillMode) => void; onOrderChange: (order: WorldCountriesDrillOrder) => void; canStart: boolean; noMatching: boolean; onStart: () => void }) {
  return <section className="space-y-4" aria-labelledby="world-countries-current-drill-heading"><h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill mode</h2><div><fieldset className="space-y-2">{WORLD_COUNTRIES_DRILL_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}</fieldset></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill order</h3><div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-label="Drill order"><OrderOption order="ordered" selected={order === 'ordered'} onSelect={onOrderChange}>In order</OrderOption><OrderOption order="random" selected={order === 'random'} onSelect={onOrderChange}>Random</OrderOption></div></div></div>{noMatching && <p className="text-sm text-amber-300" role="alert">No Countries currently match the selected proficiency.</p>}<button type="button" disabled={!canStart} onClick={() => onStart()} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Drill' : getSelectionPrompt(level)}</button></section>
}

function LearnPracticePanel({ level, selectedCount, selectedCountryCount, selectedStates, countriesIncomplete, mode, proficiencySelected, proficiencyLoading, proficiencyCountryCount, onModeChange, onStart }: { level: 'world' | 'continent'; selectedCount: number; selectedCountryCount: number; selectedStates: readonly (SubregionLearningState | undefined)[]; countriesIncomplete: boolean; mode: WorldCountriesLearnPracticeMode; proficiencySelected: boolean; proficiencyLoading: boolean; proficiencyCountryCount: number; onModeChange: (mode: WorldCountriesLearnPracticeMode) => void; onStart: (mode: WorldCountriesLearnPracticeMode) => void }) {
  const learning = isWorldCountriesLearningMode(mode)
  const groupName = `world-countries-learn-practice-${useId()}`
  const canStart = proficiencySelected ? !proficiencyLoading && proficiencyCountryCount > 0 : selectedCountryCount > 0
  const learningGuidance = proficiencySelected && learning ? 'Proficiency Learning is temporary: completing it does not mark a Subregion learned.' : null
  const noMatching = proficiencySelected && !proficiencyLoading && proficiencyCountryCount === 0
  const disabledLabel = learningGuidance ?? (noMatching ? 'No Countries currently match the selected proficiency' : proficiencySelected && proficiencyLoading ? 'Loading proficiency…' : getSelectionPrompt(level))
  return <section className="space-y-3" aria-labelledby="world-countries-learn-practice-heading"><h2 id="world-countries-learn-practice-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learn &amp; Practise</h2><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Learning</p>{WORLD_COUNTRIES_LEARNING_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}<p className="pt-2 text-xs font-semibold uppercase tracking-wider text-violet-400">Practice</p>{WORLD_COUNTRIES_PRACTICE_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}</div>{mode === 'learn-capitals' && countriesIncomplete && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200" role="note">Recommendation: Learn Countries first for this selection. Learn Capitals is available now and will record Capitals learned, while Learning Readiness remains Not learned until Countries learning is complete.</p>}{learningGuidance && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200" role="note">{learningGuidance}</p>}{learning && selectedCount > 1 && <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-relaxed text-zinc-400" role="note">Learning is recommended one Subregion at a time. Continue will work through the selected Subregions in effective geographic order.</p>}{!learning && <p className="text-xs leading-relaxed text-zinc-500">Practice is non-recording: it never changes Learning Readiness, evidence, Drill proficiency, or preferences.</p>}{noMatching && <p className="text-sm text-amber-300" role="alert">No Countries currently match the selected proficiency.</p>}<button type="button" disabled={!canStart} onClick={() => onStart(mode)} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? `Start ${learning ? 'Learning' : 'Practice'}` : disabledLabel}</button></section>
}

function ProficiencyScopePanel({ selection, scope, loading, onChange }: { selection: WorldCountriesProficiencySelection; scope: WorldCountriesProficiencyScope; loading: boolean; onChange: (selection: WorldCountriesProficiencySelection) => void }) {
  const toggle = (filter: WorldCountriesProficiencyFilter) => onChange(selection.includes(filter) ? selection.filter(value => value !== filter) : [...selection, filter])
  return <WorldCountriesPanel className="space-y-3" aria-labelledby="world-countries-proficiency-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Focus</p><h3 id="world-countries-proficiency-heading" className="mt-1 text-lg font-bold text-zinc-100">Proficiency</h3><p className="mt-1 text-sm leading-relaxed text-zinc-400">Focus Drill or non-recording Practice on Countries that currently need work.</p></div><fieldset className="space-y-2"><legend className="sr-only">Proficiency filters</legend>{(['weak', 'developing'] as const).map(filter => <label key={filter} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selection.includes(filter) ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-600'}`}><input type="checkbox" checked={selection.includes(filter)} onChange={() => toggle(filter)} className="h-4 w-4 accent-cyan-500" /><span className="min-w-0 flex-1 font-semibold">{filter === 'weak' ? 'Weak' : 'Developing'}</span><span className="text-xs tabular-nums text-zinc-500">{loading ? '…' : `${scope.counts[filter]} ${scope.counts[filter] === 1 ? 'Country' : 'Countries'}`}</span></label>)}</fieldset>{selection.length > 0 ? <p className="text-sm font-semibold text-zinc-200">{loading ? 'Loading proficiency…' : `${scope.countries.length} Countries selected by proficiency`}</p> : <p className="text-xs leading-relaxed text-zinc-500">Select Weak or Developing, or use Geography for complete Subregions.</p>}{selection.length > 0 && !loading && scope.countries.length === 0 && <p className="text-sm text-amber-300" role="alert">No Countries currently match the selected proficiency.</p>}</WorldCountriesPanel>
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
