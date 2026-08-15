import { useEffect, useState } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Continent, Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { saveSubregionCountryOrder } from '@/features/world-countries/geography/orderAuthoring'
import { sortCountriesByMemoMapPosition } from '@/features/world-countries/maps/memoMapOrdering'
import { subregionMnemonicId, countryCapitalMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { GeographyMnemonicEditor } from '@/features/world-countries/mnemonics/GeographyMnemonicEditor'
import { GeographyMnemonicView } from '@/features/world-countries/mnemonics/GeographyMnemonicView'
import { deriveWorldCountriesLearningReadiness, getWorldCountriesLearningReadinessLabel } from '@/features/world-countries/learning/learningReadiness'
import { InlineOrderEditor } from '@/features/world-countries/ui/InlineOrderEditor'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import type { StagedCountryLearningPhase } from '@/features/world-countries/learning/stagedCountryLearningFlow'
import type { StagedCapitalLearningPhase } from '@/features/world-countries/learning/stagedCapitalLearningFlow'

export function GuidedLearningRails({
  continent,
  subregion,
  scopeLabel,
  entries,
  activeCountries,
  phase,
  track,
  learned,
  capitalsLearned,
  mnemonicVersion,
  walkthroughCountryId,
  onGeographyChanged,
  onCountryHover = () => undefined,
  onMnemonicChanged,
  onOrderDraftChanged,
  onOrderEditingChange,
  onOrderSaved,
  onExit,
  onBack,
  backLabel = 'Back',
  onSkip,
  skipLabel,
}: {
  continent: Continent
  subregion?: SubregionId
  scopeLabel?: string
  entries: readonly Country[]
  activeCountries: readonly Country[]
  phase: StagedCountryLearningPhase | StagedCapitalLearningPhase
  track: 'countries' | 'capitals'
  learned: boolean
  capitalsLearned: boolean
  mnemonicVersion: number
  walkthroughCountryId?: string | null
  onGeographyChanged: () => void
  onCountryHover?: (countryId: string | null) => void
  onMnemonicChanged: () => void
  onOrderDraftChanged: (draft: readonly Country[] | null) => void
  onOrderEditingChange?: (editing: boolean) => void
  onOrderSaved?: (draft: readonly Country[]) => void
  onExit?: () => void
  onBack?: () => void
  backLabel?: string
  onSkip?: () => void
  skipLabel?: string
}) {
  const quietPhase = phase === 'location-practice' || phase === 'location-ready' || phase === 'practice' || phase === 'set-ready' || phase === 'combined-practice' || phase === 'combined-ready' || phase === 'final-gate' || phase === 'final-recall' || phase === 'complete'
  const walkthroughCountry = walkthroughCountryId ? entries.find(entry => entry.id === walkthroughCountryId) ?? null : null
  const learningScopeLabel = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const showSubregionMnemonic = !quietPhase && subregion !== undefined
  const showCapitalMnemonic = !quietPhase && track === 'capitals' && phase === 'walkthrough' && walkthroughCountry !== null
  const showMemoryAid = showSubregionMnemonic || showCapitalMnemonic
  const [editingOrder, setEditingOrder] = useState(false)
  const [editingMnemonic, setEditingMnemonic] = useState<'subregion' | 'country-capital' | null>(null)

  useEffect(() => {
    if (!quietPhase) return
    onOrderDraftChanged(null)
    onCountryHover(null)
    setEditingOrder(false)
    onOrderEditingChange?.(false)
    setEditingMnemonic(null)
  }, [onCountryHover, onOrderDraftChanged, onOrderEditingChange, quietPhase])

  const beginOrderEdit = () => {
    setEditingOrder(true)
    onOrderEditingChange?.(true)
  }

  const saveOrder = (draft: readonly Country[]) => {
    if (!subregion) return
    saveSubregionCountryOrder(subregion, draft.map(entry => entry.id), activeCountries)
    onOrderDraftChanged([...draft])
    onOrderSaved?.(draft)
    onGeographyChanged()
    setEditingOrder(false)
    onOrderEditingChange?.(false)
  }
  const cancelOrder = () => {
    onOrderDraftChanged(null)
    setEditingOrder(false)
    onOrderEditingChange?.(false)
  }
  const mnemonicAction = (target: 'subregion' | 'country-capital') => (
    <button type="button" onClick={() => setEditingMnemonic(current => current === target ? null : target)} className="shrink-0 text-left text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">
      {editingMnemonic === target ? 'Close mnemonic editor' : 'Edit mnemonics'}
    </button>
  )

  useRails(
    {
      left: quietPhase ? undefined : (
        <WorldCountriesPanel className="space-y-4" aria-labelledby="world-countries-guided-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">World</span><span className="text-zinc-700">/</span><span className="text-zinc-500">{continent}</span><span className="text-zinc-700">/</span><span className="text-cyan-300">{learningScopeLabel}</span>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Learning</p>
            <h2 id="world-countries-guided-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Learning context</h2>
          </div>
          {subregion ? <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Learning Readiness</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">{getWorldCountriesLearningReadinessLabel(deriveWorldCountriesLearningReadiness({ subregionId: subregion, ...(track === 'countries' && learned ? { countriesLearnedAt: 1 } : {}), ...(track === 'capitals' && capitalsLearned ? { capitalsLearnedAt: 1 } : {}) }))}</p>
          </div> : <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-relaxed text-violet-200">Temporary proficiency scope. Completing this run does not change Learning Readiness.</p>}
          <section aria-labelledby="guided-learning-order-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="guided-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              {!editingOrder && subregion && entries.length > 1 && <button type="button" onClick={beginOrderEdit} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button>}
            </div>
            {editingOrder ? (
              <InlineOrderEditor
                entries={entries}
                getId={entry => entry.id}
                getLabel={entry => entry.country}
                onItemHover={entry => onCountryHover(entry.id)}
                onItemLeave={() => onCountryHover(null)}
                onDraftChanged={onOrderDraftChanged}
                onSave={saveOrder}
                onCancel={cancelOrder}
                onResetCanonical={() => activeCountries.filter(entry => entry.subregionId === subregion && entry.continent === continent)}
                autoOrder={{
                  label: 'Auto-order from map',
                  pendingLabel: 'Reading map…',
                  hint: 'Best effort; review before saving.',
                  errorMessage: 'Map auto-ordering was unavailable. The draft is unchanged.',
                  run: draft => sortCountriesByMemoMapPosition(continent, draft),
                }}
              />
            ) : (
              <ol className="mt-3 space-y-1.5 text-sm text-zinc-300">{entries.map((entry, index) => <li key={entry.id} className="flex gap-2"><span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600" aria-label={`Sequence ${index + 1}`}>{index + 1}.</span><span>{entry.country}</span></li>)}</ol>
            )}
          </section>
        </WorldCountriesPanel>
      ),
      right: showMemoryAid || onBack || onExit || onSkip ? (
        <div className="space-y-4">
          {(onBack || onExit || onSkip) && <section aria-labelledby="guided-learning-actions-heading" className="space-y-2"><h3 id="guided-learning-actions-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning actions</h3>{onBack && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">{backLabel}</button>}{onSkip && <button type="button" onClick={onSkip} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">{skipLabel ?? 'Skip'}</button>}{onExit && <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Exit</button>}</section>}
          {showSubregionMnemonic && subregion && (editingMnemonic === 'subregion' ? <GeographyMnemonicEditor targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} refreshKey={mnemonicVersion} onChanged={onMnemonicChanged} headerAction={mnemonicAction('subregion')} /> : <GeographyMnemonicView targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} refreshKey={mnemonicVersion} headerAction={mnemonicAction('subregion')} />)}
          {showCapitalMnemonic && walkthroughCountry && (editingMnemonic === 'country-capital' ? <GeographyMnemonicEditor targetId={countryCapitalMnemonicId(walkthroughCountry)} title={`${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}`} subtitle="Optional memory aid for this Country–Capital relationship" refreshKey={`${walkthroughCountry.id}-${mnemonicVersion}`} onChanged={onMnemonicChanged} headerAction={mnemonicAction('country-capital')} /> : <GeographyMnemonicView targetId={countryCapitalMnemonicId(walkthroughCountry)} title={`${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}`} subtitle="Optional memory aid for this Country–Capital relationship" refreshKey={`${walkthroughCountry.id}-${mnemonicVersion}`} headerAction={mnemonicAction('country-capital')} />)}
        </div>
      ) : undefined,
      leftLabel: 'Learning context',
      rightLabel: showMemoryAid && (onBack || onExit || onSkip) ? 'Learning tools' : showMemoryAid ? 'Memory aid' : onBack || onExit || onSkip ? 'Learning actions' : undefined,
    },
    [activeCountries, backLabel, continent, editingMnemonic, editingOrder, entries, learned, learningScopeLabel, capitalsLearned, mnemonicVersion, onBack, onCountryHover, onExit, onGeographyChanged, onMnemonicChanged, onOrderDraftChanged, onOrderEditingChange, onOrderSaved, onSkip, phase, scopeLabel, showCapitalMnemonic, showMemoryAid, showSubregionMnemonic, skipLabel, subregion, track, walkthroughCountry, quietPhase],
  )

  return null
}
