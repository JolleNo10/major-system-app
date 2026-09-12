import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { saveSubregionCountryOrder } from '@/features/world-countries/geography/orderAuthoring'
import { sortCountriesByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { GeographyMnemonicEditor } from '@/features/world-countries/mnemonics/GeographyMnemonicEditor'
import { GeographyMnemonicView } from '@/features/world-countries/mnemonics/GeographyMnemonicView'
import { CountryCapitalMnemonicPanel } from '@/features/world-countries/mnemonics/CountryCapitalMnemonicPanel'
import type { LearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'
import { InlineOrderEditor, type InlineOrderClickState } from '@/features/world-countries/ui/InlineOrderEditor'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { formatLearningScopeCount, type LearningStagePresentation } from '@/features/world-countries/learning/stagedLearningPlan'
import type { StagedCountryLearningPhase } from '@/features/world-countries/learning/stagedCountryLearningFlow'
import type { StagedCapitalLearningPhase } from '@/features/world-countries/learning/stagedCapitalLearningFlow'

export function GuidedLearningRails({
  continent,
  subregion,
  scopeLabel,
  entries,
  activeCountries,
  stagePresentation,
  phase,
  track,
  walkthroughCountryId,
  onCountryHover = () => undefined,
  onOrderDraftChanged,
  onOrderEditingChange,
  onOrderSaved,
  onClickOrderStateChange,
  onClickOrderToggle,
  onExit,
  onBack,
  backLabel = 'Back',
  onSkip,
  skipLabel,
  practiceProgress: _practiceProgress,
}: {
  continent: Continent
  subregion?: SubregionId
  scopeLabel?: string
  entries: readonly Country[]
  activeCountries: readonly Country[]
  stagePresentation: LearningStagePresentation<Country['id']> | null
  phase: StagedCountryLearningPhase | StagedCapitalLearningPhase
  track: 'countries' | 'capitals'
  walkthroughCountryId?: string | null
  onCountryHover?: (countryId: string | null) => void
  onOrderDraftChanged: (draft: readonly Country[] | null) => void
  onOrderEditingChange?: (editing: boolean) => void
  onOrderSaved?: (draft: readonly Country[]) => void
  onClickOrderStateChange?: (state: InlineOrderClickState) => void
  onClickOrderToggle?: (toggle: ((countryId: string) => void) | null) => void
  onExit?: () => void
  onBack?: () => void
  backLabel?: string
  onSkip?: () => void
  skipLabel?: string
  practiceProgress?: LearningPracticeProgress | null
}) {
  const walkthroughPhase = phase === 'walkthrough'
  const completePhase = phase === 'complete'
  const finalPhase = phase === 'final-gate' || phase === 'final-recall'
  const clearsAuthoring = !walkthroughPhase
  const walkthroughCountry = walkthroughCountryId ? entries.find(entry => entry.id === walkthroughCountryId) ?? null : null
  const learningScopeLabel = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const currentSetIds = useMemo(() => new Set(stagePresentation?.currentSetIds ?? []), [stagePresentation])
  const previousSetIds = useMemo(() => new Set(stagePresentation?.previousSetIds ?? []), [stagePresentation])
  const introducedIds = useMemo(() => new Set(stagePresentation?.kind === 'combined' ? stagePresentation.scopeIds : []), [stagePresentation])
  const showSubregionMnemonic = walkthroughPhase && subregion !== undefined
  const showCapitalMnemonic = walkthroughPhase && track === 'capitals' && walkthroughCountry !== null
  const showMemoryAid = showSubregionMnemonic || showCapitalMnemonic
  const [editingOrder, setEditingOrder] = useState(false)
  const [editingMnemonic, setEditingMnemonic] = useState<'subregion' | 'country-capital' | null>(null)

  useEffect(() => {
    if (!clearsAuthoring) return
    onOrderDraftChanged(null)
    onCountryHover(null)
    setEditingOrder(false)
    onOrderEditingChange?.(false)
    onClickOrderStateChange?.({ active: false, positions: new Map() })
    onClickOrderToggle?.(null)
    setEditingMnemonic(null)
  }, [clearsAuthoring, onClickOrderStateChange, onClickOrderToggle, onCountryHover, onOrderDraftChanged, onOrderEditingChange])

  const beginOrderEdit = useCallback(() => {
    setEditingOrder(true)
    onOrderEditingChange?.(true)
  }, [onOrderEditingChange])

  const saveOrder = useCallback((draft: readonly Country[]) => {
    if (!subregion) return
    saveSubregionCountryOrder(subregion, draft.map(entry => entry.id), activeCountries)
    onOrderDraftChanged([...draft])
    onOrderSaved?.(draft)
    onCountryHover(null)
    setEditingOrder(false)
    onOrderEditingChange?.(false)
  }, [activeCountries, onCountryHover, onOrderDraftChanged, onOrderEditingChange, onOrderSaved, subregion])
  const cancelOrder = useCallback(() => {
    onOrderDraftChanged(null)
    onCountryHover(null)
    setEditingOrder(false)
    onOrderEditingChange?.(false)
  }, [onCountryHover, onOrderDraftChanged, onOrderEditingChange])
  const mnemonicAction = useCallback((target: 'subregion') => (
    <button type="button" onClick={() => setEditingMnemonic(current => current === target ? null : target)} className="shrink-0 text-left text-xs font-semibold text-violet-300 hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70">
      {editingMnemonic === target ? 'Close mnemonic editor' : 'Edit mnemonics'}
    </button>
  ), [editingMnemonic])

  const stageKind = stagePresentation?.kind
  const stageLabel = getLearningStageLabel(stagePresentation, track)
  const stageScopeLabel = getLearningStageScopeLabel(stagePresentation, entries.length)
  const walkthroughStageLabel = getWalkthroughStageLabel(stagePresentation, entries.length, track)
  const walkthroughStageScopeLabel = getWalkthroughStageScopeLabel(stagePresentation, entries.length, track)

  const rails = useMemo(() => ({
      left: completePhase ? undefined : walkthroughPhase ? (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">World</span><span className="text-zinc-700">/</span><span className="text-zinc-500">{continent}</span><span className="text-zinc-700">/</span><span className="text-cyan-300">{learningScopeLabel}</span>
          </nav>
          <div data-learning-stage={stageKind ?? 'scope'} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{learningScopeLabel}</p>
            <h2 id="world-countries-guided-context-heading" className="text-lg font-bold text-zinc-100">{track === 'countries' ? 'Meet the countries' : 'Meet the capitals'}</h2>
            <p data-learning-stage-label className="pt-1 text-sm font-semibold text-zinc-200">{walkthroughStageLabel}</p>
            {walkthroughStageScopeLabel && <p data-learning-stage-scope className="text-xs text-zinc-400">{walkthroughStageScopeLabel}</p>}
          </div>
          {!subregion && <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-relaxed text-violet-200">Temporary proficiency scope. Completing this run does not change your guided journey.</p>}
          <LearningOrderSection
            entries={entries}
            activeCountries={activeCountries}
            continent={continent}
            subregion={subregion}
            stageKind={stageKind}
            currentSetIds={currentSetIds}
            previousSetIds={previousSetIds}
            introducedIds={introducedIds}
            walkthroughPhase
            finalPhase={finalPhase}
            editingOrder={editingOrder}
            onBeginOrderEdit={beginOrderEdit}
            onCountryHover={onCountryHover}
            onOrderDraftChanged={onOrderDraftChanged}
            onSaveOrder={saveOrder}
            onCancelOrder={cancelOrder}
            onClickOrderStateChange={onClickOrderStateChange}
            onClickOrderToggle={onClickOrderToggle}
          />
        </WorldCountriesPanel>
      ) : (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">World</span><span className="text-zinc-700">/</span><span className="text-zinc-500">{continent}</span><span className="text-zinc-700">/</span><span id="world-countries-guided-context-heading" className="text-cyan-300">{learningScopeLabel}</span>
          </nav>
          {!subregion && <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-relaxed text-violet-200">Temporary proficiency scope. Completing this run does not change your guided journey.</p>}
          <div role="group" aria-labelledby="guided-learning-stage-heading" data-learning-stage={stageKind ?? 'scope'} className="space-y-1">
            <h2 id="guided-learning-stage-heading" data-learning-stage-label className="text-sm font-semibold text-zinc-100">{stageLabel}</h2>
            {stageScopeLabel && <p data-learning-stage-scope className="text-xs text-zinc-400">{stageScopeLabel}</p>}
          </div>
          <LearningOrderSection
            entries={entries}
            activeCountries={activeCountries}
            continent={continent}
            subregion={subregion}
            stageKind={stageKind}
            currentSetIds={currentSetIds}
            previousSetIds={previousSetIds}
            introducedIds={introducedIds}
            walkthroughPhase={false}
            finalPhase={finalPhase}
            editingOrder={false}
            onBeginOrderEdit={beginOrderEdit}
            onCountryHover={onCountryHover}
            onOrderDraftChanged={onOrderDraftChanged}
            onSaveOrder={saveOrder}
            onCancelOrder={cancelOrder}
            onClickOrderStateChange={onClickOrderStateChange}
            onClickOrderToggle={onClickOrderToggle}
          />
        </WorldCountriesPanel>
      ),
      right: showMemoryAid || onBack || onExit || onSkip ? (
        <div className="space-y-4">
          {(onBack || onExit || onSkip) && <section aria-labelledby="guided-learning-actions-heading" className="space-y-2"><h3 id="guided-learning-actions-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning actions</h3>{onSkip && <button type="button" onClick={onSkip} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">{skipLabel ?? 'Skip'}</button>}{onBack && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">{backLabel}</button>}{onExit && <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Exit</button>}</section>}
          {showSubregionMnemonic && subregion && (editingMnemonic === 'subregion' ? <GeographyMnemonicEditor targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} headerAction={mnemonicAction('subregion')} /> : <GeographyMnemonicView targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} headerAction={mnemonicAction('subregion')} />)}
          {showCapitalMnemonic && walkthroughCountry && <CountryCapitalMnemonicPanel country={walkthroughCountry} />}
        </div>
      ) : undefined,
      leftLabel: walkthroughPhase ? 'Learning' : finalPhase ? 'Learning context' : 'Learning order',
      rightLabel: showMemoryAid && (onBack || onExit || onSkip) ? 'Learning tools' : showMemoryAid ? 'Memory aid' : onBack || onExit || onSkip ? 'Learning actions' : undefined,
    }), [activeCountries, backLabel, beginOrderEdit, cancelOrder, completePhase, continent, currentSetIds, editingMnemonic, editingOrder, entries, finalPhase, introducedIds, learningScopeLabel, mnemonicAction, onBack, onClickOrderStateChange, onClickOrderToggle, onCountryHover, onExit, onOrderDraftChanged, onSkip, previousSetIds, saveOrder, showCapitalMnemonic, showMemoryAid, showSubregionMnemonic, skipLabel, stageKind, stageLabel, stageScopeLabel, subregion, track, walkthroughCountry, walkthroughPhase, walkthroughStageLabel, walkthroughStageScopeLabel])
  useRails(rails)

  return null
}

function LearningOrderSection({
  entries,
  activeCountries,
  continent,
  subregion,
  stageKind,
  currentSetIds,
  previousSetIds,
  introducedIds,
  walkthroughPhase,
  finalPhase,
  editingOrder,
  onBeginOrderEdit,
  onCountryHover,
  onOrderDraftChanged,
  onSaveOrder,
  onCancelOrder,
  onClickOrderStateChange,
  onClickOrderToggle,
}: {
  entries: readonly Country[]
  activeCountries: readonly Country[]
  continent: Continent
  subregion?: SubregionId
  stageKind?: LearningStagePresentation<Country['id']>['kind']
  currentSetIds: ReadonlySet<string>
  previousSetIds: ReadonlySet<string>
  introducedIds: ReadonlySet<string>
  walkthroughPhase: boolean
  finalPhase: boolean
  editingOrder: boolean
  onBeginOrderEdit: () => void
  onCountryHover: (countryId: string | null) => void
  onOrderDraftChanged: (draft: readonly Country[] | null) => void
  onSaveOrder: (draft: readonly Country[]) => void
  onCancelOrder: () => void
  onClickOrderStateChange?: (state: InlineOrderClickState) => void
  onClickOrderToggle?: (toggle: ((countryId: string) => void) | null) => void
}) {
  return <section aria-labelledby="guided-learning-order-heading">
    <div className="flex items-center justify-between gap-3">
      <h3 id="guided-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{finalPhase ? 'Full learning scope' : 'Learning order'}</h3>
      {walkthroughPhase && !editingOrder && subregion && entries.length > 1 && <button type="button" onClick={onBeginOrderEdit} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button>}
    </div>
    {walkthroughPhase && editingOrder ? (
      <InlineOrderEditor
        key={`country-order-${subregion}-${entries.map(entry => entry.id).sort().join('|')}`}
        entries={entries}
        getId={entry => entry.id}
        getLabel={entry => entry.country}
        onItemHover={entry => onCountryHover(entry.id)}
        onItemLeave={() => onCountryHover(null)}
        onDraftChanged={onOrderDraftChanged}
        onSave={onSaveOrder}
        onCancel={onCancelOrder}
        onResetCanonical={() => activeCountries.filter(entry => entry.subregionId === subregion && entry.continent === continent)}
        clickOrder
        onClickOrderStateChange={onClickOrderStateChange}
        onClickOrderToggle={onClickOrderToggle}
        autoOrder={{
          label: 'Auto-order from map',
          pendingLabel: 'Reading map…',
          hint: 'Best effort; review before saving.',
          errorMessage: 'Map auto-ordering was unavailable. The draft is unchanged.',
          run: draft => sortCountriesByMemoMapPosition(continent, draft),
        }}
      />
    ) : (
      <ol className="mt-3 space-y-1.5 text-sm text-zinc-300">{entries.map((entry, index) => {
        const isCurrentSet = stageKind === 'set' && currentSetIds.has(entry.id)
        const isPreviousSet = stageKind === 'set' && previousSetIds.has(entry.id)
        const isIntroduced = stageKind === 'combined' && introducedIds.has(entry.id)
        const isUpcoming = stageKind === 'set' ? !isCurrentSet && !isPreviousSet : stageKind === 'combined' ? !isIntroduced : false
        const setState = stageKind === 'set' ? isCurrentSet ? 'current' : isPreviousSet ? 'previous' : 'upcoming' : stageKind === 'combined' ? isIntroduced ? 'introduced' : 'upcoming' : 'active-scope'
        const scopeDescription = stageKind === 'set' ? isCurrentSet ? 'Current Set' : isPreviousSet ? 'Completed earlier in this Learning pass' : 'Upcoming in this Learning pass' : stageKind === 'combined' ? isIntroduced ? 'Introduced in Mix' : 'Upcoming in Mix' : 'Active in Final recall'
        return <li key={entry.id} data-learning-order-entry data-learning-set={setState} data-learning-set-state={setState} aria-label={`Sequence ${index + 1}: ${entry.country} · ${scopeDescription}`} className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${isCurrentSet || isIntroduced ? 'border border-violet-500/25 bg-violet-500/5 text-zinc-100' : isPreviousSet || isUpcoming ? 'text-zinc-500' : ''}`}><span className={`w-5 shrink-0 text-right text-xs tabular-nums ${isCurrentSet || isIntroduced ? 'text-violet-300' : isPreviousSet || isUpcoming ? 'text-zinc-500' : 'text-zinc-600'}`} aria-label={`Sequence ${index + 1}`}>{index + 1}.</span><span className="min-w-0">{entry.country}</span>{isPreviousSet && <span data-learning-previous-set aria-label="Completed earlier in this Learning pass" className="ml-auto shrink-0 text-xs text-zinc-500">✓</span>}{isCurrentSet && <span data-learning-current-set className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Current Set</span>}</li>
      })}</ol>
    )}
  </section>
}

function getLearningStageLabel(stagePresentation: LearningStagePresentation<Country['id']> | null, track: 'countries' | 'capitals' = 'countries'): string {
  if (!stagePresentation) return 'Learning scope'
  if (stagePresentation.kind === 'set') {
    return stagePresentation.setCount > 1 && stagePresentation.setNumber !== null
      ? `Set ${stagePresentation.setNumber} of ${stagePresentation.setCount}`
      : formatLearningScopeCount(stagePresentation.scopeIds.length, track)
  }
  return stagePresentation.kind === 'combined' ? 'Mix what you\'ve learned' : 'Final recall'
}

function getLearningStageScopeLabel(stagePresentation: LearningStagePresentation<Country['id']> | null, totalCount: number): string | null {
  if (!stagePresentation) return `${totalCount} ${totalCount === 1 ? 'Country' : 'Countries'}`
  if (stagePresentation.kind === 'set') {
    return stagePresentation.setCount > 1
      ? `${stagePresentation.scopeIds.length} of ${totalCount} Countries in this Set`
      : null
  }
  if (stagePresentation.kind === 'combined') return `${stagePresentation.scopeIds.length} of ${totalCount} Countries introduced`
  return `All ${totalCount} ${totalCount === 1 ? 'Country' : 'Countries'}`
}

function getWalkthroughStageLabel(stagePresentation: LearningStagePresentation<Country['id']> | null, totalCount: number, track: 'countries' | 'capitals'): string {
  if (stagePresentation?.kind === 'set' && stagePresentation.setCount === 1) return formatLearningScopeCount(totalCount, track)
  return getLearningStageLabel(stagePresentation)
}

function getWalkthroughStageScopeLabel(stagePresentation: LearningStagePresentation<Country['id']> | null, totalCount: number, track: 'countries' | 'capitals'): string | null {
  if (stagePresentation?.kind === 'set') {
    if (stagePresentation.setCount === 1) return null
    return formatLearningScopeCount(stagePresentation.scopeIds.length, track)
  }
  return getLearningStageScopeLabel(stagePresentation, totalCount)
}
