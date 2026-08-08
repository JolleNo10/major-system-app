import type { LearningScope, RecallItemId } from '@/core/learning'
import { PI_PAIRS } from './piDigits'
import { PAIRS_PER_SEGMENT } from './piStats'

/** Pi's domain adapter; the learning layer does not know what a pair means. */
export function piPairItemId(position: number): RecallItemId {
  return `pi:pair:${position}`
}

export function getPiSegmentScope(segment: number): LearningScope {
  const firstPosition = segment * PAIRS_PER_SEGMENT + 1
  const itemIds: RecallItemId[] = []
  for (let offset = 0; offset < PAIRS_PER_SEGMENT; offset++) {
    const position = firstPosition + offset
    if (PI_PAIRS[position - 1] === undefined) break
    itemIds.push(piPairItemId(position))
  }
  return { id: `pi:segment:${segment}`, itemIds }
}

export function getPiRangeScope(startSegment: number, endSegment: number): LearningScope {
  const itemIds: RecallItemId[] = []
  for (let segment = startSegment; segment <= endSegment; segment++) {
    itemIds.push(...getPiSegmentScope(segment).itemIds)
  }
  return { id: `pi:range:${startSegment}-${endSegment}`, itemIds }
}
