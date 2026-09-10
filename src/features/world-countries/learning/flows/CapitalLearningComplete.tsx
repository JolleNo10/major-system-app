import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletionHandoff } from './LearningComplete'

export function CapitalLearningComplete({ subregion, scopeLabel, onDone, onRestart, doneLabel, completionHandoff, recordCompletion = true, surface }: { subregion?: SubregionId; scopeLabel?: string; onDone: () => void; onRestart: () => void; doneLabel?: string; completionHandoff?: LearningCompletionHandoff; recordCompletion?: boolean; surface?: boolean }) {
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
      surface={surface}
    />
  )
}
