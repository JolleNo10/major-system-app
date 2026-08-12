import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CapitalLearningComplete({ subregion, onDone, onRestart }: { subregion: SubregionId; onDone: () => void; onRestart: () => void }) {
  return (
    <LearningComplete
      eyebrow="Capitals learned"
      title={`${getSubregionDefinition(subregion).label} capitals complete ✓`}
      summary={`You recalled the capital for every country in ${getSubregionDefinition(subregion).label} in one clean shuffled round. This initial-learning result is now recorded for the Subregion.`}
      onDone={onDone}
      onRestart={onRestart}
    />
  )
}
