import { useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { Continent } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { CountryLearningMap } from './CountryLearningMap'
import { MemoMnemonicCard } from '../MemoMnemonicCard'
import { SubregionOrderEditor } from './SubregionOrderEditor'

export function SubregionOverview({
  continent,
  subregion,
  entries,
  learned,
  onStart,
  onOrderChanged,
}: {
  continent: Continent
  subregion: SubregionId
  entries: readonly Country[]
  learned: boolean
  onStart: () => void
  onOrderChanged: () => void
}) {
  const [editingOrder, setEditingOrder] = useState(false)
  const [mnemonicVersion, setMnemonicVersion] = useState(0)
  const definition = getSubregionDefinition(subregion)
  const ids = entries.map(country => country.id)

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Subregion</p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">{definition.label}</h1>
            <p className="mt-1 text-sm text-zinc-500">{entries.length} countries · {continent}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${learned ? 'bg-green-500/15 text-green-300' : 'bg-zinc-800 text-zinc-400'}`}>
            {learned ? 'Countries learned ✓' : 'Countries not learned'}
          </span>
        </div>
      </section>

      <CountryLearningMap
        continent={continent}
        scopeCountries={entries}
        ariaLabel={`Map of ${definition.label}`}
      />

      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-100">Countries</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {learned ? 'The ordered country recall is complete. You can review it whenever you like.' : 'Learn the countries and their locations.'}
            </p>
          </div>
          <button type="button" onClick={onStart} disabled={entries.length === 0} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
            {learned ? 'Review countries' : 'Start learning countries'}
          </button>
        </div>
      </section>

      {editingOrder ? (
        <SubregionOrderEditor subregion={subregion} entries={entries} onChanged={onOrderChanged} onClose={() => setEditingOrder(false)} />
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-labelledby="learning-order-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="learning-order-heading" className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Learning order</h2>
            <button type="button" onClick={() => setEditingOrder(true)} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-500">Edit order</button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">{entries.map(country => country.country).join(' → ')}</p>
        </section>
      )}

      <MemoMnemonicCard
        targetId={subregionMnemonicId(subregion)}
        title="Subregion memory aid"
        subtitle={`Optional story or picture for this ordered ${ids.length}-country group`}
        countryIds={ids}
        refreshKey={mnemonicVersion}
        onChanged={() => setMnemonicVersion(value => value + 1)}
      />

      <p className="px-1 text-xs text-zinc-600">Capitals are a later learning stage. Country–Capital reference remains available when that stage is designed.</p>
    </div>
  )
}
