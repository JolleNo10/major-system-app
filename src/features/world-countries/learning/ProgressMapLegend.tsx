export interface ProgressMapLegendEntry {
  state: string
  label: string
  color: string
}

export interface ProgressMapLegendGroup {
  title: string
  entries: readonly ProgressMapLegendEntry[]
  explanation?: string
}

export function ProgressMapLegend({
  title,
  entries,
  explanation,
  mapCues,
  groups,
  ariaLabel = 'Progress map legend',
}: {
  title: string
  entries: readonly ProgressMapLegendEntry[]
  explanation: string
  mapCues: string
  groups?: readonly ProgressMapLegendGroup[]
  ariaLabel?: string
}) {
  const visibleGroups = groups ?? [{ title, entries, explanation }]
  return (
    <section
      className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-xs text-zinc-400"
      aria-label={ariaLabel}
    >
      <div className="space-y-2">
        {visibleGroups.map(group => (
          <div key={group.title} className="flex flex-wrap items-center gap-x-4 gap-y-2" data-progress-group={group.title}>
            <span className="font-semibold text-zinc-300">{group.title}</span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {group.entries.map(entry => (
                <li
                  key={`${group.title}-${entry.state}`}
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
            {group.explanation && <p className="basis-full text-zinc-400">{group.explanation}</p>}
          </div>
        ))}
      </div>
      {!groups && <p>{explanation}</p>}
      <p className="text-zinc-500">{mapCues}</p>
    </section>
  )
}
