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
  const dock = (
    <TaskDock variant="checkpoint" status={<span className="text-green-300">✓ {summary}</span>} tone="ready" focusPrimary enableEnterPrimary>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onKeepPractising} className="order-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 sm:order-1">Keep practising</button>
        <button type="button" data-primary-action onClick={onNext} className="order-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 sm:order-2">{nextLabel}</button>
        {!surface && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>}
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
  const dock = (
    <TaskDock variant="checkpoint" status={ready ? '✓ Ready for Final recall.' : 'Final recall is the completion gate.'} tone={ready ? 'ready' : 'neutral'} focusPrimary enableEnterPrimary>
      <p className="mb-2 text-sm leading-relaxed text-zinc-400">{description}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ready && <button type="button" onClick={onKeepPractising} className="order-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 sm:order-1">Keep practising</button>}
        <button type="button" data-primary-action onClick={onStart} className="order-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 sm:order-2">Final recall</button>
        {!surface && <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>}
      </div>
    </TaskDock>
  )
  return surface ? dock : <div className="space-y-4 animate-fade-in"><LearningHeader label="Final recall" title={ready ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />{dock}</div>
}
