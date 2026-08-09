import type { AnswerMode } from '@/core/types'

/** Structural entry point for system-directed review selection. */
export function WorldCountriesMaintenance({ answerMode: _answerMode }: { answerMode: AnswerMode }) {
  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-maintenance-heading">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Maintenance</p>
        <h1 id="world-countries-maintenance-heading" className="mt-1 text-2xl font-bold text-zinc-100">What needs review?</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Maintenance will select learned material that needs reinforcement and recommend the right activity.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 text-sm text-zinc-500">
        Review scheduling is not configured yet.
      </div>
    </section>
  )
}
