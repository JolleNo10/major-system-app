import { useId, useRef } from 'react'
import type { Continent } from '@/features/world-countries/data/countries'
import { useOverlay } from '@/app/layout/useOverlay'

export function JourneyContinentSwitchDialog({
  currentContinent,
  nextContinent,
  subregionLabel,
  onDismiss,
  onLearnOnly,
  onMakeCurrent,
}: {
  currentContinent: Continent
  nextContinent: Continent
  subregionLabel: string
  onDismiss: () => void
  onLearnOnly: () => void
  onMakeCurrent: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useOverlay(dialogRef, onDismiss)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onDismiss()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-bold text-zinc-100">Make {nextContinent} your current journey?</h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-zinc-300">
          {subregionLabel} is outside your current {currentContinent} journey. If you switch, Journey will keep choosing unfinished regions in {nextContinent}. When {nextContinent} is learned, the normal World journey resumes (currently {currentContinent}). Your continent order will not change.
        </p>
        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onLearnOnly}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            data-testid="journey-switch-learn-only"
          >
            Learn {subregionLabel} only
          </button>
          <button
            type="button"
            onClick={onMakeCurrent}
            className="rounded-lg border border-violet-500 bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            data-testid="journey-switch-make-current"
          >
            Make {nextContinent} current
          </button>
        </div>
      </div>
    </div>
  )
}
