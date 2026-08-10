/**
 * Domain-neutral learning identities.
 *
 * Feature code owns the meaning of an item. The learning layer only sees its
 * stable identity and the evidence collected against it.
 */
export type RecallItemId = string

export type LearningScopeId = string

export interface RecallItem {
  id: RecallItemId
}

export interface LearningScope {
  id: LearningScopeId
  itemIds: readonly RecallItemId[]
}

/** Cognitive interaction represented by an answer attempt. */
export type AttemptEvidenceKind = 'recall' | 'recognition'

export interface Attempt {
  at: number
  ok: boolean
  ms: number
  /** Absent on attempts written before evidence quality was introduced. */
  evidenceKind?: AttemptEvidenceKind
  /** Learner-local calendar date captured when the attempt was answered. */
  localDate?: string
}
