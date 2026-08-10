import type { ReactNode } from 'react'

export interface RecallFeedbackProps {
  correct: boolean
  message: ReactNode
  detail?: ReactNode
  variant?: 'overlay' | 'inline'
}

/** Shared transient feedback presentation for recall workflows. */
export function RecallFeedback({ correct, message, detail, variant = 'overlay' }: RecallFeedbackProps) {
  const content = (
    <>
      <p className={`text-sm font-semibold ${correct ? 'text-green-300' : 'text-red-300'}`}>
        {message}
      </p>
      {detail && <p className="mt-1 text-xs text-zinc-500">{detail}</p>}
    </>
  )

  if (variant === 'inline') {
    return (
      <div className={`text-center ${correct ? 'text-green-300' : 'text-red-300'}`} role="status" aria-live="polite">
        {content}
      </div>
    )
  }

  return (
    <section className={`pointer-events-none absolute bottom-2 left-2 right-2 rounded-xl border p-4 bg-zinc-900/90 ${correct ? 'border-green-500/30' : 'border-red-500/30'}`} role="status" aria-live="polite">
      {content}
    </section>
  )
}
