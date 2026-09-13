import { useLayoutEffect, useRef, type RefObject } from 'react'

export type TodayHubActionTone = 'review' | 'journey' | 'strengthen' | 'playground'

export interface TodayHubAction {
  id: 'review' | 'journey' | 'strengthen' | 'playground'
  title: string
  detail: string
  tone: TodayHubActionTone
  onAction: () => void
}

const toneClasses: Record<TodayHubActionTone, { border: string; icon: string; title: string }> = {
  review: { border: 'border-green-500/45 hover:border-green-400/70', icon: 'text-green-300', title: 'text-green-100' },
  journey: { border: 'border-violet-500/45 hover:border-violet-400/70', icon: 'text-violet-300', title: 'text-violet-100' },
  strengthen: { border: 'border-green-500/45 hover:border-green-400/70', icon: 'text-green-300', title: 'text-green-100' },
  playground: { border: 'border-cyan-500/35 hover:border-cyan-400/60', icon: 'text-cyan-300', title: 'text-cyan-100' },
}

const actionIcons: Record<TodayHubActionTone, string> = {
  review: '✦',
  journey: '→',
  strengthen: '✦',
  playground: '▶',
}

export function TodayActionHub({
  recommended,
  otherActions,
  disabled = false,
  focusRequest = 0,
}: {
  recommended: TodayHubAction
  otherActions: readonly TodayHubAction[]
  disabled?: boolean
  focusRequest?: number
}) {
  const recommendedRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRequest = useRef(0)

  useLayoutEffect(() => {
    if (focusRequest <= lastFocusedRequest.current) return
    lastFocusedRequest.current = focusRequest
    recommendedRef.current?.focus()
  }, [focusRequest])

  return (
    <section data-today-action-hub className="rounded-[18px] border border-zinc-700/80 bg-zinc-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.38)] backdrop-blur-xl" aria-labelledby="world-countries-next-step-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Next step</p>
      <h2 id="world-countries-next-step-heading" className="mt-1 text-lg font-bold text-zinc-100">Choose what you want to do</h2>

      <div className="mt-4">
        <TodayActionCard action={recommended} recommended disabled={disabled} buttonRef={recommendedRef} />
      </div>

      {otherActions.length > 0 && (
        <div className="mt-5" aria-labelledby="world-countries-other-options-heading">
          <h3 id="world-countries-other-options-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Other options</h3>
          <div className={`mt-2 grid gap-3 ${otherActions.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {otherActions.map(action => <TodayActionCard key={action.id} action={action} disabled={disabled} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function TodayActionCard({
  action,
  recommended = false,
  disabled,
  buttonRef,
}: {
  action: TodayHubAction
  recommended?: boolean
  disabled: boolean
  buttonRef?: RefObject<HTMLButtonElement | null>
}) {
  const tone = toneClasses[action.tone]
  return (
    <button
      ref={buttonRef}
      type="button"
      data-today-action={action.id}
      data-recommended={recommended ? 'true' : undefined}
      data-primary-action={recommended ? true : undefined}
      disabled={disabled}
      onClick={action.onAction}
      className={`group w-full rounded-xl border bg-zinc-900/80 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 ${tone.border}`}
    >
      <span className="flex items-start gap-3">
        <span aria-hidden="true" className={`mt-0.5 w-5 shrink-0 text-center text-base font-bold leading-5 ${tone.icon}`}>{actionIcons[action.tone]}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={`font-bold ${tone.title}`}>{action.title}</span>
            <span className="flex shrink-0 items-center gap-2">
              {recommended && <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Recommended</span>}
              <span aria-hidden="true" className="text-lg leading-none text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200">›</span>
            </span>
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{action.detail}</span>
        </span>
      </span>
    </button>
  )
}
