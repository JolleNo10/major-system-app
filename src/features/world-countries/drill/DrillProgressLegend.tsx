import type { WorldCountriesDrillMode } from './drillModes'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  DRILL_MEMO_READINESS_LEGEND_ENTRIES,
  getDrillProgressExplanation,
  getDrillProgressLegendEntries,
  getDrillProgressLegendTitle,
} from './drillProgressPresentation'

export function DrillProgressLegend({ mode }: { mode: WorldCountriesDrillMode }) {
  return (
    <ProgressMapLegend
      title="Drill map status"
      entries={getDrillProgressLegendEntries(mode)}
      explanation={getDrillProgressExplanation(mode)}
      mapCues="Map cues: teal/cyan is temporary hover or recall focus, not progress; Countries outside the selected scope are dimmed."
      groups={[
        {
          title: 'No Drill evidence',
          entries: DRILL_MEMO_READINESS_LEGEND_ENTRIES,
          explanation: 'Memo readiness is shown only until the selected Drill perspective has relevant evidence.',
        },
        {
          title: `Drill proficiency · ${getDrillProgressLegendTitle(mode)}`,
          entries: getDrillProgressLegendEntries(mode),
          explanation: getDrillProgressExplanation(mode),
        },
      ]}
      ariaLabel="Durable progress legend"
    />
  )
}
