import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletedRegionAction, type LearningCompletionHandoff, type LearningRegionCompletion } from './LearningComplete'

export function CapitalLearningComplete({ subregion, scopeLabel, onDone, onRestart, doneLabel, completionHandoff, regionCompletion, completedRegionAction, recordCompletion = true, surface }: { subregion?: SubregionId; scopeLabel?: string; onDone: () => void; onRestart: () => void; doneLabel?: string; completionHandoff?: LearningCompletionHandoff; regionCompletion?: LearningRegionCompletion; completedRegionAction?: LearningCompletedRegionAction; recordCompletion?: boolean; surface?: boolean }) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const durable = Boolean(subregion && recordCompletion)
  return (
    <LearningComplete
      eyebrow={durable ? 'Capitals learned' : 'Learning complete'}
      title={durable ? `${label} capitals learned ✓` : `${label} complete ✓`}
      summary={durable
          ? <>You've connected each country with its capital. We'll bring them back later so the links get stronger.</>
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
