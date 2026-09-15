import { useId, useRef } from 'react'
import { useOverlay } from '@/app/layout/useOverlay'

export function FinalRecallSkipDialog({
  learningScopeLabel,
  track,
  willPersistCompletion,
  onDismiss,
  onConfirm,
}: {
  learningScopeLabel: string
  track: 'countries' | 'capitals'
  willPersistCompletion: boolean
  onDismiss: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const trackLabel = track === 'countries' ? 'Countries' : 'Capitals'
  const description = willPersistCompletion
    ? `This will mark ${learningScopeLabel} · ${trackLabel} as completed without doing the final recall. Your Learning journey can continue from this point, and the skip counts as one successful recall for each Country, exactly as completing the final recall would.`
    : `This will finish this temporary ${trackLabel} run without doing the final recall. The skip does not change your Learning journey or create recall or mastery evidence.`

  useOverlay(dialogRef, onDismiss)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-bold text-zinc-100">Skip final recall?</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-zinc-300">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onDismiss} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" data-testid="final-recall-skip-dismiss">Dismiss</button>
          <button type="button" onClick={onConfirm} className="rounded-lg border border-violet-500 bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" data-testid="final-recall-skip-confirm">Skip as completed</button>
        </div>
      </div>
    </div>
  )
}
