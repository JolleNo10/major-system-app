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
import type { CountryLearningPhase } from '@/features/world-countries/learning/countryLearningFlow'
import type { CapitalLearningPhase } from '@/features/world-countries/learning/capitalLearningFlow'

export function GuidedLearningRails({
  continent,
  subregion,
  entries,
  activeCountries,
  phase,
  track,
  learned,
  capitalsLearned,
  mnemonicVersion,
  walkthroughCountryId,
  onGeographyChanged,
  onMnemonicChanged,
  onOrderDraftChanged,
  onOrderSaved,
  onExit,
  onSkip,
  skipLabel,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  activeCountries: readonly Country[]
  phase: CountryLearningPhase | CapitalLearningPhase
  track: 'countries' | 'capitals'
  learned: boolean
  capitalsLearned: boolean
  mnemonicVersion: number
  walkthroughCountryId?: string | null
  onGeographyChanged: () => void
  onMnemonicChanged: () => void
  onOrderDraftChanged: (draft: readonly Country[] | null) => void
  onOrderSaved?: (draft: readonly Country[]) => void
  onExit?: () => void
  onSkip?: () => void
  skipLabel?: string
}) {
  const quietPhase = phase === 'location-practice' || phase === 'ordered-recall' || phase === 'recall' || phase === 'complete'
  const walkthroughCountry = walkthroughCountryId ? entries.find(entry => entry.id === walkthroughCountryId) ?? null : null
  const showSubregionMnemonic = !quietPhase
  const showCapitalMnemonic = !quietPhase && track === 'capitals' && phase === 'walkthrough' && walkthroughCountry !== null
  const showMemoryAid = showSubregionMnemonic || showCapitalMnemonic
  const [editingOrder, setEditingOrder] = useState(false)
  const [editingMnemonic, setEditingMnemonic] = useState(false)

  useEffect(() => {
    if (!quietPhase) return
    onOrderDraftChanged(null)
    setEditingOrder(false)
    setEditingMnemonic(false)
  }, [onOrderDraftChanged, quietPhase])

  const saveOrder = (draft: readonly Country[]) => {
    saveSubregionCountryOrder(subregion, draft.map(entry => entry.id), activeCountries)
    onOrderDraftChanged([...draft])
    onOrderSaved?.(draft)
    onGeographyChanged()
    setEditingOrder(false)
  }
  const cancelOrder = () => {
    onOrderDraftChanged(null)
    setEditingOrder(false)
  }

  useRails(
    {
      left: quietPhase ? undefined : (
        <section className="space-y-4" aria-labelledby="world-countries-guided-context-heading">
          <nav aria-label="World Countries hierarchy" className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500">World</span><span className="text-zinc-700">/</span><span className="text-zinc-500">{continent}</span><span className="text-zinc-700">/</span><span className="text-cyan-300">{getSubregionDefinition(subregion).label}</span>
          </nav>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Learning</p>
            <h2 id="world-countries-guided-context-heading" className="mt-1 text-lg font-bold text-zinc-100">Learning context</h2>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Learning Readiness</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">{getWorldCountriesLearningReadinessLabel(deriveWorldCountriesLearningReadiness({ subregionId: subregion, ...(track === 'countries' && learned ? { countriesLearnedAt: 1 } : {}), ...(track === 'capitals' && capitalsLearned ? { capitalsLearnedAt: 1 } : {}) }))}</p>
          </div>
          <section aria-labelledby="guided-learning-order-heading">
            <div className="flex items-center justify-between gap-3">
              <h3 id="guided-learning-order-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning order</h3>
              {!editingOrder && entries.length > 1 && <button type="button" onClick={() => setEditingOrder(true)} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">Edit order</button>}
            </div>
            {editingOrder ? (
              <InlineOrderEditor
                entries={entries}
                getId={entry => entry.id}
                getLabel={entry => entry.country}
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
          {showSubregionMnemonic && <button type="button" onClick={() => setEditingMnemonic(value => !value)} className="text-left text-xs font-semibold text-cyan-300 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70">{editingMnemonic ? 'Close mnemonic editor' : 'Edit mnemonics'}</button>}
        </section>
      ),
      right: showMemoryAid || onExit || onSkip ? (
        <div className="space-y-4">
          {(onExit || onSkip) && <section aria-labelledby="guided-learning-actions-heading" className="space-y-2"><h3 id="guided-learning-actions-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Learning actions</h3>{onExit && <button type="button" onClick={onExit} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Exit</button>}{onSkip && <button type="button" onClick={onSkip} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-400 hover:border-cyan-500 hover:text-zinc-200">{skipLabel ?? 'Skip'}</button>}</section>}
          {showSubregionMnemonic && (editingMnemonic ? <GeographyMnemonicEditor targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} refreshKey={mnemonicVersion} onChanged={onMnemonicChanged} /> : <GeographyMnemonicView targetId={subregionMnemonicId(subregion)} title="Subregion memory aid" subtitle={`Optional story or picture for this ordered ${entries.length}-country group`} countryIds={entries.map(entry => entry.id)} refreshKey={mnemonicVersion} />)}
          {showCapitalMnemonic && walkthroughCountry && <GeographyMnemonicView targetId={countryCapitalMnemonicId(walkthroughCountry)} title={`${walkthroughCountry.country} ↔ ${walkthroughCountry.capital}`} subtitle="Optional memory aid for this Country–Capital relationship" refreshKey={`${walkthroughCountry.id}-${mnemonicVersion}`} />}
        </div>
      ) : undefined,
      leftLabel: 'Learning context',
      rightLabel: showMemoryAid && (onExit || onSkip) ? 'Learning tools' : showMemoryAid ? 'Memory aid' : onExit || onSkip ? 'Learning actions' : undefined,
    },
    [activeCountries, continent, editingMnemonic, editingOrder, entries, learned, capitalsLearned, mnemonicVersion, onExit, onGeographyChanged, onMnemonicChanged, onOrderDraftChanged, onOrderSaved, onSkip, phase, showCapitalMnemonic, showMemoryAid, showSubregionMnemonic, skipLabel, subregion, track, walkthroughCountry, quietPhase],
  )

  return null
}
