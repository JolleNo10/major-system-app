import { useId, type ReactNode } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import { countries, type Continent, type Country } from '@/features/world-countries/data/countries'
import type { SubregionDefinition, SubregionId } from '@/features/world-countries/data/subregions'
import { getContinents, getCountriesForContinent, getCountriesForSubregion, getSubregionDefinitionsForContinent, getSubregionsForContinentInEffectiveOrder } from '@/features/world-countries/geography/queries'
import { getContinentMetadata } from '@/features/world-countries/geography/continentMetadataStore'
import { deriveWorldCountriesLearningReadiness, getWorldCountriesLearningStateList, type WorldCountriesLearningReadiness } from '@/features/world-countries/learning/learningReadiness'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import type { SubregionLearningState } from '@/features/world-countries/learning/subregionLearningState'
import { getContinentHoverGroupId, getSubregionHoverGroupId } from '@/features/world-countries/maps/geographyMapAdapter'
import { sortSubregionsByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { GeographyHierarchyRow } from '@/features/world-countries/ui/GeographyHierarchyRow'
import { InlineOrderEditor } from '@/features/world-countries/ui/InlineOrderEditor'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WORLD_COUNTRIES_DRILL_MODES, type WorldCountriesDrillMode } from './drillModes'
import { isEntireContinentSelection, type WorldCountriesDrillSelection } from './drillSelection'
import type { WorldCountriesDrillOrder } from './drillOrder'
import { isWorldCountriesLearningMode, WORLD_COUNTRIES_LEARNING_MODES, WORLD_COUNTRIES_PRACTICE_MODES, type WorldCountriesLearnPracticeMode } from '@/features/world-countries/learning/learnPracticeModes'

