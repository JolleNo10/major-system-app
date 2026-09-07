import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { TypingInput } from '@/core/ui/TypingInput'
import { useMapSurfaceFeedbackOverlay } from './MapSurface'
import { WorldCountriesAnswerFeedback, useWorldCountriesAnswerFeedback } from './WorldCountriesAnswerFeedback'
import { getWorldCountriesAnswerAccent, type WorldCountriesAnswerKind } from './WorldCountriesAnswerSemantics'

const WRONG_KIND_FEEDBACK_DURATION_MS = 650

export type WorldCountriesTypedAnswerOutcome = 'exact' | 'fuzzy' | 'incorrect' | 'revealed' | 'wrong-kind'

export interface WorldCountriesTypedAnswerEvaluation {
  outcome: Exclude<WorldCountriesTypedAnswerOutcome, 'revealed'>
  canonicalAnswer: string
  answerKind: WorldCountriesAnswerKind
  message: ReactNode
  detail?: ReactNode
}

export interface WorldCountriesTypedAnswerReveal {
  canonicalAnswer: string
  answerKind: WorldCountriesAnswerKind
  message: ReactNode
  detail?: ReactNode
}

export interface WorldCountriesTypedAnswerResult {
  outcome: WorldCountriesTypedAnswerOutcome
  canonicalAnswer: string
  answerKind: WorldCountriesAnswerKind
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

export function isWorldCountriesTypedAnswerResolved(
  outcome: WorldCountriesTypedAnswerOutcome | null,
): boolean {
  return outcome === 'exact' || outcome === 'fuzzy' || outcome === 'revealed'
}

export function WorldCountriesTypedAnswer({
  promptKey,
  answerKind,
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
  answerKind: WorldCountriesAnswerKind
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
  const [wrongKindResult, setWrongKindResult] = useState<WorldCountriesTypedAnswerResult | null>(null)
  const [attemptResetKey, setAttemptResetKey] = useState(0)
  const startedAtRef = useRef(now())
  const answeredRef = useRef(false)
  const transitionStartedRef = useRef<WorldCountriesTypedAnswerResult | null>(null)
  const resultRef = useRef<WorldCountriesTypedAnswerResult | null>(null)
  const promptKeyRef = useRef(promptKey)
  resultRef.current = result
  promptKeyRef.current = promptKey
  const transitionRef = useRef(onTransition)
  transitionRef.current = onTransition

  const resetAttempt = useCallback(() => {
    startedAtRef.current = now()
    answeredRef.current = false
  }, [])

  useEffect(() => {
    resultRef.current = null
    setWrongKindResult(null)
    resetAttempt()
    transitionStartedRef.current = null
    setResult(null)
  }, [promptKey, resetAttempt])

  useEffect(() => {
    if (!wrongKindResult) return
    const timer = window.setTimeout(() => {
      setWrongKindResult(current => current === wrongKindResult ? null : current)
    }, WRONG_KIND_FEEDBACK_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [wrongKindResult])

  const activeResult = result?.promptKey === promptKey ? result : null

  const clearCompletedResult = useCallback((completedResult: WorldCountriesTypedAnswerResult) => {
    if (promptKeyRef.current !== completedResult.promptKey || resultRef.current !== completedResult) return
    resultRef.current = null
    setResult(current => current === completedResult ? null : current)
    resetAttempt()
  }, [resetAttempt])

  const completeTransition = useCallback((completedResult: WorldCountriesTypedAnswerResult) => {
    if (transitionStartedRef.current === completedResult) return
    transitionStartedRef.current = completedResult
    const transition = transitionRef.current(completedResult)
    if (!transition || typeof (transition as Promise<void>).then !== 'function') {
      clearCompletedResult(completedResult)
      return
    }
    void Promise.resolve(transition).then(
      () => clearCompletedResult(completedResult),
      () => clearCompletedResult(completedResult),
    )
  }, [clearCompletedResult])

  const submit = (answer: string) => {
    if (activeResult || answeredRef.current) return
    answeredRef.current = true
    const latencyMs = Math.max(0, now() - startedAtRef.current)
    const evaluation = evaluate(answer, latencyMs)
    const nextResult: WorldCountriesTypedAnswerResult = { ...evaluation, promptKey, latencyMs, submittedAnswer: answer }
    if (evaluation.outcome === 'wrong-kind') {
      resetAttempt()
      setWrongKindResult(nextResult)
      setAttemptResetKey(value => value + 1)
      return
    }
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
  const answerAccent = getWorldCountriesAnswerAccent(answerKind)
  const neutralFeedbackOverlay = wrongKindResult ? (
    <WorldCountriesAnswerFeedback
      result={wrongKindResult}
      onContinue={() => setWrongKindResult(current => current === wrongKindResult ? null : current)}
    />
  ) : null
  const input = (
    <TypingInput
      resetKey={`${promptKey}-${attemptResetKey}`}
      onAnswer={submit}
      answeredCorrect={activeResult ? Boolean(isPositive) : null}
      correctAnswer={correctAnswer}
      ariaLabel={answerLabel}
      placeholder={placeholder}
      showCorrectAnswer={false}
      compact
      accent={answerAccent.typingInput}
    />
  )
  const handleFeedbackContinue = useCallback(() => {
    if (activeResult?.outcome === 'incorrect' && retryOnIncorrect) {
      clearCompletedResult(activeResult)
      return
    }
    if (activeResult) completeTransition(activeResult)
  }, [activeResult, clearCompletedResult, completeTransition, retryOnIncorrect])
  const { feedbackOverlay, feedbackActive } = useWorldCountriesAnswerFeedback({
    result: activeResult,
    allowIncorrectSpellingPractice,
    onContinue: handleFeedbackContinue,
  })
  const visibleFeedbackOverlay = feedbackOverlay ?? neutralFeedbackOverlay

  useMapSurfaceFeedbackOverlay(visibleFeedbackOverlay)

  return children({
    input,
    feedbackOverlay: visibleFeedbackOverlay,
    isAnswerable: activeResult === null && wrongKindResult === null,
    feedbackActive: feedbackActive || wrongKindResult !== null,
    outcome: activeResult?.outcome ?? wrongKindResult?.outcome ?? null,
    reveal: revealAnswer,
  })
}

function now(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}
