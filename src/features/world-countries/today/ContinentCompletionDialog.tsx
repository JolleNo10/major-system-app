import { useId, useRef } from 'react'
import type { Continent } from '@/features/world-countries/data/countries'
import { useOverlay } from '@/app/layout/useOverlay'
import { CompletionConfetti } from './CompletionConfetti'

export interface ContinentCompletionDialogProps {
  continent: Continent
  /** Absent once the World Journey has no remaining Continent to hand off to. */
  nextContinent?: Continent
  onContinue?: () => void
  onWorld: () => void
  onDismiss: () => void
  onStrengthen?: () => void
}

export function ContinentCompletionDialog({
  continent,
  nextContinent,
  onContinue,
  onWorld,
  onDismiss,
  onStrengthen,
}: ContinentCompletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const handoff = nextContinent && onContinue ? { nextContinent, onContinue } : null

  useOverlay(dialogRef, onDismiss)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onDismiss()
      }}
    >
      <div
        ref={dialogRef}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-[720px] overflow-x-hidden overflow-y-auto rounded-[26px] border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-continent-completion-dialog
      >
        <section className="relative flex min-h-[250px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-zinc-900 to-stone-900 px-6 py-9 text-center">
          <div aria-hidden="true" className="absolute -left-20 top-2 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <div aria-hidden="true" className="absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />
          <CompletionConfetti />
          <div className="relative grid h-20 w-20 place-items-center rounded-3xl border-2 border-amber-300/80 bg-zinc-950/90 text-amber-300 shadow-[0_0_32px_rgba(252,211,77,0.12)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 4h8v4c0 3-1.8 5-4 5s-4-2-4-5V4Z" />
              <path d="M8 6H5v1c0 2.1 1.2 3.5 3.2 3.8" />
              <path d="M16 6h3v1c0 2.1-1.2 3.5-3.2 3.8" />
              <path d="M12 13v3" />
              <path d="M9 20h6" />
              <path d="M10 16h4v4h-4" />
            </svg>
          </div>
          <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.30em] text-cyan-100/90">{continent.toUpperCase()}</p>
          <h2 id={titleId} className="relative mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Complete!</h2>
          <p id={descriptionId} className="relative mt-4 text-base text-zinc-200 sm:text-lg">You've learned all countries and capitals in {continent}.</p>
          {handoff && <p className="relative mt-1 text-sm text-zinc-400">Your journey continues.</p>}
        </section>

        <div className="px-6 pb-7 pt-6 sm:px-8">
          {handoff && (
            <button
              type="button"
              data-testid="continent-completion-continue"
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-cyan-300/60 bg-gradient-to-b from-cyan-600 to-cyan-700 px-5 py-4 text-left shadow-[0_12px_30px_rgba(8,145,178,0.18)] transition hover:from-cyan-500 hover:to-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              onClick={handoff.onContinue}
            >
              <span>
                <span className="text-lg font-black text-white">Continue journey → {handoff.nextContinent}</span>
                <span className="mt-1 block text-sm text-cyan-50/85">Start the next continent in your learning journey</span>
              </span>
              <span aria-hidden="true" className="text-3xl leading-none text-cyan-50">→</span>
            </button>
          )}

          <div className={`grid gap-3 sm:grid-cols-2 ${handoff ? 'mt-4' : ''}`}>
            <button
              type="button"
              data-testid="continent-completion-view-world"
              className="flex items-start gap-3 rounded-2xl border border-cyan-500/30 bg-zinc-900/80 px-4 py-4 text-left transition hover:border-cyan-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              onClick={onWorld}
            >
              <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-300/40 text-cyan-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5c-2.1-2.3-3.2-5.1-3.2-8.5S9.9 5.8 12 3.5Z" />
                </svg>
              </span>
              <span>
                <span className="text-base font-black text-zinc-100">View the World</span>
                <span className="mt-1 block text-sm text-zinc-400">See your overall progress</span>
              </span>
            </button>

            {onStrengthen && (
              <button
                type="button"
                data-testid="continent-completion-strengthen"
                className="flex items-start gap-3 rounded-2xl border border-cyan-500/30 bg-zinc-900/80 px-4 py-4 text-left transition hover:border-cyan-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                onClick={onStrengthen}
              >
                <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-300/40 text-cyan-200">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 8a7.5 7.5 0 0 0-13.6-1.7L4 8" />
                    <path d="M4 4v4h4M5 16a7.5 7.5 0 0 0 13.6 1.7L20 16" />
                    <path d="M20 20v-4h-4" />
                  </svg>
                </span>
                <span>
                  <span className="text-base font-black text-zinc-100">Strengthen {continent}</span>
                  <span className="mt-1 block text-sm text-zinc-400">Practice and review this continent</span>
                </span>
              </button>
            )}
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-zinc-500">Completing a continent finishes its learning journey. Mastery can continue through review.</p>
        </div>

        <button
          type="button"
          data-testid="continent-completion-dismiss"
          aria-label="Dismiss Continent completion celebration"
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-2xl leading-none text-zinc-300 hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={onDismiss}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
