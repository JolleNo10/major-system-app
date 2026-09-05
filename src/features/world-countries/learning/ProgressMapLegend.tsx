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
  summary,
  groups,
  ariaLabel = 'Progress map legend',
  collapsibleDetails = false,
}: {
  title: string
  entries: readonly ProgressMapLegendEntry[]
  explanation: string
  mapCues: string
  summary?: string
  groups?: readonly ProgressMapLegendGroup[]
  ariaLabel?: string
  collapsibleDetails?: boolean
}) {
  const visibleGroups = groups ?? [{ title, entries, explanation }]
  const groupedExplanations = groups?.filter(group => group.explanation) ?? []
  const details = (
    <>
      {groupedExplanations.map(group => (
        <p key={`${group.title}-explanation`}>
          <span className="font-medium text-zinc-300">{group.title}:</span> {group.explanation}
        </p>
      ))}
      {(!groups || !groupedExplanations.some(group => group.explanation === explanation)) && <p>{explanation}</p>}
      <p className="text-zinc-500">{mapCues}</p>
    </>
  )

  return (
    <section
      className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-xs text-zinc-400"
      aria-label={ariaLabel}
    >
      <div className={groups ? 'flex flex-wrap items-center gap-x-4 gap-y-1.5' : 'space-y-2'}>
        {groups && <span className="font-semibold text-zinc-300">{title}</span>}
        {visibleGroups.map(group => (
          <div
            key={group.title}
            className={groups ? 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1' : 'flex flex-wrap items-center gap-x-4 gap-y-2'}
            data-progress-group={group.title}
          >
            <span className={groups ? 'shrink-0 font-semibold text-zinc-400' : 'font-semibold text-zinc-300'}>{group.title}</span>
            <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
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
            {!groups && group.explanation && <p className="basis-full text-zinc-400">{group.explanation}</p>}
          </div>
        ))}
      </div>
      {summary && <p className="text-zinc-400" data-progress-summary>{summary}</p>}
      {collapsibleDetails ? (
        <details className="border-t border-zinc-800 pt-2">
          <summary className="cursor-pointer select-none font-medium text-zinc-400 transition-colors hover:text-zinc-200">
            How progress works
          </summary>
          <div className="mt-2 space-y-2">
            {details}
          </div>
        </details>
      ) : (
        <>
          {!groups && <p>{explanation}</p>}
          <p className="text-zinc-500">{mapCues}</p>
        </>
      )}
    </section>
  )
}
