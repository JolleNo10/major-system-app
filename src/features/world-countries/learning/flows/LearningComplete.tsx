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
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-green-400"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]" />{eyebrow}</div>
      {!surface && <h1 className="mt-1 text-lg font-bold text-zinc-100">{title}</h1>}
      <div className="mt-1 text-sm text-zinc-200">{summary}</div>
      <div className="mt-0.5 max-w-[360px] text-xs text-zinc-400">The map remains available for context while you choose what to do next.</div>
    </div>
  )
  const dock = (
    <TaskDock variant="completion" status={status} tone="ready" enableEnterPrimary>
      <div className="flex w-full gap-2 xl:w-auto">
        <button type="button" data-primary-action onClick={onDone} className="flex-1 whitespace-nowrap rounded-[9px] border border-cyan-600 bg-cyan-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 xl:flex-none">{doneLabel}<span aria-label="Enter" className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-[5px] border border-white/25 border-b-2 px-1.5 py-px text-[11px]">↵</span></button>
        <button type="button" onClick={onRestart} className="flex-1 whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 hover:border-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 xl:flex-none">{restartLabel}</button>
      </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in">{dock}</div>
}
