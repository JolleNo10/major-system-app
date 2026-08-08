import type { ItemProgress } from './itemProgress'
import type { LearningScope, RecallItemId } from './types'

export interface ScopeProgress {
  scopeId: string

  totalItems: number
  seenItems: number
  masteredItems: number

  masteryRatio: number
  mastered: boolean
}

type ProgressCollection =
  | ReadonlyMap<RecallItemId, ItemProgress>
  | Readonly<Record<string, ItemProgress>>
  | readonly ItemProgress[]

function findProgress(
  collection: ProgressCollection,
  itemId: RecallItemId,
): ItemProgress | undefined {
  if (collection instanceof Map) return collection.get(itemId)
  if (Array.isArray(collection)) return collection.find(progress => progress.itemId === itemId)
  return (collection as Readonly<Record<string, ItemProgress>>)[itemId]
}

/** Aggregate progress from item evidence without creating scope attempts. */
export function deriveScopeProgress(
  scope: LearningScope,
  progress: ProgressCollection,
): ScopeProgress {
  const itemIds = [...new Set(scope.itemIds)]
  let seenItems = 0
  let masteredItems = 0

  for (const itemId of itemIds) {
    const item = findProgress(progress, itemId)
    if (!item || item.attempts === 0) continue
    seenItems++
    if (item.mastered) masteredItems++
  }

  const totalItems = itemIds.length
  return {
    scopeId: scope.id,
    totalItems,
    seenItems,
    masteredItems,
    masteryRatio: totalItems ? masteredItems / totalItems : 0,
    mastered: totalItems > 0 && masteredItems === totalItems,
  }
}
