import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RecallFeedback } from '@/core/ui/RecallFeedback'
import { TypingInput } from '@/core/ui/TypingInput'
import { FuzzySpellingPracticeControls } from './MiniSpellingPractice'

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
  promptKey: string
  latencyMs: number
}

export interface WorldCountriesTypedAnswerRenderState {
  input: ReactNode
  feedback: ReactNode | null
  fuzzyControls: ReactNode | null
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
  useEffect(() => {
    if (!activeResult || activeResult.outcome === 'fuzzy') return

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
  }, [activeResult, retryOnIncorrect])

  const submit = (answer: string) => {
    if (activeResult || answeredRef.current) return
    answeredRef.current = true
    const latencyMs = Math.max(0, now() - startedAtRef.current)
    const evaluation = evaluate(answer, latencyMs)
    const nextResult: WorldCountriesTypedAnswerResult = { ...evaluation, promptKey, latencyMs }
    setResult(nextResult)
    onAnswer(answer, evaluation, latencyMs)
  }

  const revealAnswer = () => {
    if (!reveal || activeResult || answeredRef.current) return false
    answeredRef.current = true
    setResult({ ...reveal, outcome: 'revealed', promptKey, latencyMs: 0 })
    return true
  }

  const completeTransition = (completedResult: WorldCountriesTypedAnswerResult) => {
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
  const feedback = activeResult && (
    <RecallFeedback
      variant="inline"
      correct={Boolean(isPositive)}
      message={activeResult.message}
      detail={activeResult.detail}
    />
  )
  const fuzzyControls = activeResult?.outcome === 'fuzzy' && (
    <FuzzySpellingPracticeControls
      answer={activeResult.canonicalAnswer}
      answerKind={activeResult.answerKind}
      onContinue={() => {
        const completedResult = activeResult
        completeTransition(completedResult)
      }}
    />
  )

  return children({
    input,
    feedback,
    fuzzyControls,
    isAnswerable: activeResult === null,
    feedbackActive: activeResult !== null,
    outcome: activeResult?.outcome ?? null,
    reveal: revealAnswer,
  })
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
