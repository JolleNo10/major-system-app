import type { DrillSessionProgress } from './drillSessionProgress'

export function DrillSessionProgressBar({ progressPercent }: { progressPercent: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-label="Drill progress">
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, progressPercent)}%` }} />
    </div>
  )
}

export function DrillSessionProgressPanel({ progress }: { progress: DrillSessionProgress }) {
  return (
    <section data-drill-expanded-progress className="flex h-full flex-col justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3">
      <p className="text-xs tabular-nums text-zinc-500">Country {progress.countryPosition} / {progress.totalCountries}</p>
      <DrillSessionProgressBar progressPercent={progress.progressPercent} />
    </section>
  )
}
