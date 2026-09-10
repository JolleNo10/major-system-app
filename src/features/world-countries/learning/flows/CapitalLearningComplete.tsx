import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletionHandoff } from './LearningComplete'

export function CapitalLearningComplete({ subregion, scopeLabel, onDone, onRestart, doneLabel, completionHandoff, recordCompletion = true, surface }: { subregion?: SubregionId; scopeLabel?: string; onDone: () => void; onRestart: () => void; doneLabel?: string; completionHandoff?: LearningCompletionHandoff; recordCompletion?: boolean; surface?: boolean }) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const durable = Boolean(subregion && recordCompletion)
  return (
    <LearningComplete
      eyebrow={durable ? 'Capitals established' : 'Learning complete'}
      title={durable ? `${label} capitals established ✓` : `${label} complete ✓`}
      summary={durable
        ? <>You completed Capital Learning for {label}. The country-capital layer is established; recall can keep strengthening over time.</>
        : <>You completed final recall for this temporary scope. This does not establish a Subregion Learning milestone.</>}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
      completionHandoff={durable ? completionHandoff : undefined}
      surface={surface}
    />
  )
}
