import { Fragment, useState, type ReactNode } from 'react'
import type { PiSegmentStatus } from '@/features/pi/shared/piStats'
import { PAIRS_PER_SEGMENT } from '@/features/pi/shared/piStats'
import { PI_PAIRS } from '@/features/pi/shared/piDigits'
import { segmentDigitRange } from '@/features/pi/shared/piSegments'
import { readJSON, safeSet } from '@/core/storage'

const DIGITS_PER_SEGMENT = 20
const BLOCK_SEGMENTS = 50                 // 50 segments × 20 digits = 1000 digits
const DIGITS_PER_BLOCK = BLOCK_SEGMENTS * DIGITS_PER_SEGMENT
const COLLAPSED_KEY = 'major-pi-collapsed-blocks'

export const PI_SEGMENT_GRID_CLASS = 'grid grid-cols-4 sm:grid-cols-5 gap-1.5'

// Persisted, shared across all three Pi grids (only one is mounted at a time,
// so read-on-mount / write-on-toggle keeps them in sync).
function loadCollapsed(): Set<number> {
  return new Set(readJSON<number[]>(COLLAPSED_KEY, []))
}
function saveCollapsed(set: Set<number>): void {
  safeSet(COLLAPSED_KEY, JSON.stringify([...set]))
}

// Corner status dot for a segment cell. Independent of selection colour (which
// owns the cell fill): emerald = learned through recitation, amber = practising
// recitation, zinc = memorised correctly but not yet recited, nothing = new.
// Requires the containing button to be `relative`.
export function PiSegmentDot({ status, memoed = false, title }: {
  status: PiSegmentStatus
  memoed?: boolean
  title?: string           // hover detail; falls back to the bare status word
}) {
  if (status === 'new' && !memoed) return null
  const label = title ?? (status === 'learned'
    ? 'learned'
    : status === 'weak'
      ? 'practising'
      : 'memorised correctly')
  const cls = status === 'learned'
    ? 'bg-emerald-400'
    : status === 'weak'
      ? 'bg-amber-400'
      : 'bg-zinc-400'
  return (
    <span
      className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${cls}`}
      aria-label={label}
      title={label}
    />
  )
}

// Inline legend for a segment grid's cell indicators. Each item's `swatch` is
// the class(es) for a 1.5×1.5 dot (a `bg-*` fill or a `ring-1 ring-*` outline).
// Mirrors the Anchors pace legend so all three tabs read the same.
export function PiLegend({ items }: {
  items: { swatch: string; label: string }[]
}) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[10px] text-zinc-500">
      {items.map(it => (
        <span key={it.label} className="flex items-center gap-1">
          <span className={`h-1.5 w-1.5 rounded-full ${it.swatch}`} />
          {it.label}
        </span>
      ))}
    </span>
  )
}

// Compact content preview shared by the Pi right-rail cards. It identifies a
// range by the useful digit positions and pairs rather than internal segment
// numbers. Longer ranges keep the preview compact by showing both ends.
export function PiSegmentRangePreview({ startSeg, endSeg = startSeg }: {
  startSeg: number
  endSeg?: number
}) {
  const [from] = segmentDigitRange(startSeg)
  const [, to] = segmentDigitRange(endSeg)
  const pairs = PI_PAIRS.slice(
    startSeg * PAIRS_PER_SEGMENT,
    (endSeg + 1) * PAIRS_PER_SEGMENT,
  )
  const preview = pairs.length <= PAIRS_PER_SEGMENT
    ? pairs
    : [...pairs.slice(0, 5), '…', ...pairs.slice(-5)]

  return (
    <div className="mt-0.5 space-y-1">
      <div className="text-[10px] tabular-nums text-zinc-500">π digits {from}–{to}</div>
      <div className="font-mono text-[10px] tabular-nums leading-snug text-zinc-200">
        {preview.join(' ')}
      </div>
    </div>
  )
}

// Segment grid shared by Memo / Recite / Anchors. `renderCell(segIdx)` builds
// the tab-specific button; this owns the grid container plus the 1000-digit
// block dividers. Each divider is a toggle that collapses the block *above* it
// (its 50 segments); collapse state is persisted and shared across the grids.
// With a single block (Max π digits < 1050) there are no dividers — flat grid.
export function PiSegmentGrid({ count, renderCell }: {
  count: number
  renderCell: (segIdx: number) => ReactNode
}) {
  const [collapsed, setCollapsed] = useState<Set<number>>(loadCollapsed)
  const hasBlocks = count > BLOCK_SEGMENTS

  const toggle = (blockIdx: number) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(blockIdx)) next.delete(blockIdx)
      else next.add(blockIdx)
      saveCollapsed(next)
      return next
    })
  }

  return (
    <div className={PI_SEGMENT_GRID_CLASS}>
      {Array.from({ length: count }, (_, segIdx) => {
        const blockIdx = Math.floor(segIdx / BLOCK_SEGMENTS)
        const isCollapsed = hasBlocks && collapsed.has(blockIdx)
        // A divider closes a block when this is its 50th segment.
        const showDivider = hasBlocks && (segIdx + 1) % BLOCK_SEGMENTS === 0
        return (
          <Fragment key={segIdx}>
            {!isCollapsed && renderCell(segIdx)}
            {showDivider && (
              <PiBlockDivider
                digits={(blockIdx + 1) * DIGITS_PER_BLOCK}
                collapsed={collapsed.has(blockIdx)}
                onToggle={() => toggle(blockIdx)}
              />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// The clickable 1000-digit divider: a full-width row that collapses the block
// above it. Chevron reflects state; the digit label stays as the milestone cue.
function PiBlockDivider({ digits, collapsed, onToggle }: {
  digits: number
  collapsed: boolean
  onToggle: () => void
}) {
  const label = `${digits.toLocaleString('en-US')} digits`
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} the block up to ${label}`}
      className="col-span-full flex items-center gap-2 py-1 group"
    >
      <span className="text-[9px] text-cyan-500/70 group-hover:text-cyan-400 tabular-nums transition-colors">
        {collapsed ? '▸' : '▾'}
      </span>
      <span className="h-px flex-1 bg-cyan-500/30" />
      <span className="text-[9px] font-medium uppercase tracking-widest text-cyan-500/60 group-hover:text-cyan-400 tabular-nums transition-colors">
        {label}{collapsed ? ' · collapsed' : ''}
      </span>
      <span className="h-px flex-1 bg-cyan-500/30" />
    </button>
  )
}
