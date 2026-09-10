import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletionHandoff } from './LearningComplete'

export function CountryLearningComplete({ subregion, scopeLabel, countryCount, onDone, onRestart, doneLabel, completionHandoff, recordCompletion = true, surface }: {
  subregion?: SubregionId
  scopeLabel?: string
  countryCount: number
  onDone: () => void
  onRestart: () => void
  doneLabel?: string
  completionHandoff?: LearningCompletionHandoff
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
      surface={surface}
    />
  )
}
