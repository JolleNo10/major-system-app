import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CountryLearningComplete({ subregion, scopeLabel, countryCount, onDone, onRestart, doneLabel, surface }: {
  subregion?: SubregionId
  scopeLabel?: string
  countryCount: number
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  surface?: boolean
}) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const recordedSummary = subregion
    ? 'This Learning result is now recorded for the Subregion.'
    : 'This temporary proficiency scope does not count as a learned Subregion.'
  return (
    <LearningComplete
      eyebrow="Countries learned"
      title={`${label} complete ✓`}
      summary={<>You completed Final recall from country #1 through country #{countryCount}. {recordedSummary}</>}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
      surface={surface}
    />
  )
}
