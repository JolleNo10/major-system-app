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
    <section data-drill-expanded-progress className="flex h-full flex-col justify-center rounded-[18px] border border-white/[0.11] bg-[linear-gradient(180deg,rgba(20,22,28,0.54),rgba(11,12,16,0.72))] px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[18px] backdrop-saturate-125">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] tabular-nums text-zinc-400">Country {progress.countryPosition} / {progress.totalCountries}</p>
      <DrillSessionProgressBar progressPercent={progress.progressPercent} />
    </section>
  )
}
