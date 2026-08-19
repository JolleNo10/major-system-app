import type { LearningPracticeProgress } from '@/features/world-countries/learning/learningPracticeProgress'

export function SchedulerPracticeProgress({
  progress,
}: {
  progress: LearningPracticeProgress | null | undefined
}) {
  if (!progress) return null

  const percentage = progress.pct * 100
  const visiblePercentage = Math.round(percentage)

  return (
    <section aria-labelledby="scheduler-practice-progress-heading" className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <h3 id="scheduler-practice-progress-heading" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Practice progress</h3>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">{visiblePercentage}%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          role="progressbar"
          aria-label="Practice progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-valuetext={`${visiblePercentage}%`}
          className="h-full rounded-full bg-cyan-400 transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs tabular-nums text-zinc-400">{progress.atTarget} / {progress.total} at target</p>
    </section>
  )
}
