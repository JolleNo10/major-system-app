import type { ReactNode } from 'react'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'

export interface LearningCompleteProps {
  eyebrow: string
  title: string
  summary: ReactNode
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  restartLabel?: string
  surface?: boolean
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
  surface = false,
}: LearningCompleteProps) {
  const status = (
    <>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-300"><span aria-hidden="true">●</span>{eyebrow}</span>
      {!surface && <h1 className="mt-1 text-lg font-bold text-zinc-100">{title}</h1>}
      <span className="mt-1 block text-sm text-zinc-200">{summary}</span>
      <span className="mt-1 block text-xs text-zinc-500">The map remains available for context while you choose what to do next.</span>
    </>
  )
  const dock = (
    <TaskDock variant="completion" status={status} tone="ready" enableEnterPrimary>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" data-primary-action onClick={onDone} className="w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:w-auto">{doneLabel} ↵</button>
        <button type="button" onClick={onRestart} className="w-full rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:w-auto">{restartLabel}</button>
        </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in">{dock}</div>
}
