import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CapitalLearningComplete({ subregion, onDone, onRestart, doneLabel, surface }: { subregion: SubregionId; onDone: () => void; onRestart: () => void; doneLabel?: string; surface?: boolean }) {
  return (
    <LearningComplete
      eyebrow="Capitals learned"
      title={`${getSubregionDefinition(subregion).label} capitals complete ✓`}
      summary={`You completed Final recall for every Country-to-Capital relationship in ${getSubregionDefinition(subregion).label}. This Learning result is now recorded for the Subregion.`}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
      surface={surface}
    />
  )
}
