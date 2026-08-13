import { LearningHeader } from './MemoryPreviewStep'

export function StagedLearningReadyStep({
  title,
  summary,
  nextLabel,
  onNext,
  onKeepPractising,
  onBack,
  onExit,
}: {
  title: string
  summary: string
  nextLabel: string
  onNext: () => void
  onKeepPractising: () => void
  onBack: () => void
  onExit: () => void
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Ready" title={title} onExit={onExit} />
      <section className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center">
        <p className="text-sm text-green-300">{summary}</p>
      </section>
      <div className="grid gap-2">
        <button type="button" onClick={onNext} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">{nextLabel}</button>
        <button type="button" onClick={onKeepPractising} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500">Keep practising</button>
        <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>
      </div>
    </div>
  )
}

export function FinalRecallGate({
  ready,
  onStart,
  onKeepPractising,
  onBack,
  onExit,
}: {
  ready: boolean
  onStart: () => void
  onKeepPractising: () => void
  onBack: () => void
  onExit: () => void
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <LearningHeader label="Final recall" title={ready ? 'Ready for Final recall' : 'Final recall'} onExit={onExit} />
      <p className="text-sm leading-relaxed text-zinc-400">
        Recall the complete effective Country order to finish Learning for this Subregion.
      </p>
      <div className="grid gap-2">
        <button type="button" onClick={onStart} className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500">Final recall</button>
        {ready && <button type="button" onClick={onKeepPractising} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 hover:border-cyan-500">Keep practising</button>}
        <button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-800 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-200">Back</button>
      </div>
    </div>
  )
}
