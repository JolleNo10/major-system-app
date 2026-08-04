const DIGITS_PER_SEGMENT = 20
const DIGITS_PER_MILESTONE = 1000

export const PI_SEGMENT_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-5 gap-1.5'

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
