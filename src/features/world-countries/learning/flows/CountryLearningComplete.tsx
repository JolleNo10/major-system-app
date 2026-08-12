import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CountryLearningComplete({ subregion, countryCount, onDone, onRestart }: {
  subregion: SubregionId
  countryCount: number
  onDone: () => void
  onRestart: () => void
}) {
  return (
    <LearningComplete
      eyebrow="Countries learned"
      title={`${getSubregionDefinition(subregion).label} complete ✓`}
      summary={`You completed one clean ordered recall from country #1 through country #${countryCount}. This durable learning result is now recorded for the Subregion.`}
      onDone={onDone}
      onRestart={onRestart}
    />
  )
}
