import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CountryLearningComplete({ subregion, countryCount, onDone, onRestart, doneLabel }: {
  subregion: SubregionId
  countryCount: number
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
}) {
  return (
    <LearningComplete
      eyebrow="Countries learned"
      title={`${getSubregionDefinition(subregion).label} complete ✓`}
      summary={`You completed Final recall from country #1 through country #${countryCount}. This Learning result is now recorded for the Subregion.`}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
    />
  )
}
