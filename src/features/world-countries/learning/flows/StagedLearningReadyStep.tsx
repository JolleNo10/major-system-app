import { LearningHeader } from './MemoryPreviewStep'
import { TaskDockMessage } from '@/features/world-countries/ui/TaskDockMessage'

function EnterKey() {
  return <span aria-label="Enter" className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-[5px] border border-white/25 border-b-2 px-1.5 py-px text-[11px]">↵</span>
}

export function StagedLearningReadyStep({
  title,
  summary,
  nextDescription,
  nextLabel,
  onNext,
  onKeepPractising,
  onBack,
  onExit,
  surface = false,
}: {
  title: string
  summary: string
  nextDescription: string
  nextLabel: string
  onNext: () => void
  onKeepPractising: () => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const dock = (
    <TaskDockMessage
      variant="checkpoint"
      tone="ready"
      focusPrimary
      enableEnterPrimary
      header={<div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-green-400"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]" />{title}</div>}
      description={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-lg font-bold text-zinc-100">{summary}</span><span className="text-xs text-zinc-400">{nextDescription}</span></div>}
      actions={<><button type="button" onClick={onKeepPractising} className="whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 hover:border-violet-400">Keep practising</button><button type="button" data-primary-action onClick={onNext} className="whitespace-nowrap rounded-[9px] border border-violet-500 bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{nextLabel}<EnterKey /></button>{!surface && <button type="button" onClick={onBack} className="whitespace-nowrap rounded-[9px] border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back</button>}</>}
    />
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in"><LearningHeader label="Ready" title={title} onExit={onExit} />{dock}</div>
}

export function FinalRecallGate({
  ready,
  onStart,
  onKeepPractising,
  onBack,
  onExit,
  surface = false,
}: {
  ready: boolean
  onStart: () => void
  onKeepPractising: () => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const description = ready ? "One last pass through everything you've been learning." : "Try the full recall when you're ready."
  const nextDescription = ready
    ? 'Recall the whole Learning order from start to finish.'
    : 'You can start now, or go back for more practice.'
  const dock = (
    <TaskDockMessage
      variant="checkpoint"
      tone={ready ? 'ready' : 'neutral'}
      focusPrimary
      enableEnterPrimary
      header={<div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] ${ready ? 'text-green-400' : 'text-zinc-400'}`}><span aria-hidden="true" className={ready ? 'h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]' : 'h-2 w-2 shrink-0 rounded-full border border-zinc-500'} />Final recall</div>}
      description={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="text-lg font-bold text-zinc-100">{description}</span><span className="text-xs text-zinc-400">{nextDescription}</span></div>}
      actions={<>{ready && <button type="button" onClick={onKeepPractising} className="whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 hover:border-violet-400">Keep practising</button>}<button type="button" data-primary-action onClick={onStart} className="whitespace-nowrap rounded-[9px] border border-violet-500 bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">Start final recall<EnterKey /></button>{!surface && <button type="button" onClick={onBack} className="whitespace-nowrap rounded-[9px] border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200">Back</button>}</>}
    />
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in"><LearningHeader label="Final recall" title="Final recall" onExit={onExit} />{dock}</div>
}
