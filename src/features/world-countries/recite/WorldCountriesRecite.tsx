import type { AnswerMode } from '@/core/types'

/** Structural entry point for complete ordered World Countries recall. */
export function WorldCountriesRecite({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-recite-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Recite</p>
        <h1 id="world-countries-recite-heading" className="mt-1 text-2xl font-bold text-zinc-100">Complete recall</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Select a learned Subregion, Continent, or the World and recall it in its defined order. Recitation mechanics will be added here.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 text-sm text-zinc-500">
        Ordered scope selection will appear here.
      </div>
    </section>
  )
}
