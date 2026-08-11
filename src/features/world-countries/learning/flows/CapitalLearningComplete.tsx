import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'

export function CapitalLearningComplete({ subregion, onDone, onRestart }: { subregion: SubregionId; onDone: () => void; onRestart: () => void }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">Capitals learned</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{getSubregionDefinition(subregion).label} capitals complete ✓</h1>
      </header>
      <section className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <p className="text-sm leading-relaxed text-green-200">You recalled the capital for every country in {getSubregionDefinition(subregion).label} in one clean shuffled round. This initial-learning result is now recorded for the Subregion.</p>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDone} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Back to Subregion</button>
        <button type="button" onClick={onRestart} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500">Review again</button>
      </div>
    </div>
  )
}
