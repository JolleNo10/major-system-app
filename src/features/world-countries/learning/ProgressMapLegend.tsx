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
  collapsibleDetails = false,
}: {
  title: string
  entries: readonly ProgressMapLegendEntry[]
  explanation: string
  mapCues: string
  ariaLabel?: string
  collapsibleDetails?: boolean
}) {
  const details = (
    <>
      <p>{explanation}</p>
      <p className="text-zinc-500">{mapCues}</p>
    </>
  )

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
      {collapsibleDetails ? (
        <details className="border-t border-zinc-800 pt-2">
          <summary className="cursor-pointer select-none font-medium text-zinc-400 transition-colors hover:text-zinc-200">
            How progress works
          </summary>
          <div className="mt-2 space-y-2">
            {details}
          </div>
        </details>
      ) : details}
    </section>
  )
}
