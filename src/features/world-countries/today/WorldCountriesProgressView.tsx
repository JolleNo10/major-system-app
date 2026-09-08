import { useMemo } from 'react'
import { useRails } from '@/app/layout/PageLayoutContext'
import type { Country } from '@/features/world-countries/data/countries'
import { getSubregionDefinition, type SubregionId } from '@/features/world-countries/data/subregions'
import { deriveWorldCountriesScopeProgressForCountries, type WorldCountriesScopeProgress } from '@/features/world-countries/learning/scopeProgress'
import type { RecallProgress } from '@/features/world-countries/learning/recallProgress'
import type { LearningStates } from '@/features/world-countries/learning/learningProgress'
import { getLearningReadinessBySubregion } from '@/features/world-countries/learning/learningReadiness'
import { GeographyBreadcrumbs } from '@/features/world-countries/ui/GeographyBreadcrumbs'
import { WorldCountriesPanel } from '@/features/world-countries/ui/WorldCountriesPanel'
import { WorldMasterySummary } from '@/features/world-countries/ui/WorldMasterySummary'

export function WorldCountriesProgressView({
  scopeLabel,
  scopeCountries,
  progress,
  recallProgress,
  learningStates,
  onBack,
}: {
  scopeLabel: string
  scopeCountries: readonly Country[]
  progress: WorldCountriesScopeProgress | null
  recallProgress: RecallProgress | null
  learningStates: LearningStates
  onBack: () => void
}) {
  const rows = useMemo(() => {
    if (!recallProgress) return []
    const subregions = [...new Set(scopeCountries.map(country => country.subregionId))]
    const readiness = getLearningReadinessBySubregion(learningStates)
    return subregions.map(subregionId => ({
      subregionId,
      progress: deriveWorldCountriesScopeProgressForCountries(
        `subregion:${subregionId}`,
        scopeCountries.filter(country => country.subregionId === subregionId),
        recallProgress,
      ),
      readiness: readiness.get(subregionId) ?? 'NOT_LEARNED',
    }))
  }, [learningStates, recallProgress, scopeCountries])
  const rails = useMemo(() => ({
    left: <WorldCountriesPanel className="space-y-4"><GeographyBreadcrumbs items={[{ label: 'World', current: scopeLabel === 'World' }, ...(scopeLabel === 'World' ? [] : [{ label: scopeLabel, current: true }])]} /><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Progress</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Your learning map</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Progress is derived from retained recall and existing Learning milestones.</p></div><button type="button" onClick={onBack} className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:border-cyan-500 hover:text-zinc-100">Back to {scopeLabel}</button></WorldCountriesPanel>,
    right: <WorldCountriesPanel className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Guided status</p><h2 className="mt-1 text-lg font-bold text-zinc-100">Keep the journey moving</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">The guided Continue action remains the source of review and Learning recommendations.</p></div><button type="button" onClick={onBack} className="w-full rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500">Back to guided home</button></WorldCountriesPanel>,
    leftLabel: 'Progress',
    rightLabel: 'Guided status',
  }), [onBack, scopeLabel])
  useRails(rails)

  return (
    <section className="space-y-4 animate-fade-in" aria-labelledby="world-countries-progress-heading">
      <div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">World Countries · Progress</p><h1 id="world-countries-progress-heading" className="text-2xl font-black text-zinc-100">{scopeLabel} progress</h1><p className="text-sm text-zinc-500">A concise view of current recall and Learning state.</p></div>
      <WorldMasterySummary progress={progress} scopeLabel={scopeLabel} />
      {progress === null ? <p role="status" className="text-sm text-zinc-400">Loading progress…</p> : rows.length === 0 ? <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">No active Countries are available in this scope.</p> : <div className="grid gap-3 sm:grid-cols-2">{rows.map(row => <ProgressRow key={row.subregionId} subregionId={row.subregionId} progress={row.progress} readiness={row.readiness} />)}</div>}
    </section>
  )
}

function ProgressRow({ subregionId, progress, readiness }: { subregionId: SubregionId; progress: WorldCountriesScopeProgress; readiness: string }) {
  const label = getSubregionDefinition(subregionId).label
  return <WorldCountriesPanel as="article" className="space-y-2"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-zinc-100">{label}</h2><span className="text-xs tabular-nums text-cyan-300">{Math.round(progress.completionRatio * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.round(progress.completionRatio * 100)}%` }} /></div><p className="text-xs text-zinc-500">{progress.completeCountries} / {progress.totalCountries} core complete · {readiness.replace(/_/g, ' ').toLowerCase()}</p></WorldCountriesPanel>
}
