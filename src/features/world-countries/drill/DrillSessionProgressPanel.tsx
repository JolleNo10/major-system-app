export function DrillSessionProgressBar({ progressPercent, label = 'Drill progress' }: { progressPercent: number; label?: string }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-label={label}>
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, progressPercent)}%` }} />
    </div>
  )
}
