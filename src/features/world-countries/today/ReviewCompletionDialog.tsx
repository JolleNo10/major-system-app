import { useId, useRef } from 'react'
import { useOverlay } from '@/app/layout/useOverlay'
import { CompletionConfetti } from './CompletionConfetti'
import type { WorldCountriesTodayReviewCompletion } from './TodayReviewSession'

export interface ReviewCompletionDialogProps {
  completion: WorldCountriesTodayReviewCompletion
  scopeLabel: string
  continueCount?: number
  onContinue?: () => void
  onBack: () => void
}

export function ReviewCompletionDialog({
  completion,
  scopeLabel,
  continueCount,
  onContinue,
  onBack,
}: ReviewCompletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const isStrengthen = completion.mode === 'consolidation'
  const hasContinue = Boolean(onContinue && continueCount !== undefined)

  useOverlay(dialogRef, onBack)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onBack()
      }}
    >
      <div
        ref={dialogRef}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-[560px] overflow-x-hidden overflow-y-auto rounded-[24px] border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-testid="review-completion-dialog"
      >
        <section className="relative flex min-h-[205px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-zinc-900 to-stone-900 px-6 py-8 text-center">
          <div aria-hidden="true" className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
          <div aria-hidden="true" className="absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
          <CompletionConfetti />
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl border-2 border-emerald-300/80 bg-zinc-950/90 text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.12)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 4.5 4.5L19 7" />
            </svg>
          </div>
          <p className="relative mt-4 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-100/90">SET COMPLETE</p>
          <h2 id={titleId} className="relative mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {isStrengthen ? 'Strengthen complete!' : 'Review complete!'}
          </h2>
          <p id={descriptionId} className="relative mt-3 text-sm text-zinc-200 sm:text-base">
            {isStrengthen ? 'You finished this strengthen set.' : 'You finished this review set.'}
          </p>
        </section>

        <div className="px-6 pb-6 pt-5 sm:px-7">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Set completion summary">
            <CompletionStat label={isStrengthen ? 'Practised' : 'Reviewed'} value={completion.checkpoint.reviewed} />
            <CompletionStat label="First try" value={completion.checkpoint.correctFirstTry} />
            <CompletionStat label="Recovered" value={completion.checkpoint.recoveredOnRetry} />
            {completion.checkpoint.stillNeedsWork > 0
              ? <CompletionStat label="Still needs work" value={completion.checkpoint.stillNeedsWork} />
              : <CompletionStat label="Resolved" value="All" />}
          </div>

          <div className="mt-5 space-y-2">
            {hasContinue && (
              <button
                type="button"
                data-testid="review-completion-continue"
                className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-cyan-300/60 bg-gradient-to-b from-cyan-600 to-cyan-700 px-5 py-3.5 text-left shadow-[0_12px_30px_rgba(8,145,178,0.18)] transition hover:from-cyan-500 hover:to-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={onContinue}
              >
                <span>
                  <span className="text-base font-black text-white">Continue</span>
                  <span className="mt-1 block text-sm text-cyan-50/85">
                    Next {isStrengthen ? 'strengthen' : 'review'} set&nbsp;&middot;&nbsp;{continueCount} {continueCount === 1 ? 'item' : 'items'}
                  </span>
                </span>
                <span aria-hidden="true" className="text-2xl leading-none text-cyan-50">&rarr;</span>
              </button>
            )}
            <button
              type="button"
              data-testid="review-completion-back"
              className="w-full rounded-2xl border border-cyan-500/30 bg-zinc-900/80 px-4 py-3 text-left text-sm font-bold text-zinc-100 transition hover:border-cyan-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              onClick={onBack}
            >
              Back to {scopeLabel}
            </button>
          </div>
        </div>

        <button
          type="button"
          data-testid="review-completion-dismiss"
          aria-label="Dismiss set completion"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/35 text-zinc-300 hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={onBack}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function CompletionStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div data-completion-stat={label} className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-center">
      <p className="text-lg font-black tabular-nums text-zinc-100">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-tight text-zinc-500">{label}</p>
    </div>
  )
}
