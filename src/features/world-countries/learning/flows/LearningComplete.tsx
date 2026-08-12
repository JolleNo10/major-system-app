import type { ReactNode } from 'react'

export interface LearningCompleteProps {
  eyebrow: string
  title: string
  summary: ReactNode
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  restartLabel?: string
}

/** Shared completion presentation for the Country and Capital learning flows. */
export function LearningComplete({
  eyebrow,
  title,
  summary,
  onDone,
  onRestart,
  doneLabel = 'Back to Learn & Practise',
  restartLabel = 'Learn again',
}: LearningCompleteProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-400">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">{title}</h1>
      </header>
      <section className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <p className="text-sm leading-relaxed text-green-200">{summary}</p>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDone} className="flex-1 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">{doneLabel}</button>
        <button type="button" onClick={onRestart} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">{restartLabel}</button>
      </div>
    </div>
  )
}
