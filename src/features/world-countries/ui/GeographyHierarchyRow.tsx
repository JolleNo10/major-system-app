import type { ReactNode } from 'react'

export interface GeographyHierarchyRowProps {
  label: string
  groupId: string
  hoveredGroupId: string | null
  onHoverGroup: (groupId: string | null) => void
  onClick: () => void
  selected?: boolean
  disabled?: boolean
  sequenceNumber?: number
  secondary?: ReactNode
  trailing?: ReactNode
}

/** Shared map-linked hierarchy row; callers retain geography and workflow policy. */
export function GeographyHierarchyRow({
  label,
  groupId,
  hoveredGroupId,
  onHoverGroup,
  onClick,
  selected,
  disabled = false,
  sequenceNumber,
  secondary,
  trailing,
}: GeographyHierarchyRowProps) {
  const hovered = hoveredGroupId === groupId
  const selectedClass = selected
    ? hovered
      ? 'border-cyan-400 bg-cyan-950/60 text-zinc-100 ring-1 ring-cyan-400/60'
      : 'border-cyan-500/70 bg-cyan-500/10 text-cyan-100'
    : hovered
      ? 'border-cyan-500 bg-cyan-950/60 text-zinc-100'
      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-cyan-500 hover:text-zinc-100'

  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => onHoverGroup(groupId)}
        onMouseLeave={() => onHoverGroup(null)}
        onFocus={() => onHoverGroup(groupId)}
        onBlur={() => onHoverGroup(null)}
        className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${disabled ? 'cursor-not-allowed opacity-50' : selectedClass}`}
      >
        {selected && <span aria-hidden="true" className="text-cyan-400">✓</span>}
        {sequenceNumber !== undefined && <span className="w-5 shrink-0 text-right text-xs tabular-nums text-zinc-600">{sequenceNumber}.</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          {secondary !== undefined && <span className="mt-0.5 block text-xs text-zinc-500">{secondary}</span>}
        </span>
        {trailing !== undefined && <span className="shrink-0 text-xs tabular-nums text-zinc-500">{trailing}</span>}
      </button>
    </li>
  )
}
