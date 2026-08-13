import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete } from './LearningComplete'

export function CapitalLearningComplete({ subregion, scopeLabel, onDone, onRestart, doneLabel, surface }: { subregion?: SubregionId; scopeLabel?: string; onDone: () => void; onRestart: () => void; doneLabel?: string; surface?: boolean }) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const recordedSummary = subregion
    ? 'This Learning result is now recorded for the Subregion.'
    : 'This temporary proficiency scope does not count as a learned Subregion.'
  return (
    <LearningComplete
      eyebrow="Capitals learned"
      title={`${label} capitals complete ✓`}
      summary={<>You completed Final recall for every Country-to-Capital relationship in {label}. {recordedSummary}</>}
      onDone={onDone}
      onRestart={onRestart}
      doneLabel={doneLabel}
      surface={surface}
    />
  )
}
