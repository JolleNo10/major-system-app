import type { WorldCountriesDrillMode } from './drillModes'
import { ProgressMapLegend } from '@/features/world-countries/learning/ProgressMapLegend'
import {
  getDrillProgressExplanation,
  getDrillProgressLegendEntries,
} from './drillProgressPresentation'

export function DrillProgressLegend({ mode }: { mode: WorldCountriesDrillMode }) {
  return (
    <ProgressMapLegend
      title="Progress"
      entries={getDrillProgressLegendEntries(mode)}
      explanation={getDrillProgressExplanation(mode)}
      mapCues="Map cues: teal/cyan is temporary hover or recall focus, not progress; Countries outside the selected scope are dimmed."
      ariaLabel="Durable progress legend"
      collapsibleDetails
    />
  )
}
