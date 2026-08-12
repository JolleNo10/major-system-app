import type { DrillResultSummary } from './drillResultSummary'
import { DrillResultStat } from './DrillResultStat'

export function DrillResultStats({
  summary,
  answerCount,
  showCountryCount = false,
  ariaLabel = 'Drill summary',
}: {
  summary: DrillResultSummary
  answerCount: number
  showCountryCount?: boolean
  ariaLabel?: string
}) {
  return (
    <section className={showCountryCount ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'} aria-label={ariaLabel}>
      <DrillResultStat label="Correct" value={`${summary.correct}/${answerCount}`} />
      <DrillResultStat label="Accuracy" value={`${summary.accuracy}%`} />
      {showCountryCount && <DrillResultStat label="Countries" value={String(summary.countryCount)} />}
    </section>
  )
}
