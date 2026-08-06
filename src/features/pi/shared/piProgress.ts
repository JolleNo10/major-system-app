import { readJSON, safeSet } from '@/core/storage'
import type { PiSegmentStatus, PiSession } from '@/features/pi/shared/piStats'

const MEMOED_SEGMENTS_KEY = 'major-pi-memoed-segs'
const RECITED_SEGMENTS_KEY = 'major-pi-recited-segs'

export const PI_PAIRS_PER_SEGMENT = 10

export interface PiSegmentRange {
  startSeg: number
  endSeg: number
}

function loadSegmentSet(key: string): Set<number> {
  const values = readJSON<unknown>(key, [])
  if (!Array.isArray(values)) return new Set()
  return new Set(values.filter((value): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0,
  ))
}

function saveSegmentSet(key: string, segments: ReadonlySet<number>): void {
  safeSet(key, JSON.stringify([...segments].sort((a, b) => a - b)))
}

export function loadMemoedPiSegments(): Set<number> {
  return loadSegmentSet(MEMOED_SEGMENTS_KEY)
}

export function saveMemoedPiSegments(segments: ReadonlySet<number>): void {
  saveSegmentSet(MEMOED_SEGMENTS_KEY, segments)
}

export function loadFlawlesslyRecitedPiSegments(): Set<number> {
  return loadSegmentSet(RECITED_SEGMENTS_KEY)
}

export function saveFlawlesslyRecitedPiSegments(segments: ReadonlySet<number>): void {
  saveSegmentSet(RECITED_SEGMENTS_KEY, segments)
}

// Return each full 10-pair segment that was flawless in this run. Recite ranges
// are segment-aligned, but the guards keep partial/non-aligned callers from
// accidentally completing a segment.
export function flawlessSegmentsFromRun(anchor: number, correctness: readonly boolean[]): number[] {
  if (anchor < 1 || (anchor - 1) % PI_PAIRS_PER_SEGMENT !== 0) return []

  const firstSeg = (anchor - 1) / PI_PAIRS_PER_SEGMENT
  const flawless: number[] = []
  for (let offset = 0; offset + PI_PAIRS_PER_SEGMENT <= correctness.length; offset += PI_PAIRS_PER_SEGMENT) {
    const segmentResults = correctness.slice(offset, offset + PI_PAIRS_PER_SEGMENT)
    if (segmentResults.every(Boolean)) flawless.push(firstSeg + offset / PI_PAIRS_PER_SEGMENT)
  }
  return flawless
}

// Sessions predate explicit flawless-segment persistence. A perfect, aligned
// historical run proves that every complete segment it covered was flawless.
export function flawlessSegmentsFromSessions(
  sessions: readonly PiSession[],
  maxSegments: number,
): Set<number> {
  const flawless = new Set<number>()
  for (const session of sessions) {
    if (session.correctPairs !== session.pairs) continue
    const results = Array<boolean>(session.pairs).fill(true)
    for (const seg of flawlessSegmentsFromRun(session.anchor, results)) {
      if (seg < maxSegments) flawless.add(seg)
    }
  }
  return flawless
}

export function pendingMemoedSegmentRanges(
  memoed: ReadonlySet<number>,
  flawlesslyRecited: ReadonlySet<number>,
  statuses: readonly PiSegmentStatus[],
  maxSegments: number,
): PiSegmentRange[] {
  const pending = [...memoed]
    .filter(seg => seg >= 0 && seg < maxSegments)
    .filter(seg => !flawlesslyRecited.has(seg) && statuses[seg] !== 'learned')
    .sort((a, b) => a - b)

  const ranges: PiSegmentRange[] = []
  for (const seg of pending) {
    const last = ranges[ranges.length - 1]
    if (last && seg === last.endSeg + 1) last.endSeg = seg
    else ranges.push({ startSeg: seg, endSeg: seg })
  }
  return ranges
}