const PURPOSES = [
  { id: 'drill' as const, label: 'Drill', description: 'Recording recall that contributes to Drill proficiency.' },
  { id: 'learn-practise' as const, label: 'Learn & Practise', description: 'Durable Learning milestones or non-recording Practice.' },
]
export function DrillSetupRails({
  level, selection, mode, order, purpose, learnPracticeMode, learningStates, learningReadinessBySubregion, hoveredGroupId, onHoverGroup, onWorld, onSelectContinent, onToggleSubregion, onSelectEntireContinent, onModeChange, onOrderChange, onStart, onPurposeChange, onLearnPracticeModeChange, onLearnPracticeStart, entries = countries, worldOrder, subregionOrder, editingOrder, onBeginOrderEdit, onCancelOrderEdit, onDraftWorldOrder, onDraftSubregionOrder, onSaveWorldOrder, onSaveSubregionOrder,
}: {
  level: 'world' | 'continent'
  selection: WorldCountriesDrillSelection
  mode: WorldCountriesDrillMode
  order: WorldCountriesDrillOrder
  purpose: 'drill' | 'learn-practise' | null
  learnPracticeMode: WorldCountriesLearnPracticeMode
  learningStates: LearningStates
  learningReadinessBySubregion?: ReadonlyMap<SubregionId, WorldCountriesLearningReadiness>
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onWorld: () => void
  onSelectContinent: (continent: Continent) => void
  onToggleSubregion: (subregionId: SubregionId) => void
  onSelectEntireContinent: () => void
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
  const subregions = subregionOrder
  const entireContinent = isEntireContinentSelection(selection, entries)
  const selectedCount = selection.subregionIds.length
  const purposeGroupName = `world-countries-purpose-${useId()}`
  const modeGroupName = `world-countries-mode-${useId()}`
  const stateList = getWorldCountriesLearningStateList(learningStates)
  const selectedStates = selection.subregionIds.map(id => stateList.find(state => state.subregionId === id))
  const countriesIncomplete = selection.subregionIds.some(id => (learningReadinessBySubregion?.get(id) ?? deriveWorldCountriesLearningReadiness(stateList.find(state => state.subregionId === id))) === 'NOT_LEARNED')

  useRails({
    left: <section className="space-y-4">
      {level === 'world' ? <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-drill-geography-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World</p><div className="mt-1 flex items-center justify-between gap-3"><h3 id="world-countries-drill-geography-heading" className="text-lg font-bold text-zinc-100">Geography</h3>{editingOrder !== 'world' && worldOrder.length > 1 && <button type="button" onClick={() => onBeginOrderEdit('world')} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button>}</div></div><p className="text-sm leading-relaxed text-zinc-400">Choose a Continent to enter its map-centered activity setup.</p><nav aria-label="Continents">{editingOrder === 'world' ? <InlineOrderEditor entries={worldOrder} getId={continent => continent} getLabel={continent => continent} onItemHover={continent => onHoverGroup(getContinentHoverGroupId(continent))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftWorldOrder(draft)} onSave={draft => onSaveWorldOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getContinents(entries)} /> : <ol className="space-y-1.5">{worldOrder.map((continent, index) => <GeographyHierarchyRow key={continent} label={continent} sequenceNumber={index + 1} secondary={formatContinentSummary(continent, entries)} groupId={getContinentHoverGroupId(continent)} hoveredGroupId={hoveredGroupId} onClick={() => onSelectContinent(continent)} onHoverGroup={onHoverGroup} />)}</ol>}</nav></WorldCountriesPanel> : <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-drill-scope-heading"><GeographyBreadcrumbs items={[{ label: 'World', onSelect: onWorld }, { label: selection.continent, current: true }]} /><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{selection.continent}</p><div className="mt-1 flex items-center justify-between gap-3"><h3 id="world-countries-drill-scope-heading" className="text-lg font-bold text-zinc-100">Geography</h3>{editingOrder !== 'continent' && subregions.length > 1 && <button type="button" onClick={() => onBeginOrderEdit('continent')} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button>}</div><p className="mt-1 text-sm text-zinc-400">Select Subregions from the rail or map.</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"><div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-zinc-500">Scope</span><span className="text-right font-semibold text-zinc-200">{selectedCount} {selectedCount === 1 ? 'Subregion' : 'Subregions'} selected</span></div><button type="button" aria-pressed={entireContinent} onClick={onSelectEntireContinent} className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${entireContinent ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-cyan-600'}`}><span className="block font-semibold">Entire Continent</span><span className="mt-1 block text-xs text-zinc-500">All currently defined Subregions</span></button></div><nav aria-label={`${selection.continent} Subregions`}>{editingOrder === 'continent' ? <InlineOrderEditor entries={subregions} getId={subregion => subregion.id} getLabel={subregion => subregion.label} onItemHover={subregion => onHoverGroup(getSubregionHoverGroupId(subregion.label))} onItemLeave={() => onHoverGroup(null)} onDraftChanged={draft => onDraftSubregionOrder(draft)} onSave={draft => onSaveSubregionOrder(draft)} onCancel={onCancelOrderEdit} onResetCanonical={() => getSubregionDefinitionsForContinent(selection.continent, entries)} autoOrder={{ label: 'Auto-order from map', pendingLabel: 'Reading map…', hint: 'Best effort; review before saving.', errorMessage: 'Map auto-ordering was unavailable. The draft is unchanged.', run: draft => sortSubregionsByMemoMapPosition(selection.continent, draft) }} /> : <ol className="space-y-1.5">{subregions.map((subregion, index) => <GeographyHierarchyRow key={subregion.id} label={subregion.label} sequenceNumber={index + 1} secondary={formatCount(getCountriesForSubregion(selection.continent, subregion.id, entries).length, 'Country', 'Countries')} groupId={getSubregionHoverGroupId(subregion.label)} hoveredGroupId={hoveredGroupId} onClick={() => onToggleSubregion(subregion.id)} onHoverGroup={onHoverGroup} selected={selection.subregionIds.includes(subregion.id)} />)}</ol>}</nav>{selectedCount === 0 && <p className="text-sm text-amber-300" role="alert">Select at least one Subregion to start.</p>}</WorldCountriesPanel>}
    </section>,
    right: <ActivityPurposePanel purpose={purpose} groupName={purposeGroupName} onChange={onPurposeChange}>{purpose === 'drill' ? <CurrentDrillPanel level={level} mode={mode} order={order} groupName={modeGroupName} onModeChange={onModeChange} onOrderChange={onOrderChange} canStart={level === 'continent' && selectedCount > 0} onStart={onStart} /> : purpose === 'learn-practise' ? <LearnPracticePanel selectedCount={selectedCount} level={level} selectedStates={selectedStates} countriesIncomplete={countriesIncomplete} mode={learnPracticeMode} onModeChange={onLearnPracticeModeChange} onStart={onLearnPracticeStart} /> : null}</ActivityPurposePanel>,
    leftLabel: 'Geography', rightLabel: purpose === 'drill' ? 'Drill' : purpose === 'learn-practise' ? 'Learn & Practise' : 'Choose activity',
  }, [countriesIncomplete, editingOrder, entries, hoveredGroupId, learningReadinessBySubregion, learningStates, level, learnPracticeMode, mode, modeGroupName, onBeginOrderEdit, onCancelOrderEdit, onDraftSubregionOrder, onDraftWorldOrder, onHoverGroup, onLearnPracticeModeChange, onLearnPracticeStart, onModeChange, onOrderChange, onPurposeChange, onSaveSubregionOrder, onSaveWorldOrder, onSelectContinent, onSelectEntireContinent, onStart, onToggleSubregion, onWorld, order, purpose, purposeGroupName, selectedCount, selectedStates, selection.continent, selection.subregionIds, subregions, subregionOrder, worldOrder])
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

function CurrentDrillPanel({ level, mode, order, groupName, onModeChange, onOrderChange, canStart, onStart }: { level: 'world' | 'continent'; mode: WorldCountriesDrillMode; order: WorldCountriesDrillOrder; groupName: string; onModeChange: (mode: WorldCountriesDrillMode) => void; onOrderChange: (order: WorldCountriesDrillOrder) => void; canStart: boolean; onStart: () => void }) {
  return <section className="space-y-4" aria-labelledby="world-countries-current-drill-heading"><h2 id="world-countries-current-drill-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill mode</h2><div><fieldset className="space-y-2">{WORLD_COUNTRIES_DRILL_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}</fieldset></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Drill order</h3><div className="inline-flex rounded-md border border-zinc-800 bg-zinc-950/60 p-0.5" role="radiogroup" aria-label="Drill order"><OrderOption order="ordered" selected={order === 'ordered'} onSelect={onOrderChange}>In order</OrderOption><OrderOption order="random" selected={order === 'random'} onSelect={onOrderChange}>Random</OrderOption></div></div></div><button type="button" disabled={!canStart} onClick={onStart} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? 'Start Drill' : getSelectionPrompt(level)}</button></section>
}

function LearnPracticePanel({ level, selectedCount, selectedStates, countriesIncomplete, mode, onModeChange, onStart }: { level: 'world' | 'continent'; selectedCount: number; selectedStates: readonly (SubregionLearningState | undefined)[]; countriesIncomplete: boolean; mode: WorldCountriesLearnPracticeMode; onModeChange: (mode: WorldCountriesLearnPracticeMode) => void; onStart: (mode: WorldCountriesLearnPracticeMode) => void }) {
  const learning = isWorldCountriesLearningMode(mode)
  const groupName = `world-countries-learn-practice-${useId()}`
  const canStart = level === 'continent' && selectedCount > 0
  return <section className="space-y-3" aria-labelledby="world-countries-learn-practice-heading"><h2 id="world-countries-learn-practice-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learn &amp; Practise</h2><div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Learning</p>{WORLD_COUNTRIES_LEARNING_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}<p className="pt-2 text-xs font-semibold uppercase tracking-wider text-violet-400">Practice</p>{WORLD_COUNTRIES_PRACTICE_MODES.map(candidate => <ModeOption key={candidate.id} candidate={candidate} selected={candidate.id === mode} onSelect={onModeChange} groupName={groupName} />)}</div>{mode === 'learn-capitals' && countriesIncomplete && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200" role="note">Recommendation: Learn Countries first for this selection. Learn Capitals is available now and will record Capitals learned, while Learning Readiness remains Not learned until Countries learning is complete.</p>}{learning && selectedCount > 1 && <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-relaxed text-zinc-400" role="note">Learning is recommended one Subregion at a time. Continue will work through the selected Subregions in effective geographic order.</p>}{!learning && <p className="text-xs leading-relaxed text-zinc-500">Practice is non-recording: it never changes Learning Readiness, evidence, Drill proficiency, or preferences.</p>}<button type="button" disabled={!canStart} onClick={() => onStart(mode)} className="w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">{canStart ? `Start ${learning ? 'Learning' : 'Practice'}` : getSelectionPrompt(level)}</button></section>
}

function getSelectionPrompt(level: 'world' | 'continent'): string {
  return level === 'world' ? 'Choose a Continent first' : 'Choose at least one Subregion'
}

type ModeOption<T extends string> = { id: T; label: string; description: string }
function ModeOption<T extends string>({ candidate, selected, onSelect, groupName }: { candidate: ModeOption<T>; selected: boolean; onSelect: (mode: T) => void; groupName: string }) {
  const descriptionId = `${useId()}-description`
  return <label className={`flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-within:ring-2 focus-within:ring-cyan-400/70 ${selected ? 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'}`}><input type="radio" name={groupName} value={candidate.id} checked={selected} onChange={() => onSelect(candidate.id)} aria-describedby={descriptionId} className="sr-only" />{selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}<span className="min-w-0 flex-1 font-semibold">{candidate.label}</span><span className="group relative shrink-0"><span tabIndex={0} aria-label={`Explain ${candidate.label} mode`} aria-describedby={descriptionId} title={candidate.description} className="flex h-5 w-5 cursor-help items-center justify-center rounded-full text-sm text-zinc-500 hover:bg-zinc-800 hover:text-cyan-300">ⓘ</span><span id={descriptionId} role="tooltip" className="pointer-events-none invisible absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{candidate.description}</span></span></label>
}

function OrderOption({ order, selected, onSelect, children }: { order: WorldCountriesDrillOrder; selected: boolean; onSelect: (order: WorldCountriesDrillOrder) => void; children: string }) { return <button type="button" role="radio" aria-checked={selected} onClick={() => onSelect(order)} className={`min-w-[4.25rem] rounded px-2 py-1 text-xs font-semibold ${selected ? 'bg-cyan-600/40 text-cyan-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{children}</button> }
function formatContinentSummary(continent: Continent, entries: readonly Country[]): string { const subregionCount = getSubregionsForContinentInEffectiveOrder(continent, entries, getContinentMetadata(continent)).length; const countryCount = getCountriesForContinent(continent, entries).length; return `${formatCount(subregionCount, 'Subregion', 'Subregions')} · ${formatCount(countryCount, 'Country', 'Countries')}` }
function formatCount(count: number, singular: string, plural: string): string { return `${count} ${count === 1 ? singular : plural}` }
