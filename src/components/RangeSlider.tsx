import { useRef } from 'react'

interface Props {
  low: number
  high: number
  onChange: (low: number, high: number) => void
  min?: number
  max?: number
}

export function RangeSlider({ low, high, onChange, min = 0, max = 99 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100

  const fromPointer = (clientX: number): number => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(pct * (max - min) + min)
  }

  const lowPct = toPercent(low)
  const highPct = toPercent(high)

  const fmt = (v: number) => String(v).padStart(2, '0')

  return (
    <div className="w-full select-none">
      {/* Value labels — float above each thumb */}
      <div className="relative h-7 mb-1">
        <span
          className="absolute -translate-x-1/2 text-sm font-bold tabular-nums text-violet-300 transition-[left] duration-75"
          style={{ left: `${lowPct}%` }}
        >
          {fmt(low)}
        </span>
        {high !== low && (
          <span
            className="absolute -translate-x-1/2 text-sm font-bold tabular-nums text-violet-300 transition-[left] duration-75"
            style={{ left: `${highPct}%` }}
          >
            {fmt(high)}
          </span>
        )}
        {high === low && (
          <span
            className="absolute -translate-x-1/2 text-xs text-zinc-500 mt-4 whitespace-nowrap transition-[left] duration-75"
            style={{ left: `${lowPct}%` }}
          >
            kun {fmt(low)}
          </span>
        )}
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-2 bg-zinc-700 rounded-full mx-2.5">
        {/* Active fill */}
        <div
          className="absolute top-0 h-full bg-violet-600 rounded-full"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />

        {/* Low thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={high}
          aria-valuenow={low}
          className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-violet-500 shadow-md cursor-pointer touch-none z-10
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          style={{ left: `${lowPct}%`, transform: 'translate(-50%, -50%)' }}
          onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={e => {
            if (!(e.buttons & 1)) return
            onChange(Math.min(fromPointer(e.clientX), high), high)
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min, low - 1), high) }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(low + 1, high), high) }
            else if (e.key === 'Home') { e.preventDefault(); onChange(min, high) }
            else if (e.key === 'End') { e.preventDefault(); onChange(high, high) }
          }}
        />

        {/* High thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={low}
          aria-valuemax={max}
          aria-valuenow={high}
          className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-violet-500 shadow-md cursor-pointer touch-none z-10
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          style={{ left: `${highPct}%`, transform: 'translate(-50%, -50%)' }}
          onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={e => {
            if (!(e.buttons & 1)) return
            onChange(low, Math.max(fromPointer(e.clientX), low))
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(low, Math.max(low, high - 1)) }
            else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(low, Math.min(max, high + 1)) }
            else if (e.key === 'Home') { e.preventDefault(); onChange(low, low) }
            else if (e.key === 'End') { e.preventDefault(); onChange(low, max) }
          }}
        />
      </div>

      {/* Min / Max edge labels */}
      <div className="flex justify-between mt-2 text-xs text-zinc-600 tabular-nums">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}
