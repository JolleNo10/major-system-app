import type { PiSegmentStatus } from '../../data/piStats'

const DIGITS_PER_SEGMENT = 20
const DIGITS_PER_MILESTONE = 1000

export const PI_SEGMENT_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-5 gap-1.5'

// Corner status dot for a segment cell. Independent of selection colour (which
// owns the cell fill): emerald = learned, amber = practising, nothing = new.
// Requires the containing button to be `relative`.
export function PiSegmentDot({ status }: { status: PiSegmentStatus }) {
  if (status === 'new') return null
  const cls = status === 'learned' ? 'bg-emerald-400' : 'bg-amber-400'
  return (
    <span
      className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${cls}`}
      aria-label={status === 'learned' ? 'learned' : 'practising'}
    />
  )
}

interface Props { completedSegments: number }

export function PiSegmentMilestone({ completedSegments }: Props) {
  const digits = completedSegments * DIGITS_PER_SEGMENT
  if (digits === 0 || digits % DIGITS_PER_MILESTONE !== 0) return null

  return (
    <div
      className="col-span-full flex items-center gap-2 py-1"
      aria-label={`${digits.toLocaleString('en-US')} digits`}
    >
      <span className="h-px flex-1 bg-cyan-500/30" />
      <span className="text-[9px] font-medium uppercase tracking-widest text-cyan-500/60 tabular-nums">
        {digits.toLocaleString('en-US')} digits
      </span>
      <span className="h-px flex-1 bg-cyan-500/30" />
    </div>
  )
}
