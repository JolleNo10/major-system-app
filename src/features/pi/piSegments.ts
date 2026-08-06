import { PI_PAIRS } from '@/features/pi/piDigits'
import { PAIRS_PER_SEGMENT } from '@/features/pi/piStats'

// π is memorised in fixed segments of PAIRS_PER_SEGMENT pairs (= 20 decimal
// digits). These map a 0-indexed segment to its position in π. The segment's
// *anchor* is its opening pair — the hook you need to recall to know which
// segment comes next.

// 1-indexed π position of the segment's first pair (seg 0 → 1, seg 3 → 31).
export function segmentAnchorPos(seg: number): number {
  return seg * PAIRS_PER_SEGMENT + 1
}

// Inclusive 1-indexed decimal-digit range the segment covers (seg 3 → [61, 80]).
export function segmentDigitRange(seg: number): [number, number] {
  return [seg * PAIRS_PER_SEGMENT * 2 + 1, (seg + 1) * PAIRS_PER_SEGMENT * 2]
}

// The opening pair of `count` consecutive segments starting at `startSeg`.
// Truncated if the range runs past the end of the π data.
export function segmentAnchorPairs(startSeg: number, count: number): string[] {
  const pairs: string[] = []
  for (let seg = startSeg; seg < startSeg + count; seg++) {
    const pair = PI_PAIRS[segmentAnchorPos(seg) - 1]
    if (pair === undefined) break
    pairs.push(pair)
  }
  return pairs
}
