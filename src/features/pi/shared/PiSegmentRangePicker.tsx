import { useState, useCallback, type ReactNode } from 'react'
import { PAIRS_PER_SEGMENT, type PiSegmentStatus } from '@/features/pi/shared/piStats'
import { segmentDigitRange } from '@/features/pi/shared/piSegments'
import { PiSegmentGrid, PiSegmentDot } from '@/features/pi/shared/PiSegmentGrid'
import { usePiSegmentStatuses } from '@/features/pi/shared/usePiSegmentStatuses'
import { loadMemoedPiSegments } from '@/features/pi/shared/piProgress'

// Contiguous segment-range selector shared by the Recite and Anchors tabs. It's
// a *controlled* component working purely in 0-indexed segment indices — each
// tab converts to/from its own persistence unit (Recite: pair numbers; Anchors:
// segment indices). It owns the grid, the cell shell + range/anchor styling, the
// per-segment status dot, and the two-click selection reducer. It does NOT own
// the status line or the Start button — those differ per tab and stay there.

export interface SegmentRangeValue {
  start: number | null
  end: number | null
}

export function PiSegmentRangePicker({
  count, value, onChange, statuses, memoedSegs, renderCellBody,
}: {
  count: number
  value: SegmentRangeValue
  onChange: (next: SegmentRangeValue) => void
  statuses: PiSegmentStatus[]
  memoedSegs: Set<number>
  renderCellBody: (seg: number) => ReactNode
}) {
  // Two-click selection: first click anchors the start (end cleared); a second
  // click at or past the anchor sets the end; anything else re-anchors. Once a
  // range is complete, the next click starts over.
  const handleSegmentClick = useCallback((seg: number) => {
    if (value.start !== null && value.end === null && seg >= value.start) {
      onChange({ start: value.start, end: seg })
    } else {
      onChange({ start: seg, end: null })
    }
  }, [value.start, value.end, onChange])

  return (
    <PiSegmentGrid
      count={count}
      renderCell={seg => {
        const [from, to] = segmentDigitRange(seg)
        const inRange = value.start !== null && value.end !== null &&
                        seg >= value.start && seg <= value.end
        const isAnchor = value.end === null && seg === value.start
        return (
          <button
            onClick={() => handleSegmentClick(seg)}
            className={`relative flex flex-col items-start px-2 py-1.5 rounded-lg border transition-colors ${
              inRange
                ? 'bg-cyan-600/25 border-cyan-500/60 text-cyan-300'
                : isAnchor
                ? 'bg-amber-600/20 border-amber-500/60 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-500'
            }`}
          >
            <PiSegmentDot
              status={statuses[seg] ?? 'new'}
              memoed={memoedSegs.has(seg)}
            />
            <span className="text-[8px] opacity-60 leading-none tabular-nums">π {from}–{to}</span>
            {renderCellBody(seg)}
          </button>
        )
      }}
    />
  )
}

// The status/memoed wiring both range-picker tabs repeat: async per-segment
// learning status (re-fetched on `phase`) + the memoed-segment set + whether the
// statuses have finished loading (used by Recite's "ready to recite" rail).
export function useSegmentPickerData(maxPiPairs: number, phase: unknown): {
  statuses: PiSegmentStatus[]
  memoedSegs: Set<number>
  statusesLoading: boolean
} {
  const statuses = usePiSegmentStatuses(maxPiPairs, phase)
  const [memoedSegs] = useState(loadMemoedPiSegments)
  const maxSegments = Math.floor(maxPiPairs / PAIRS_PER_SEGMENT)
  return { statuses, memoedSegs, statusesLoading: statuses.length !== maxSegments }
}
