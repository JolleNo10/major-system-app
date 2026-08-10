import type { WorldCountriesDrillMode } from './drillModes'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  DRILL_MEMO_READINESS_LEGEND_ENTRIES,
  getDrillProgressExplanation,
  getDrillProgressLegendEntries,
} from './drillProgressPresentation'

export function DrillProgressLegend({ mode }: { mode: WorldCountriesDrillMode }) {
  return (
    <ProgressMapLegend
      title="Progress"
      entries={getDrillProgressLegendEntries(mode)}
      explanation={getDrillProgressExplanation(mode)}
      mapCues="Map cues: a neutral outline is temporary hover or recall focus, not progress; Countries outside the selected scope use context grey."
      groups={[
        {
          title: 'No Drill evidence',
          entries: DRILL_MEMO_READINESS_LEGEND_ENTRIES,
          explanation: 'Memo readiness is shown only until the selected Drill perspective has relevant evidence.',
        },
        {
          title: 'Drill proficiency',
          entries: getDrillProgressLegendEntries(mode),
          explanation: getDrillProgressExplanation(mode),
        },
      ]}
      ariaLabel="Durable progress legend"
      collapsibleDetails
    />
  )
}
