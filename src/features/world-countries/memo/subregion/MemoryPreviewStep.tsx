import { useState } from 'react'
import type { Country } from '@/features/world-countries/data/countries'
import type { SubregionId } from '@/features/world-countries/data/subregions'
import { countryId } from '@/features/world-countries/learning'
import { subregionMnemonicId } from '@/features/world-countries/mnemonics/geographyMnemonicIds'
import { MemoMnemonicCard } from '../MemoMnemonicCard'

export function MemoryPreviewStep({
  subregion,
  entries,
  onStart,
  onExit,
}: {
  subregion: SubregionId
  entries: readonly Country[]
  onStart: () => void
  onExit: () => void
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Memory preview" title="See the structure before recalling it" onExit={onExit} />
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-semibold text-zinc-100">Learning order</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">{entries.map(entry => entry.country).join(' → ')}</p>
        <p className="mt-3 text-xs text-zinc-500">The story and picture are optional. You can begin with the default order.</p>
      </section>
      <MemoMnemonicCard
        targetId={subregionMnemonicId(subregion)}
        title="Your Subregion memory aid"
        subtitle="Optional support for the walkthrough"
        countryIds={entries.map(countryId)}
        refreshKey={refreshKey}
        onChanged={() => setRefreshKey(value => value + 1)}
      />
      <button type="button" onClick={onStart} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Start walkthrough</button>
    </div>
  )
}

export function LearningHeader({ label, title, onExit }: { label: string; title: string; onExit: () => void }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{label}</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{title}</h1>
      </div>
      <button type="button" onClick={onExit} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100">Exit</button>
    </header>
  )
}
