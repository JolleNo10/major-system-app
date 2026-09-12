import type { ReactNode } from 'react'
import { TaskDockMessage } from '@/features/world-countries/ui/TaskDockMessage'

export interface LearningCompletionHandoff {
  description: string
  label: string
  onContinue: () => void
  stopLabel?: string
  onStop?: () => void
}

export type LearningMasteryStatus = 'building' | 'mastered'

export interface LearningRegionCompletion {
  masteryStatus: LearningMasteryStatus
}

export interface LearningCompletedRegionAction {
  label: string
  onAction: () => void
}

export interface LearningCompleteProps {
  eyebrow: string
  title: string
  summary: ReactNode
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  restartLabel?: string
  completionHandoff?: LearningCompletionHandoff
  regionCompletion?: LearningRegionCompletion
  completedRegionAction?: LearningCompletedRegionAction
  regionLabel?: string
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
  completionHandoff,
  regionCompletion,
  completedRegionAction,
  regionLabel,
  surface = false,
}: LearningCompleteProps) {
  const isCompletedRegion = Boolean(regionCompletion && regionLabel)
  const completionAction = isCompletedRegion ? completedRegionAction : undefined
  const header = (
    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-green-400">
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]" />
      {isCompletedRegion ? 'Region learned' : eyebrow}
    </div>
  )
  const description = isCompletedRegion
    ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-zinc-100">{regionLabel} ✓</span>
        <span>Countries ✓</span>
        <span>Capitals ✓</span>
        <span>Mastery {regionCompletion?.masteryStatus === 'mastered' ? 'Mastered' : 'Building'}</span>
        {completionHandoff && <span className="text-violet-200">{completionHandoff.description}</span>}
      </div>
    )
    : (
      <div className="space-y-1">
        {!surface && <h1 className="text-lg font-bold text-zinc-100">{title}</h1>}
        <div>{summary}</div>
        {completionHandoff && <div className="text-violet-200">{completionHandoff.description}</div>}
      </div>
    )
  const actions = (
    <>
      <button type="button" data-primary-action onClick={completionHandoff?.onContinue ?? onDone} className="whitespace-nowrap rounded-[9px] border border-violet-500 bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{completionHandoff?.label ?? doneLabel}<span aria-label="Enter" className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-[5px] border border-white/25 border-b-2 px-1.5 py-px text-[11px]">↵</span></button>
      {completionHandoff?.onStop && completionHandoff.stopLabel && <button type="button" data-completion-stop onClick={completionHandoff.onStop} className="whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{completionHandoff.stopLabel}</button>}
      {!isCompletedRegion && <button type="button" data-completion-restart onClick={onRestart} className={`whitespace-nowrap rounded-[9px] border border-zinc-600 px-3.5 py-2.5 text-sm text-zinc-300 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${completionHandoff?.onStop ? 'bg-transparent text-xs' : 'bg-zinc-800'}`}>{restartLabel}</button>}
      {completionAction && <button type="button" data-completion-region-action onClick={completionAction.onAction} className="whitespace-nowrap rounded-[9px] border border-zinc-600 bg-transparent px-3.5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{completionAction.label}</button>}
    </>
  )
  const dock = <TaskDockMessage variant="completion" header={header} description={description} actions={<div data-completion-actions className="flex flex-wrap items-center gap-2">{actions}</div>} tone="ready" enableEnterPrimary />
  return surface ? dock : <div className="space-y-4 animate-fade-in">{dock}</div>
}
