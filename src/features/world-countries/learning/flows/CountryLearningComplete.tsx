import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletedRegionAction, type LearningCompletionHandoff, type LearningRegionCompletion } from './LearningComplete'

export function CountryLearningComplete({ subregion, scopeLabel, countryCount, onDone, onRestart, doneLabel, completionHandoff, regionCompletion, completedRegionAction, recordCompletion = true, surface }: {
  subregion?: SubregionId
  scopeLabel?: string
  countryCount: number
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  completionHandoff?: LearningCompletionHandoff
  regionCompletion?: LearningRegionCompletion
  completedRegionAction?: LearningCompletedRegionAction
  recordCompletion?: boolean
  surface?: boolean
}) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const durable = Boolean(subregion && recordCompletion)
  return (
    <LearningComplete
      eyebrow={durable ? 'Countries learned' : 'Learning complete'}
      title={durable ? `${label} countries learned ✓` : `${label} complete ✓`}
      summary={durable
        ? <>You can now locate and recall all {countryCount} {countryCount === 1 ? 'country' : 'countries'}. We'll bring them back later so they stick.</>
        : <>You finished this practice scope. This run doesn't change your guided region progress.</>}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
      completionHandoff={durable ? completionHandoff : undefined}
      regionCompletion={durable ? regionCompletion : undefined}
      completedRegionAction={durable ? completedRegionAction : undefined}
      regionLabel={label}
      surface={surface}
    />
  )
}
