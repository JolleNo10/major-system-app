export interface ProgressMapLegendEntry {
  state: string
  label: string
  color: string
}

export function ProgressMapLegend({
  title,
  entries,
  explanation,
  mapCues,
  ariaLabel = 'Progress map legend',
}: {
  title: string
  entries: readonly ProgressMapLegendEntry[]
  explanation: string
  mapCues: string
  ariaLabel?: string
}) {
  return (
    <section
      className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-xs text-zinc-400"
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-semibold text-zinc-300">{title}</span>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {entries.map(entry => (
            <li
              key={entry.state}
              className="inline-flex items-center gap-1.5"
              data-progress-state={entry.state}
            >
              <i
                className="h-3 w-3 rounded-sm border border-white/15"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span>{entry.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <p>{explanation}</p>
      <p className="text-zinc-500">{mapCues}</p>
    </section>
  )
}
