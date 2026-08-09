import type { AnswerMode } from '@/core/types'

/** Structural entry point for deliberate, user-selected World Countries practice. */
export function WorldCountriesDrill({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-drill-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Drill</p>
        <h1 id="world-countries-drill-heading" className="mt-1 text-2xl font-bold text-zinc-100">Deliberate practice</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Choose a set of countries, locations, or capitals to practise deliberately. Drill mechanics will be added here.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 text-sm text-zinc-500">
        Select a practice scope when targeted World Countries drills are available.
      </div>
    </section>
  )
}
