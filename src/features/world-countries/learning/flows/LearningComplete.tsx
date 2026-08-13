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
  const dock = (
    <TaskDock variant="completion" status={<span className="text-green-300">✓ {summary}</span>} tone="ready" enableEnterPrimary>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-400">{eyebrow}</p>
          <h1 className="mt-1 text-lg font-bold text-zinc-100">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-primary-action onClick={onDone} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">{doneLabel}</button>
          <button type="button" onClick={onRestart} className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">{restartLabel}</button>
        </div>
      </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in">{dock}</div>
}
