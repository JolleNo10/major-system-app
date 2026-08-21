import type { WorldCountriesTypedAnswerResult } from './WorldCountriesTypedAnswer'
import { FuzzySpellingPracticeControls } from './MiniSpellingPractice'

const feedbackShellClass = `
  w-full max-w-[420px]
  max-h-[calc(100%_-_2.5rem)]
  overflow-y-auto
  rounded-[22px]
  border
  px-5 py-[18px]
  text-center
  backdrop-blur-[18px]
  backdrop-saturate-125
  shadow-[0_20px_75px_rgba(0,0,0,0.34)]
  animate-world-answer-feedback-in
`

const feedbackToneClass = {
  exact: `
    border-green-300/30
    bg-[rgba(10,20,16,0.42)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(74,222,128,0.10)]
  `,
  fuzzy: `
    border-amber-300/30
    bg-[rgba(24,18,10,0.46)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(251,191,36,0.08)]
  `,
  incorrect: `
    border-rose-400/30
    bg-[rgba(26,14,18,0.46)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_60px_rgba(251,113,133,0.08)]
  `,
  revealed: `
    border-amber-300/25
    bg-[rgba(24,18,10,0.44)]
    shadow-[0_20px_75px_rgba(0,0,0,0.34),0_0_52px_rgba(251,191,36,0.06)]
  `,
} as const

const titleClass = {
  exact: 'text-green-50',
  fuzzy: 'text-amber-50',
  incorrect: 'text-rose-50',
  revealed: 'text-amber-50',
} as const

const secondaryClass = {
  exact: 'text-green-200/80',
  fuzzy: 'text-amber-200',
  incorrect: 'text-rose-200',
  revealed: 'text-amber-200',
} as const

const iconClass = {
  exact: 'border-green-300/35 bg-green-500/15 text-green-200',
  fuzzy: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
  incorrect: 'border-rose-300/30 bg-rose-400/10 text-rose-200',
  revealed: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
} as const

export function WorldCountriesAnswerFeedback({ result, onContinue }: {
  result: WorldCountriesTypedAnswerResult
  onContinue: () => void
}) {
  const { outcome } = result
  const interactive = outcome === 'fuzzy'
  const title = outcome === 'exact' || outcome === 'fuzzy'
    ? 'Correct'
    : outcome === 'incorrect'
      ? 'Incorrect'
      : 'Answer revealed'
  const icon = outcome === 'exact' || outcome === 'fuzzy' ? '✓' : outcome === 'incorrect' ? '×' : '↗'
  const statusText = outcome === 'incorrect'
    ? `Incorrect.${typeof result.message === 'string' ? ` ${result.message}` : ''}`
    : outcome === 'revealed'
      ? `Answer revealed. ${result.canonicalAnswer}`
      : outcome === 'fuzzy'
        ? `Correct. Spelling: ${result.canonicalAnswer}. You typed: ${result.submittedAnswer ?? ''}`
        : `Correct. ${result.canonicalAnswer}`

  return (
    <section
      data-world-answer-feedback
      data-world-answer-outcome={outcome}
      aria-label={`${title} answer feedback`}
      className={`${feedbackShellClass} ${interactive ? 'pointer-events-auto' : ''} ${feedbackToneClass[outcome]}`}
    >
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{statusText}</span>
      <div aria-hidden="true" className={`mx-auto mb-2 grid size-12 place-items-center rounded-full border text-2xl font-black animate-world-answer-feedback-icon ${iconClass[outcome]}`}>
        {icon}
      </div>
      <div className={`text-[18px] font-extrabold ${titleClass[outcome]}`}>{title}</div>

      {outcome === 'exact' && (
        <div className={`mt-0.5 text-[13px] ${secondaryClass[outcome]}`}>{result.canonicalAnswer}</div>
      )}

      {outcome === 'fuzzy' && (
        <>
          <div className={`mt-0.5 text-[13px] ${secondaryClass[outcome]}`}>
            Spelling: <strong>{result.canonicalAnswer}</strong>
          </div>
          <div className="mt-1.5 text-xs text-zinc-300">
            <span className="text-zinc-500">You typed:</span>{' '}
            {result.submittedAnswer}
          </div>
          <FuzzySpellingPracticeControls
            answer={result.canonicalAnswer}
            answerKind={result.answerKind}
            onContinue={onContinue}
          />
        </>
      )}

      {outcome === 'incorrect' && (
        <>
          <div className={`mt-0.5 text-[13px] ${secondaryClass[outcome]}`}>
            {result.message ?? 'Try again.'}
          </div>
          {result.detail && <div className="mt-1.5 text-xs text-zinc-300">{result.detail}</div>}
        </>
      )}

      {outcome === 'revealed' && (
        <div className={`mt-0.5 text-[13px] ${secondaryClass[outcome]}`}>
          <strong>{result.canonicalAnswer}</strong>
        </div>
      )}
    </section>
  )
}
