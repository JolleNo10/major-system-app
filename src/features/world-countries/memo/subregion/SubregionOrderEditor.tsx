import { useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import { countryId } from '@/features/world-countries/learning'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { resetSubregionCountryOrder, setSubregionCountryOrder } from '@/features/world-countries/subregions/subregionMetadataStore'

export function SubregionOrderEditor({
  subregion,
  entries,
  onChanged,
  onClose,
}: {
  subregion: SubregionId
  entries: readonly Country[]
  onChanged: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(() => [...entries])

  const move = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= draft.length) return
    setDraft(current => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const save = () => {
    setSubregionCountryOrder(subregion, draft.map(countryId))
    onChanged()
    onClose()
  }

  const reset = () => {
    resetSubregionCountryOrder(subregion)
    onChanged()
    onClose()
  }

  return (
    <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4" aria-labelledby="order-editor-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="order-editor-heading" className="font-semibold text-zinc-100">Edit learning order</h3>
          <p className="mt-1 text-xs text-zinc-500">This order is shared by Memo and future Recite workflows.</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-200">Close</button>
      </div>
      <ol className="mt-4 space-y-2">
        {draft.map((country, index) => (
          <li key={countryId(country)} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
            <span className="w-6 text-xs tabular-nums text-zinc-600">{index + 1}.</span>
            <span className="min-w-0 flex-1 text-sm text-zinc-300">{country.country}</span>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${country.country} up`} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 enabled:hover:border-cyan-500 disabled:opacity-30">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === draft.length - 1} aria-label={`Move ${country.country} down`} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 enabled:hover:border-cyan-500 disabled:opacity-30">↓</button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Save order</button>
        <button type="button" onClick={reset} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500">Reset canonical order</button>
      </div>
    </section>
  )
}
