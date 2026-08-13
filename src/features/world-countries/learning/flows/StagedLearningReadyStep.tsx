import { LearningHeader } from './MemoryPreviewStep'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'

function EnterKey() {
  return <span aria-label="Enter" className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-[5px] border border-white/25 border-b-2 px-1.5 py-px text-[11px]">↵</span>
}

export function StagedLearningReadyStep({
  title,
  summary,
  nextLabel,
  onNext,
  onKeepPractising,
  onBack,
  onExit,
  surface = false,
}: {
  title: string
  summary: string
  nextLabel: string
  onNext: () => void
  onKeepPractising: () => void
  onBack: () => void
  onExit: () => void
  surface?: boolean
}) {
  const status = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-green-400">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]" />
        {title}
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-100">{summary}</div>
      <div className="mt-0.5 max-w-[360px] text-xs text-zinc-400">The map stays as the memory peg. Extra practice remains optional.</div>
    </div>
  )
  const dock = (
    <TaskDock variant="checkpoint" status={status} tone="ready" focusPrimary enableEnterPrimary>
      <div className="flex w-full gap-2 xl:w-auto">
        <button type="button" onClick={onKeepPractising} className="flex-1 whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 hover:border-cyan-400 xl:flex-none">Keep practising</button>
        <button type="button" data-primary-action onClick={onNext} className="flex-1 whitespace-nowrap rounded-[9px] border border-cyan-600 bg-cyan-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 xl:flex-none">{nextLabel}<EnterKey /></button>
        {!surface && <button type="button" onClick={onBack} className="flex-1 whitespace-nowrap rounded-[9px] border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 xl:flex-none">Back</button>}
      </div>
    </TaskDock>
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
  const description = 'Recall the complete effective Country order to finish Learning for this Subregion.'
  const status = (
    <div className="min-w-0">
      <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] ${ready ? 'text-green-400' : 'text-zinc-400'}`}>
        <span aria-hidden="true" className={ready ? 'h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]' : 'h-2 w-2 shrink-0 rounded-full border border-zinc-500'} />
        {ready ? 'Ready for final recall' : 'Final recall'}
      </div>
      <div className="mt-1 text-lg font-bold text-zinc-100">{description}</div>
      <div className="mt-0.5 max-w-[360px] text-xs text-zinc-400">{ready ? 'This is the completion gate for the current Learning flow.' : 'Complete the remaining practice before starting the gate.'}</div>
    </div>
  )
  const dock = (
    <TaskDock variant="checkpoint" status={status} tone={ready ? 'ready' : 'neutral'} focusPrimary enableEnterPrimary>
      <div className="flex w-full gap-2 xl:w-auto">
        {ready && <button type="button" onClick={onKeepPractising} className="flex-1 whitespace-nowrap rounded-[9px] border border-zinc-600 bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-200 hover:border-cyan-400 xl:flex-none">Keep practising</button>}
        <button type="button" data-primary-action onClick={onStart} className="flex-1 whitespace-nowrap rounded-[9px] border border-cyan-600 bg-cyan-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 xl:flex-none">Final recall<EnterKey /></button>
        {!surface && <button type="button" onClick={onBack} className="flex-1 whitespace-nowrap rounded-[9px] border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 xl:flex-none">Back</button>}
      </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in"><LearningHeader label="Final recall" title={ready ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />{dock}</div>
}
