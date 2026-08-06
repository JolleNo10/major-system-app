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
  const activeRef = useRef<'low' | 'high' | null>(null)

  const toPercent = (v: number) => ((v - min) / (max - min)) * 100

  const fromPointer = (clientX: number): number => {
    if (!trackRef.current) return min
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(pct * (max - min) + min)
  }

  // Which thumb should respond to a press/drag at value v
  const pickThumb = (v: number): 'low' | 'high' => {
    if (low === high) return v < low ? 'low' : 'high'
    return Math.abs(v - low) <= Math.abs(v - high) ? 'low' : 'high'
  }

  const apply = (thumb: 'low' | 'high', v: number) => {
    if (thumb === 'low') onChange(Math.min(v, high), high)
    else onChange(low, Math.max(v, low))
  }

  // Pointer handlers live on the tall track band so tap-to-set and drag both
  // work with mouse and touch (no reliance on e.buttons, which is 0 on touch).
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = fromPointer(e.clientX)
    const thumb = pickThumb(v)
    activeRef.current = thumb
    apply(thumb, v)
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return
    apply(activeRef.current, fromPointer(e.clientX))
  }
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activeRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  const lowPct = toPercent(low)
  const highPct = toPercent(high)
  const fmt = (v: number) => String(v).padStart(2, '0')

  const thumbCls =
    'absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-violet-500 shadow-md z-10 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950'

  return (
    <div className="w-full select-none">
      {/* Value labels — float above each thumb */}
      <div className="relative h-7 mb-1 mx-2.5">
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
            only {fmt(low)}
          </span>
        )}
      </div>

      {/* Tall tappable band (44px) — tap anywhere to set the nearest thumb, or drag */}
      <div
        className="relative h-11 touch-none cursor-pointer"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Visual track, vertically centered */}
        <div ref={trackRef} className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 h-2 bg-zinc-700 rounded-full">
          {/* Active fill */}
          <div
            className="absolute top-0 h-full bg-violet-600 rounded-full"
            style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
          />

          {/* Low thumb (visual + keyboard target) */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Range start"
            aria-valuemin={min}
            aria-valuemax={high}
            aria-valuenow={low}
            className={thumbCls}
            style={{ left: `${lowPct}%`, transform: 'translate(-50%, -50%)' }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(min, low - 1), high) }
              else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(low + 1, high), high) }
              else if (e.key === 'Home') { e.preventDefault(); onChange(min, high) }
              else if (e.key === 'End') { e.preventDefault(); onChange(high, high) }
            }}
          />

          {/* High thumb (visual + keyboard target) */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Range end"
            aria-valuemin={low}
            aria-valuemax={max}
            aria-valuenow={high}
            className={thumbCls}
            style={{ left: `${highPct}%`, transform: 'translate(-50%, -50%)' }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(low, Math.max(low, high - 1)) }
              else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(low, Math.min(max, high + 1)) }
              else if (e.key === 'Home') { e.preventDefault(); onChange(low, low) }
              else if (e.key === 'End') { e.preventDefault(); onChange(low, max) }
            }}
          />
        </div>
      </div>

      {/* Min / Max edge labels */}
      <div className="flex justify-between mt-2 mx-2.5 text-xs text-zinc-600 tabular-nums">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}
