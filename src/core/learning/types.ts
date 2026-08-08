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

export interface Attempt {
  at: number
  ok: boolean
  ms: number
}
