import type { WorldCountriesDrillMode } from './drillModes'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  DRILL_LEARNING_READINESS_LEGEND_ENTRIES,
  getDrillProgressExplanation,
  getDrillProgressLegendEntries,
} from './drillProgressPresentation'

export function DrillProgressLegend({ mode }: { mode: WorldCountriesDrillMode }) {
  return (
    <ProgressMapLegend
      title="Map status"
      entries={getDrillProgressLegendEntries(mode)}
      explanation={getDrillProgressExplanation(mode)}
      summary="Learning Readiness is used until a Country has relevant evidence for this Drill mode."
      mapCues="Map cues: semantic fill is status; on Continent maps, a cyan outline marks selected Subregions; temporary hover treatment and Country names support geographic exploration; Countries outside the selected scope use context grey."
      groups={[
        {
          title: 'No Drill evidence',
          entries: DRILL_LEARNING_READINESS_LEGEND_ENTRIES,
          explanation: 'Learning Readiness is shown only until the selected Drill perspective has relevant evidence.',
        },
        {
          title: 'With Drill evidence',
          entries: getDrillProgressLegendEntries(mode),
          explanation: getDrillProgressExplanation(mode),
        },
      ]}
      ariaLabel="Durable progress legend"
      collapsibleDetails
    />
  )
}
