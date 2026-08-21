import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TypingInput } from '@/core/ui/TypingInput'
import { useMapSurfaceFeedbackOverlay } from './MapSurface'
import { WorldCountriesAnswerFeedback } from './WorldCountriesAnswerFeedback'

const SUCCESS_FEEDBACK_DURATION_MS = 500
const CORRECTION_FEEDBACK_DURATION_MS = 1800

export type WorldCountriesTypedAnswerOutcome = 'exact' | 'fuzzy' | 'incorrect' | 'revealed'
export type WorldCountriesTypedAnswerKind = 'country' | 'capital'

export interface WorldCountriesTypedAnswerEvaluation {
  outcome: Exclude<WorldCountriesTypedAnswerOutcome, 'revealed'>
  canonicalAnswer: string
  answerKind: WorldCountriesTypedAnswerKind
  message: ReactNode
  detail?: ReactNode
}

export interface WorldCountriesTypedAnswerReveal {
  canonicalAnswer: string
  answerKind: WorldCountriesTypedAnswerKind
  message: ReactNode
  detail?: ReactNode
}

export interface WorldCountriesTypedAnswerResult {
  outcome: WorldCountriesTypedAnswerOutcome
  canonicalAnswer: string
  answerKind: WorldCountriesTypedAnswerKind
  message: ReactNode
  detail?: ReactNode
  submittedAnswer?: string
  promptKey: string
  latencyMs: number
}

export interface WorldCountriesTypedAnswerRenderState {
  input: ReactNode
  feedbackOverlay: ReactNode | null
  isAnswerable: boolean
  feedbackActive: boolean
  outcome: WorldCountriesTypedAnswerOutcome | null
  reveal: () => boolean
}

export function WorldCountriesTypedAnswer({
  promptKey,
  answerLabel,
  placeholder,
  correctAnswer,
  evaluate,
  onAnswer,
  onTransition,
  retryOnIncorrect = false,
  allowIncorrectSpellingPractice = false,
  reveal,
  children,
}: {
  promptKey: string
  answerLabel: string
  placeholder: string
  correctAnswer: string
  evaluate: (answer: string, latencyMs: number) => WorldCountriesTypedAnswerEvaluation
  onAnswer: (answer: string, evaluation: WorldCountriesTypedAnswerEvaluation, latencyMs: number) => void
  onTransition: (result: WorldCountriesTypedAnswerResult) => void | Promise<void>
  retryOnIncorrect?: boolean
  allowIncorrectSpellingPractice?: boolean
  reveal?: WorldCountriesTypedAnswerReveal
  children: (state: WorldCountriesTypedAnswerRenderState) => ReactNode
}) {
  const [result, setResult] = useState<WorldCountriesTypedAnswerResult | null>(null)
  const startedAtRef = useRef(now())
  const answeredRef = useRef(false)
  const transitionStartedRef = useRef<WorldCountriesTypedAnswerResult | null>(null)
  const transitionRef = useRef(onTransition)
  transitionRef.current = onTransition

  useEffect(() => {
    startedAtRef.current = now()
    answeredRef.current = false
    transitionStartedRef.current = null
    setResult(null)
  }, [promptKey])

  const activeResult = result?.promptKey === promptKey ? result : null

  const completeTransition = useCallback((completedResult: WorldCountriesTypedAnswerResult) => {
    if (transitionStartedRef.current === completedResult) return
    transitionStartedRef.current = completedResult
    const transition = transitionRef.current(completedResult)
    if (!transition || typeof (transition as Promise<void>).then !== 'function') {
      setResult(null)
      return
    }
    void Promise.resolve(transition).then(
      () => setResult(current => current === completedResult ? null : current),
      () => setResult(current => current === completedResult ? null : current),
    )
  }, [])

  useEffect(() => {
    const spellingPracticeAvailable = activeResult?.outcome === 'fuzzy'
      || (allowIncorrectSpellingPractice && activeResult?.outcome === 'incorrect')
    if (!activeResult || spellingPracticeAvailable) return

    const duration = activeResult.outcome === 'exact'
      ? SUCCESS_FEEDBACK_DURATION_MS
      : CORRECTION_FEEDBACK_DURATION_MS
    const timer = window.setTimeout(() => {
      const completedResult = activeResult
      if (completedResult.outcome === 'incorrect' && retryOnIncorrect) {
        answeredRef.current = false
        setResult(null)
        return
      }
      completeTransition(completedResult)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [activeResult, allowIncorrectSpellingPractice, completeTransition, retryOnIncorrect])

  const submit = (answer: string) => {
    if (activeResult || answeredRef.current) return
    answeredRef.current = true
    const latencyMs = Math.max(0, now() - startedAtRef.current)
    const evaluation = evaluate(answer, latencyMs)
    const nextResult: WorldCountriesTypedAnswerResult = { ...evaluation, promptKey, latencyMs, submittedAnswer: answer }
    setResult(nextResult)
    onAnswer(answer, evaluation, latencyMs)
  }

  const revealAnswer = () => {
    if (!reveal || activeResult || answeredRef.current) return false
    answeredRef.current = true
    setResult({ ...reveal, outcome: 'revealed', promptKey, latencyMs: 0 })
    return true
  }

  const isPositive = activeResult?.outcome === 'exact' || activeResult?.outcome === 'fuzzy'
  const input = (
    <TypingInput
      resetKey={promptKey}
      onAnswer={submit}
      answeredCorrect={activeResult ? Boolean(isPositive) : null}
      correctAnswer={correctAnswer}
      ariaLabel={answerLabel}
      placeholder={placeholder}
      showCorrectAnswer={false}
      compact
    />
  )
  const feedbackOverlay = useMemo(() => activeResult && (
    <WorldCountriesAnswerFeedback
      result={activeResult}
      allowIncorrectSpellingPractice={allowIncorrectSpellingPractice}
      onContinue={() => completeTransition(activeResult)}
    />
  ), [activeResult, allowIncorrectSpellingPractice, completeTransition])

  useMapSurfaceFeedbackOverlay(feedbackOverlay)

  return children({
    input,
    feedbackOverlay,
    isAnswerable: activeResult === null,
    feedbackActive: activeResult !== null,
    outcome: activeResult?.outcome ?? null,
    reveal: revealAnswer,
  })
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
