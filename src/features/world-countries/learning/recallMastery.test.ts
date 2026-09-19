import { describe, expect, it } from 'vitest'
import {
  deriveWorldCountriesAtomicProgress,
  deriveWorldCountriesAtomicProgressEvaluation,
} from './recallMastery'
import { recallTargetIdFor } from './recallTargets'

const itemId = recallTargetIdFor('NO', 'location-to-country')

function attempt(
  at: number,
  localDate: string,
  attemptType: string | undefined,
  ok = true,
) {
  return {
    at,
    ok,
    ms: 500,
    localDate,
    evidenceKind: 'recall' as const,
    ...(attemptType === undefined ? {} : { attemptType }),
  }
}

describe('World Countries atomic mastery evaluation', () => {
  it('treats all Legacy evidence as performance once explicit Learning exists', () => {
    const developing = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
    ])
    const strong = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
    ])
    const mastered = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
      attempt(4, '2026-09-04', 'legacy'),
    ])

    expect(developing.proficiency).toBe('developing')
    expect(strong.proficiency).toBe('strong')
    expect(mastered.proficiency).toBe('mastered')
    expect(mastered.hasEverMastered).toBe(true)
  })

  it('keeps the first Legacy cluster as acquisition when Learning is absent', () => {
    const developing = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'legacy'),
      attempt(2, '2026-09-02', 'legacy'),
    ])
    const strong = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'legacy'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
    ])
    const mastered = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'legacy'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
      attempt(4, '2026-09-04', 'legacy'),
    ])

    expect(developing.proficiency).toBe('developing')
    expect(strong.proficiency).toBe('strong')
    expect(mastered.proficiency).toBe('mastered')
  })

  it('applies the same explicit Learning rule independently to Capital targets', () => {
    const capitalId = recallTargetIdFor('NO', 'country-to-capital')
    const progress = deriveWorldCountriesAtomicProgress(capitalId, [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
    ])

    expect(progress.proficiency).toBe('strong')
  })

  it('treats a later Legacy failure as performance, while Learning failures remain acquisition-only', () => {
    const performanceFailure = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
      attempt(4, '2026-09-04', 'legacy', false),
    ])
    const learningFailure = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'learning', false),
      attempt(2, '2026-09-02', 'learning', true),
    ])

    expect(performanceFailure.proficiency).toBe('developing')
    expect(learningFailure.proficiency).toBe('learned')
  })

  it('keeps untyped and unknown provenance on the Legacy compatibility path', () => {
    const untyped = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', undefined),
      attempt(2, '2026-09-02', undefined),
    ])
    const unknown = deriveWorldCountriesAtomicProgress(itemId, [
      attempt(1, '2026-09-01', 'future-activity'),
      attempt(2, '2026-09-02', 'future-activity'),
    ])

    expect(untyped.proficiency).toBe('developing')
    expect(unknown.proficiency).toBe('developing')
  })

  it('returns an evaluator-owned trace using the complete-history classification', () => {
    const attempts = [
      attempt(1, '2026-09-01', 'learning'),
      attempt(2, '2026-09-02', 'legacy'),
      attempt(3, '2026-09-03', 'legacy'),
      attempt(4, '2026-09-04', 'legacy'),
    ]
    const evaluation = deriveWorldCountriesAtomicProgressEvaluation(itemId, attempts)
    const progress = deriveWorldCountriesAtomicProgress(itemId, attempts)

    expect(evaluation.progress).toEqual(progress)
    expect(evaluation.steps.map(step => [step.evaluatedAs, step.proficiencyAfter, step.masteredAfter])).toEqual([
      ['acquisition', 'learned', false],
      ['performance', 'developing', false],
      ['performance', 'strong', false],
      ['performance', 'mastered', true],
    ])
    expect(evaluation.steps.map(step => step.masteryEligibleRecall)).toEqual([false, true, true, true])
    expect(evaluation.masteryQualifyingRecallDates).toEqual([
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
    ])
  })

  it('shows raw missing provenance separately from effective Legacy classification', () => {
    const evaluation = deriveWorldCountriesAtomicProgressEvaluation(itemId, [
      attempt(1, '2026-09-01', undefined),
      attempt(2, '2026-09-02', 'legacy'),
    ])

    expect(evaluation.steps[0]).toMatchObject({
      attemptType: undefined,
      effectiveAttemptType: 'legacy',
      evaluatedAs: 'acquisition',
    })
    expect(evaluation.steps[1]).toMatchObject({
      attemptType: 'legacy',
      effectiveAttemptType: 'legacy',
      evaluatedAs: 'performance',
    })
  })
})
