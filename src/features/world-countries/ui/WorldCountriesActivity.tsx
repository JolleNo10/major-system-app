import type { ReactNode } from 'react'
import {
  MapSurface,
  type MapSurfaceDockPlacement,
  useMapSurfacePresentation,
} from './MapSurface'

export interface WorldCountriesActivityProgress {
  label: string
  current?: number
  total?: number
  percent?: number
}

export interface WorldCountriesActivityTask {
  direction?: ReactNode
  cue: ReactNode
  sessionContext?: ReactNode
  progress?: WorldCountriesActivityProgress
}

function getProgressPercent(progress: WorldCountriesActivityProgress): number | null {
  if (progress.percent !== undefined && Number.isFinite(progress.percent)) {
    return Math.min(100, Math.max(0, progress.percent))
  }
  if (progress.current === undefined || progress.total === undefined || progress.total <= 0) return null
  return Math.min(100, Math.max(0, (progress.current / progress.total) * 100))
}

function hasMeaningfulProgress(progress: WorldCountriesActivityProgress | undefined): progress is WorldCountriesActivityProgress {
  return progress !== undefined && getProgressPercent(progress) !== null
}

export function WorldCountriesSessionProgressBar({ progressPercent, label }: {
  progressPercent: number
  label: string
}) {
  const percent = Math.min(100, Math.max(0, progressPercent))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"
    >
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  )
}

export function WorldCountriesSessionProgress({ progress }: {
  progress: WorldCountriesActivityProgress
}) {
  const percent = getProgressPercent(progress)
  if (!hasMeaningfulProgress(progress)) return null

  const count = progress.current !== undefined && progress.total !== undefined
    ? `${progress.current} / ${progress.total}`
    : null

  return (
    <section
      data-world-countries-session-progress
      aria-label={progress.label}
      className="flex h-full min-w-0 flex-col justify-center rounded-xl border border-zinc-800 bg-zinc-950/75 px-3 py-2"
    >
      <div className="flex items-center justify-between gap-3 text-xs tabular-nums text-zinc-400">
        <span>{count ? `${progress.label} ${count}` : progress.label}</span>
        {percent !== null && <span>{Math.round(percent)}%</span>}
      </div>
      {percent !== null && <WorldCountriesSessionProgressBar progressPercent={percent} label={progress.label} />}
    </section>
  )
}

export function WorldCountriesTaskContext({ task }: {
  task: WorldCountriesActivityTask
}) {
  const presentation = useMapSurfacePresentation()
  const expanded = presentation === 'expanded'
  const progress = expanded && hasMeaningfulProgress(task.progress) ? task.progress : null

  return (
    <section
      data-world-countries-task
      data-world-countries-task-presentation={presentation}
      className={expanded ? 'grid items-stretch gap-3 text-left xl:grid-cols-[minmax(0,1fr)_minmax(0,28%)]' : 'rounded-xl border border-zinc-800 bg-zinc-950/55 px-4 py-3 text-center'}
    >
      <div data-world-countries-task-card={expanded ? true : undefined} className={expanded ? 'min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/55 px-4 py-2' : undefined}>
        <div data-world-countries-task-copy className={expanded ? 'min-w-0 text-left' : undefined}>
          {task.direction && <p data-world-countries-task-direction className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-400">{task.direction}</p>}
          <div
            data-world-countries-task-main={expanded && task.sessionContext ? true : undefined}
            className={expanded && task.sessionContext ? 'mt-1 flex min-w-0 flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-6' : undefined}
          >
            <h1 data-world-countries-task-cue className={`${expanded && task.sessionContext ? 'min-w-0 flex-1' : 'mt-1'} text-2xl font-black tracking-tight text-zinc-100`}>{task.cue}</h1>
            {expanded && task.sessionContext && (
              <div data-world-countries-task-context className="min-w-0 text-left text-xs font-medium text-zinc-500 lg:shrink-0 lg:whitespace-nowrap lg:text-right">
                {task.sessionContext}
              </div>
            )}
          </div>
        </div>
      </div>
      {progress && (
        <div data-world-countries-task-progress className="min-w-0">
          <WorldCountriesSessionProgress progress={progress} />
        </div>
      )}
    </section>
  )
}

export function WorldCountriesMapActivitySurface({
  task,
  map,
  mapMeta,
  feedbackOverlay,
  dock,
  dockPlacement = 'overlay',
  className = '',
}: {
  task: WorldCountriesActivityTask
  map: ReactNode
  mapMeta?: ReactNode
  feedbackOverlay?: ReactNode
  dock?: ReactNode
  dockPlacement?: MapSurfaceDockPlacement
  className?: string
}) {
  return (
    <MapSurface
      context={<WorldCountriesTaskContext task={task} />}
      map={map}
      mapMeta={mapMeta}
      feedbackOverlay={feedbackOverlay}
      dock={dock}
      dockPlacement={dockPlacement}
      className={className}
    />
  )
}
