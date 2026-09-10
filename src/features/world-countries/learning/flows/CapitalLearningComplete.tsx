import type { SubregionId } from '@/features/world-countries/data/subregions'
import { getSubregionDefinition } from '@/features/world-countries/data/subregions'
import { LearningComplete, type LearningCompletionHandoff, type LearningRegionCompletion } from './LearningComplete'

export function CapitalLearningComplete({ subregion, scopeLabel, onDone, onRestart, doneLabel, completionHandoff, regionCompletion, recordCompletion = true, surface }: { subregion?: SubregionId; scopeLabel?: string; onDone: () => void; onRestart: () => void; doneLabel?: string; completionHandoff?: LearningCompletionHandoff; regionCompletion?: LearningRegionCompletion; recordCompletion?: boolean; surface?: boolean }) {
  const label = scopeLabel ?? (subregion ? getSubregionDefinition(subregion).label : 'Learning scope')
  const durable = Boolean(subregion && recordCompletion)
  const regionLearned = durable && regionCompletion
  return (
    <LearningComplete
      eyebrow={regionLearned ? 'Region learned' : durable ? 'Capitals learned' : 'Learning complete'}
      title={regionLearned ? `${label} ✓` : durable ? `${label} capitals learned ✓` : `${label} complete ✓`}
      summary={regionLearned
        ? <>{surface && <p className="font-semibold text-zinc-100">{label} ✓</p>}<div className="space-y-1 text-sm"><p>Countries ✓</p><p>Capitals ✓</p><p>Mastery {regionCompletion.masteryStatus === 'mastered' ? 'Mastered' : 'Building'}</p></div><p className="mt-3">You&apos;ve learned the countries and capitals in {label}.</p><p className="mt-1">Review will bring them back later so they stick.</p></>
        : durable
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
