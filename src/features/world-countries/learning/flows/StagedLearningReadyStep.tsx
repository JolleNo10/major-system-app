import { LearningHeader } from './MemoryPreviewStep'
import { TaskDock } from '@/features/world-countries/ui/MapSurface'

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
    <>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-300">
        <span aria-hidden="true">●</span>
        {title}
      </span>
      <span className="mt-1 block text-sm text-zinc-200">{summary}</span>
      <span className="mt-1 block text-xs text-zinc-500">Keep practising remains available if you want another pass.</span>
    </>
  )
  const dock = (
    <TaskDock variant="checkpoint" status={status} tone="ready" focusPrimary enableEnterPrimary>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" onClick={onKeepPractising} className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 sm:w-auto">Keep practising</button>
        <button type="button" data-primary-action onClick={onNext} className="w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 sm:w-auto">{nextLabel} ↵</button>
        {!surface && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200 sm:w-auto">Back</button>}
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
  const status = ready ? (
    <>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-300"><span aria-hidden="true">●</span>Ready for final recall</span>
      <span className="mt-1 block text-sm text-zinc-200">{description}</span>
      <span className="mt-1 block text-xs text-zinc-500">This is the completion gate for the current Learning flow.</span>
    </>
  ) : (
    <>
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300"><span aria-hidden="true">○</span>Final recall</span>
      <span className="mt-1 block text-sm text-zinc-200">{description}</span>
      <span className="mt-1 block text-xs text-zinc-500">Complete the remaining practice before starting the gate.</span>
    </>
  )
  const dock = (
    <TaskDock variant="checkpoint" status={status} tone={ready ? 'ready' : 'neutral'} focusPrimary enableEnterPrimary>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {ready && <button type="button" onClick={onKeepPractising} className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 sm:w-auto">Keep practising</button>}
        <button type="button" data-primary-action onClick={onStart} className={ready ? 'w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 sm:w-auto' : 'w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500'}>Final recall ↵</button>
        {!surface && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200 sm:w-auto">Back</button>}
      </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in"><LearningHeader label="Final recall" title={ready ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />{dock}</div>
}
