import type { Country } from '@/features/world-countries/data/countries'
import { classifyRecallAnswer, getRecallAnswerKindMistakeMessage } from './recallAnswerMatching'
import type { WorldCountriesRecallSkill } from './recallTargets'

export interface RecallAnswerEvaluation {
  outcome: 'exact' | 'fuzzy' | 'incorrect' | 'wrong-kind'
  canonicalAnswer: string
  answerKind: 'country' | 'capital'
  message: string
}

/**
 * Classify a typed recall answer and build the evaluation object expected by
 * `WorldCountriesTypedAnswer`'s `evaluate` prop.
 *
 * @param incorrectMessage - Override the message shown when the answer is
 *   wrong.  Defaults to `"The correct <answerKind> is <expectedAnswer>."`.
 *   Pass `"The correct answer is <expectedAnswer>."` for contexts (e.g. guided
 *   review) where the generic wording is preferred over the specific kind.
 */
export function evaluateRecallAnswer({
  skill,
  answer,
  country,
  fuzzy,
  expectedAnswer,
  answerKind,
  countryCandidates,
  capitalCandidates,
  incorrectMessage,
}: {
  skill: WorldCountriesRecallSkill
  answer: string
  country: Country
  fuzzy: boolean
  expectedAnswer: string
  answerKind: 'country' | 'capital'
  countryCandidates: readonly Country[]
  capitalCandidates: readonly string[]
  incorrectMessage?: string
}): RecallAnswerEvaluation {
  const match = classifyRecallAnswer(skill, answer, country, {
    fuzzy,
    countryCandidates,
    capitalCandidates,
  })
  const outcome: RecallAnswerEvaluation['outcome'] =
    match === 'wrong-kind' ? 'wrong-kind'
    : match === 'exact' ? 'exact'
    : match === 'fuzzy' ? 'fuzzy'
    : 'incorrect'
  const message =
    outcome === 'wrong-kind' ? getRecallAnswerKindMistakeMessage(skill)
    : outcome === 'incorrect' ? (incorrectMessage ?? `The correct ${answerKind} is ${expectedAnswer}.`)
    : outcome === 'fuzzy' ? `Correct. The canonical answer is ${expectedAnswer}.`
    : 'Correct.'
  return { outcome, canonicalAnswer: expectedAnswer, answerKind, message }
}
